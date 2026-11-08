import asyncio
import hashlib
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import write_lock
from app.models.entities import BookingTraveler, DatasetMetadata
from app.repositories.datasets import COLLECTIONS, counts, entity_values, snapshot
from app.schemas.domain import Dataset


async def seed_demo(session: AsyncSession, path: Path) -> dict[str, object]:
    dataset = Dataset.model_validate_json(await asyncio.to_thread(path.read_text, encoding="utf-8"))
    fingerprint = hashlib.sha256(
        json.dumps(dataset.model_dump(mode="json", by_alias=True), sort_keys=True).encode()
    ).hexdigest()
    await write_lock(session)
    existing = await session.get(DatasetMetadata, 1)
    if existing:
        if existing.seed_digest != fingerprint:
            raise ValueError(
                "A base existente foi inicializada por outro snapshot; nenhum registro foi sobrescrito."
            )
        return {"alreadySeeded": True, "counts": await counts(session)}
    if any((await counts(session)).values()):
        raise ValueError("Banco contém registros sem metadados de seed; carga recusada.")
    session.add(
        DatasetMetadata(
            id=1,
            payload=dataset.metadata.model_dump(mode="json", by_alias=True),
            seed_digest=fingerprint,
        )
    )
    for name, (model, _) in COLLECTIONS.items():
        for position, record in enumerate(getattr(dataset, name)):
            session.add(model(**entity_values(record), sort_order=position))
        # Flush each entity collection in FK order, never one query per record.
        await session.flush()
        if name == "bookings":
            for booking in dataset.bookings:
                session.add_all(
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
            await session.flush()
    rebuilt = await snapshot(session, validate=True)
    if rebuilt.model_dump(mode="json", by_alias=True) != dataset.model_dump(
        mode="json", by_alias=True
    ):
        raise ValueError("Snapshot reconstruído difere do JSON original; transação cancelada.")
    return {"alreadySeeded": False, "equivalentSnapshot": True, "counts": await counts(session)}
