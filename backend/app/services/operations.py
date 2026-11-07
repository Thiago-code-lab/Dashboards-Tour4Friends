from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import write_lock
from app.models.entities import BookingTraveler, DatasetMetadata, Lead
from app.repositories.datasets import COLLECTIONS, entity_values, resource, snapshot
from app.schemas.domain import BookingData, Contract, Dataset
from app.services.audit import record_audit


def validate_change(data: Dataset, collection: str, candidate: Contract) -> Dataset:
    raw = data.model_dump()
    records = raw[collection]
    raw[collection] = [candidate.model_dump() if r["id"] == candidate.id else r for r in records]
    if not any(r["id"] == candidate.id for r in records):
        raw[collection].append(candidate.model_dump())
    if collection == "bookings":
        for lead in raw["leads"]:
            if lead["id"] == candidate.lead_id:
                lead.update(
                    category=candidate.category,
                    stage="won"
                    if candidate.status == "confirmed"
                    else "lost"
                    if candidate.status == "cancelled"
                    else "proposal",
                )
    try:
        return Dataset.model_validate(raw)
    except ValidationError as error:
        raise HTTPException(
            422,
            [
                {"message": e["msg"], "path": list(e["loc"])}
                for e in error.errors(include_input=False)
            ],
        ) from error


def confirmation_gate(
    dataset: Dataset, candidate: BookingData, previous: dict[str, Any] | None
) -> None:
    if previous and previous["status"] == "confirmed" and candidate.status == "cancelled":
        dep = next(d for d in dataset.departures if d.id == candidate.departure_id)
        if dep.date <= dataset.metadata.reference_date:
            raise HTTPException(
                409, "Viagem já iniciada: cancelamento exige revisão financeira fora deste fluxo."
            )
    increases = (
        previous is None
        or previous["status"] != "confirmed"
        or previous["category"] != candidate.category
        or len(previous["travelerIds"]) < len(candidate.traveler_ids)
    )
    if candidate.status != "confirmed" or not increases:
        return
    dep = next(d for d in dataset.departures if d.id == candidate.departure_id)
    confirmed = [
        b for b in dataset.bookings if b.departure_id == dep.id and b.status == "confirmed"
    ]
    if sum(len(b.traveler_ids) for b in confirmed) > dep.capacity:
        raise HTTPException(
            409, "Confirmação excede a capacidade da saída. Revise a capacidade antes de confirmar."
        )
    travelers = sum(len(b.traveler_ids) for b in confirmed if b.category == candidate.category)
    slots = [
        a
        for a in dataset.allocations
        if a.departure_id == dep.id and a.category == candidate.category
    ]
    stages = next(r for r in dataset.routes if r.id == dep.route_id).stages
    if not set(stages).issubset({a.locality for a in slots}) or any(
        a.capacity < travelers for a in slots
    ):
        raise HTTPException(
            409, "Vagas de hospedagem insuficientes para confirmar. Revise os slots da saída."
        )
    if 0 <= (dep.date - dataset.metadata.reference_date).days <= 7 and not candidate.form_complete:
        raise HTTPException(
            409, "Conclua a ficha pré-viagem antes de confirmar a até 7 dias da saída."
        )


async def save_resource(
    db: AsyncSession,
    collection: str,
    body: Contract,
    actor: str,
    request_id: str,
    identifier: str | None = None,
) -> dict[str, Any]:
    await write_lock(db)
    model, schema = COLLECTIONS[collection]
    before = None
    if identifier is not None:
        row, before = await resource(db, collection, identifier)
        if row.version != body.expected_version:
            raise HTTPException(
                409, "O registro foi alterado por outra sessão. Recarregue antes de salvar."
            )
        patch = body.model_dump(exclude_unset=True, exclude={"expected_version"})
        base = schema.model_validate(
            {k: v for k, v in before.items() if k != "version"}
        ).model_dump()
        if (
            collection == "bookings"
            and patch.get("status") == "confirmed"
            and before["status"] != "confirmed"
        ):
            base["confirmed_at"] = (await db.get(DatasetMetadata, 1)).payload["referenceDate"]
        if collection == "bookings" and patch.get("status") == "pending":
            base["confirmed_at"] = None
        try:
            candidate = schema.model_validate({**base, **patch})
        except ValidationError as error:
            raise HTTPException(
                422, "A alteração contém campos incompatíveis com o registro."
            ) from error
    else:
        candidate = body
        if await db.get(model, candidate.id):
            raise HTTPException(409, "Já existe um registro com este identificador.")
        position = (await db.scalar(select(func.max(model.sort_order)))) or 0
        row = model(**entity_values(candidate), sort_order=position + 1)
    dataset = validate_change(await snapshot(db), collection, candidate)
    if collection == "bookings":
        confirmation_gate(dataset, candidate, before)
    if identifier is None:
        db.add(row)
    else:
        for field, value in entity_values(candidate).items():
            setattr(row, field, value)
        row.version += 1
    await db.flush()
    if collection == "bookings":
        await synchronize_booking(db, candidate, actor, request_id)
    await db.flush()
    _, after = await resource(db, collection, candidate.id)
    record_audit(
        db,
        actor,
        collection,
        candidate.id,
        "create" if before is None else "update",
        request_id,
        before,
        after,
    )
    return after


async def synchronize_booking(
    db: AsyncSession, booking: BookingData, actor: str, request_id: str
) -> None:
    await db.execute(delete(BookingTraveler).where(BookingTraveler.booking_id == booking.id))
    db.add_all(
        [
            BookingTraveler(
                booking_id=booking.id,
                customer_id=customer_id,
                departure_id=booking.departure_id,
                status=booking.status,
                position=i,
            )
            for i, customer_id in enumerate(booking.traveler_ids)
        ]
    )
    lead = await db.get(Lead, booking.lead_id)
    before = {"category": lead.category, "stage": lead.stage}
    lead.category = booking.category
    lead.stage = (
        "won"
        if booking.status == "confirmed"
        else "lost"
        if booking.status == "cancelled"
        else "proposal"
    )
    if before != {"category": lead.category, "stage": lead.stage}:
        lead.version += 1
        record_audit(
            db,
            actor,
            "leads",
            lead.id,
            "synchronize_booking",
            request_id,
            before,
            {"category": lead.category, "stage": lead.stage},
        )
