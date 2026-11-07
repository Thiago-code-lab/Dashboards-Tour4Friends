from collections import defaultdict
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import entities as m
from app.schemas import domain as s

COLLECTIONS: dict[str, tuple[type[m.Base], type[s.Contract]]] = {
    "routes": (m.Route, s.RouteData),
    "customers": (m.Customer, s.CustomerData),
    "leads": (m.Lead, s.LeadData),
    "departures": (m.Departure, s.DepartureData),
    "bookings": (m.Booking, s.BookingData),
    "partners": (m.Partner, s.PartnerData),
    "allocations": (m.Allocation, s.AllocationData),
    "costs": (m.Cost, s.CostData),
    "payments": (m.Payment, s.PaymentData),
    "feedback": (m.Feedback, s.FeedbackData),
}


def entity_values(record: s.Contract) -> dict[str, Any]:
    return record.model_dump(exclude={"traveler_ids"})


async def snapshot(session: AsyncSession, validate: bool = False) -> s.Dataset:
    metadata = await session.get(m.DatasetMetadata, 1)
    if metadata is None:
        raise HTTPException(503, "Base ainda não inicializada. Execute o seed demonstrativo.")
    travelers = defaultdict(list)
    for row in await session.scalars(
        select(m.BookingTraveler).order_by(m.BookingTraveler.booking_id, m.BookingTraveler.position)
    ):
        travelers[row.booking_id].append(row.customer_id)
    payload: dict[str, Any] = {"metadata": s.Metadata.model_validate(metadata.payload)}
    for name, (model, schema) in COLLECTIONS.items():
        rows = await session.scalars(select(model).order_by(model.sort_order, model.id))
        values = []
        for row in rows:
            fields = {
                field: getattr(row, field)
                for field in schema.model_fields
                if field != "traveler_ids"
            }
            if name == "bookings":
                fields["traveler_ids"] = travelers[row.id]
            values.append(schema.model_validate(fields))
        payload[name] = values
    # Values are already individually typed; services validate relations after mutations.
    return s.Dataset.model_validate(payload) if validate else s.Dataset.model_construct(**payload)


async def counts(session: AsyncSession) -> dict[str, int]:
    return {
        name: await session.scalar(select(func.count()).select_from(model))
        for name, (model, _) in COLLECTIONS.items()
    }


async def resource(
    session: AsyncSession, name: str, identifier: str
) -> tuple[m.Base, dict[str, Any]]:
    model, schema = COLLECTIONS[name]
    row = await session.get(model, identifier)
    if row is None:
        raise HTTPException(404, "Registro não encontrado.")
    fields = {
        field: getattr(row, field) for field in schema.model_fields if field != "traveler_ids"
    }
    if name == "bookings":
        fields["traveler_ids"] = list(
            await session.scalars(
                select(m.BookingTraveler.customer_id)
                .where(m.BookingTraveler.booking_id == identifier)
                .order_by(m.BookingTraveler.position)
            )
        )
    return row, {
        **schema.model_validate(fields).model_dump(mode="json", by_alias=True),
        "version": row.version,
    }
