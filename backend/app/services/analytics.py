from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import HTTPException

from app.schemas.domain import Dataset


def ratio(numerator: int | Decimal, denominator: int | Decimal) -> float | None:
    return float(Decimal(numerator) / Decimal(denominator) * 100) if denominator else None


def months_between(start: date, end: date) -> list[str]:
    result = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month) and len(result) < 240:
        result.append(f"{year:04}-{month:02}")
        month += 1
        if month == 13:
            year, month = year + 1, 1
    return result


def analyze_dataset(
    data: Dataset,
    start: date | None = None,
    end: date | None = None,
    route_id: str | None = None,
    modality: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    start = start or data.metadata.history_start
    end = end or date(data.metadata.reference_date.year, 12, 31)
    if start > end or (end - start).days > 3653:
        raise HTTPException(422, "Selecione um período válido de até 10 anos.")
    routes = {r.id: r for r in data.routes}
    deps = {d.id: d for d in data.departures}

    def matches(identifier: str) -> bool:
        return (not route_id or identifier == route_id) and (
            not modality or routes[identifier].modality == modality
        )

    departures = {d.id for d in data.departures if matches(d.route_id) and start <= d.date <= end}
    bookings = [
        b
        for b in data.bookings
        if b.departure_id in departures and (not category or b.category == category)
    ]
    confirmed = [b for b in bookings if b.status == "confirmed"]
    ids = {b.id for b in bookings}
    feedback = [f for f in data.feedback if f.booking_id in ids]
    leads = {
        lead.id
        for lead in data.leads
        if start <= lead.created_at <= end
        and matches(lead.route_id)
        and (not category or lead.category == category)
    }
    by_slot = defaultdict(int)
    selected_revenue = defaultdict(lambda: Decimal(0))
    all_revenue = defaultdict(lambda: Decimal(0))
    for b in data.bookings:
        if b.status == "confirmed":
            all_revenue[b.departure_id] += b.total_amount
    for b in confirmed:
        by_slot[(b.departure_id, b.category)] += len(b.traveler_ids)
        selected_revenue[b.departure_id] += b.total_amount
    allocations = []
    for slot in data.allocations:
        if slot.departure_id not in departures or (category and category != slot.category):
            continue
        committed = by_slot[(slot.departure_id, slot.category)]
        allocations.append(
            {
                **slot.model_dump(mode="json", by_alias=True),
                "committed": committed,
                "occupancy": ratio(committed, slot.capacity),
                "shortage": max(0, committed - slot.capacity),
                "available": max(0, slot.capacity - committed),
            }
        )
    costs: list[dict[str, Any]] = []
    for cost in data.costs:
        if cost.departure_id in departures:
            share = (
                Decimal(1)
                if not category
                else selected_revenue[cost.departure_id] / all_revenue[cost.departure_id]
                if all_revenue[cost.departure_id]
                else Decimal(0)
            )
            costs.append(
                {
                    "date": cost.date,
                    "amount": cost.amount * share,
                    "budget": cost.budget * share,
                    "departureId": cost.departure_id,
                    "category": cost.category,
                }
            )
    total_revenue = sum((b.total_amount for b in confirmed), Decimal(0))
    realized = sum(
        (
            b.total_amount
            for b in confirmed
            if deps[b.departure_id].end_date <= data.metadata.reference_date
        ),
        Decimal(0),
    )
    cost_total = sum((c["amount"] for c in costs), Decimal(0))
    nps_value = ratio(
        sum(f.nps >= 9 for f in feedback) - sum(f.nps <= 6 for f in feedback), len(feedback)
    )
    monthly = []
    for month in months_between(start, min(end, data.metadata.history_end)):
        rows = [b for b in bookings if deps[b.departure_id].date.isoformat().startswith(month)]
        active = [b for b in rows if b.status == "confirmed"]
        revenue = sum((b.total_amount for b in active), Decimal(0))
        scores = [f.nps for f in feedback if f.date.isoformat().startswith(month)]
        monthly.append(
            {
                "month": month,
                "travelers": sum(len(b.traveler_ids) for b in active),
                "reservations": len(rows),
                "revenue": float(revenue),
                "cost": float(
                    sum(
                        (c["amount"] for c in costs if c["date"].isoformat().startswith(month)),
                        Decimal(0),
                    )
                ),
                "ticket": float(revenue / len(active)) if active else None,
                "nps": ratio(
                    sum(v >= 9 for v in scores) - sum(v <= 6 for v in scores), len(scores)
                ),
            }
        )
    return {
        "confirmedBookings": len(confirmed),
        "bookings": len(bookings),
        "travelers": sum(len(b.traveler_ids) for b in confirmed),
        "servedTravelers": sum(
            len(b.traveler_ids)
            for b in confirmed
            if deps[b.departure_id].end_date <= data.metadata.reference_date
        ),
        "uniqueCustomers": len({identifier for b in confirmed for identifier in b.traveler_ids}),
        "totalRevenue": float(total_revenue),
        "realizedRevenue": float(realized),
        "contractedFuture": float(total_revenue - realized),
        "cost": float(cost_total),
        "ticket": float(total_revenue / len(confirmed)) if confirmed else None,
        "margin": ratio(total_revenue - cost_total, total_revenue),
        "nps": nps_value,
        "responses": len(feedback),
        "cancellationRate": ratio(sum(b.status == "cancelled" for b in bookings), len(bookings)),
        "conversion": ratio(
            len(
                {b.lead_id for b in data.bookings if b.status == "confirmed" and b.lead_id in leads}
            ),
            len(leads),
        ),
        "paid": float(sum((p.amount for p in data.payments if p.booking_id in ids), Decimal(0))),
        "occupancy": ratio(
            sum(a["committed"] for a in allocations), sum(a["capacity"] for a in allocations)
        ),
        "monthly": monthly,
        "allocations": allocations,
    }
