import csv
import hashlib
import io
import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import write_lock
from app.core.security import digest, new_token
from app.models.entities import Booking, BookingTraveler, ImportBatch, Lead
from app.repositories.datasets import snapshot
from app.schemas.domain import BookingData
from app.services.audit import record_audit
from app.services.operations import confirmation_gate, validate_change


def parse_csv(content: bytes) -> list[BookingData]:
    if len(content) > 1_048_576:
        raise HTTPException(413, "CSV deve ter no máximo 1 MB.")
    try:
        text = content.decode("utf-8-sig")
        delimiter = ";" if ";" in text.partition("\n")[0] else ","
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        fields = {field.alias or name for name, field in BookingData.model_fields.items()}
        if (
            reader.fieldnames is None
            or set(reader.fieldnames) != fields
            or len(reader.fieldnames) != len(fields)
        ):
            raise ValueError("Colunas incompatíveis com o modelo técnico de reservas.")
        rows = []
        identifiers = set()
        for index, raw in enumerate(reader, 2):
            if len(rows) >= 500:
                raise ValueError("Máximo de 500 linhas por lote.")
            if raw["formComplete"] not in ("true", "false") or None in raw:
                raise ValueError(f"Linha {index}: booleano ou número de colunas inválido.")
            raw.update(
                travelerIds=raw["travelerIds"].split("|"),
                confirmedAt=raw["confirmedAt"] or None,
                cancellationReason=raw["cancellationReason"] or None,
            )
            booking = BookingData.model_validate(raw)
            if booking.id in identifiers:
                raise ValueError(f"Linha {index}: identificador duplicado.")
            identifiers.add(booking.id)
            rows.append(booking)
        if not rows:
            raise ValueError("Arquivo sem reservas.")
        return rows
    except (UnicodeDecodeError, csv.Error, ValueError, ValidationError) as error:
        message = "CSV com campos inválidos." if isinstance(error, ValidationError) else str(error)
        raise HTTPException(422, message) from error


async def validate_import(db: AsyncSession, content: bytes, actor: str) -> dict:
    rows = parse_csv(content)
    await write_lock(db)
    data = await snapshot(db)
    for booking in rows:
        previous = next((b for b in data.bookings if b.id == booking.id), None)
        data = validate_change(data, "bookings", booking)
        confirmation_gate(
            data, booking, previous.model_dump(mode="json", by_alias=True) if previous else None
        )
    records = [b.model_dump(mode="json", by_alias=True) for b in rows]
    fingerprint = hashlib.sha256(
        json.dumps(sorted(records, key=lambda r: r["id"]), sort_keys=True).encode()
    ).hexdigest()
    if await db.scalar(
        select(ImportBatch.id).where(
            ImportBatch.content_hash == fingerprint, ImportBatch.status == "committed"
        )
    ):
        raise HTTPException(409, "Este lote já foi aplicado. Nenhuma reserva foi alterada.")
    versions = dict((await db.execute(select(Booking.id, Booking.version))).all())
    payload = [
        {"booking": record, "expectedVersion": versions.get(record["id"], 0)} for record in records
    ]
    token, token_hash = new_token()
    batch = ImportBatch(
        id=str(uuid4()),
        actor_user_id=actor,
        content_hash=fingerprint,
        token_hash=token_hash,
        payload=payload,
        row_count=len(rows),
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    db.add(batch)
    return {
        "batchId": batch.id,
        "validationToken": token,
        "rows": len(rows),
        "expiresAt": batch.expires_at,
        "status": "validated",
    }


async def commit_import(
    db: AsyncSession, batch_id: str, token: str, actor: str, request_id: str
) -> dict:
    await write_lock(db)
    batch = await db.scalar(select(ImportBatch).where(ImportBatch.id == batch_id).with_for_update())
    if batch is None or batch.actor_user_id != actor or batch.token_hash != digest(token):
        raise HTTPException(404, "Lote de validação não encontrado.")
    if batch.status != "validated":
        raise HTTPException(409, "Este lote já foi aplicado.")
    if batch.expires_at <= datetime.now(UTC):
        raise HTTPException(409, "Validação expirada. Valide novamente o arquivo.")
    current = await snapshot(db)
    old_bookings = {b.id: b for b in current.bookings}
    models = {b.id: b for b in await db.scalars(select(Booking))}
    leads = {lead.id: lead for lead in await db.scalars(select(Lead))}
    candidates = []
    for raw in batch.payload:
        candidate = BookingData.model_validate(raw["booking"])
        existing = models.get(candidate.id)
        if (existing.version if existing else 0) != raw["expectedVersion"]:
            raise HTTPException(
                409, "Uma reserva mudou após a validação. Valide o arquivo novamente."
            )
        old = old_bookings.get(candidate.id)
        if old and any(
            getattr(old, field) != getattr(candidate, field)
            for field in ("customer_id", "lead_id", "departure_id", "booked_at")
        ):
            raise HTTPException(
                422, "Importação não pode reatribuir vínculos/datas de reservas existentes."
            )
        current = validate_change(current, "bookings", candidate)
        confirmation_gate(
            current, candidate, old.model_dump(mode="json", by_alias=True) if old else None
        )
        candidates.append(candidate)
    affected = [b.id for b in candidates]
    await db.execute(delete(BookingTraveler).where(BookingTraveler.booking_id.in_(affected)))
    position = max((b.sort_order for b in models.values()), default=0)
    for candidate in candidates:
        row = models.get(candidate.id)
        old = old_bookings.get(candidate.id)
        if row is None:
            position += 1
            row = Booking(
                **candidate.model_dump(exclude={"traveler_ids"}), sort_order=position, version=1
            )
            db.add(row)
        else:
            for field, value in candidate.model_dump(exclude={"traveler_ids"}).items():
                setattr(row, field, value)
            row.version += 1
        lead = leads[candidate.lead_id]
        before_lead = {"category": lead.category, "stage": lead.stage}
        lead.category = candidate.category
        lead.stage = (
            "won"
            if candidate.status == "confirmed"
            else "lost"
            if candidate.status == "cancelled"
            else "proposal"
        )
        after_lead = {"category": lead.category, "stage": lead.stage}
        if before_lead != after_lead:
            lead.version += 1
            record_audit(
                db,
                actor,
                "leads",
                lead.id,
                "synchronize_booking",
                request_id,
                before_lead,
                after_lead,
            )
        record_audit(
            db,
            actor,
            "bookings",
            candidate.id,
            "import",
            request_id,
            old.model_dump(mode="json", by_alias=True) if old else None,
            {**candidate.model_dump(mode="json", by_alias=True), "version": row.version},
        )
    await db.flush()
    db.add_all(
        [
            BookingTraveler(
                booking_id=b.id,
                customer_id=customer_id,
                departure_id=b.departure_id,
                status=b.status,
                position=i,
            )
            for b in candidates
            for i, customer_id in enumerate(b.traveler_ids)
        ]
    )
    batch.status, batch.committed_at = "committed", datetime.now(UTC)
    record_audit(
        db,
        actor,
        "import_batches",
        batch.id,
        "commit",
        request_id,
        after={"rows": batch.row_count, "contentHash": batch.content_hash},
    )
    return {"batchId": batch.id, "status": "committed", "rows": batch.row_count}
