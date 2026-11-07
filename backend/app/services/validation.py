from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.domain import Dataset


def validate_relations(data: "Dataset") -> None:
    def require(condition: bool, message: str) -> None:
        if not condition:
            raise ValueError(message)

    for name in type(data).model_fields:
        records = getattr(data, name)
        if isinstance(records, list):
            require(
                len({r.id for r in records}) == len(records), f"{name}: identificador duplicado."
            )
    routes = {r.id: r for r in data.routes}
    departures = {r.id: r for r in data.departures}
    leads = {r.id: r for r in data.leads}
    customers = {r.id for r in data.customers}
    bookings = {r.id: r for r in data.bookings}
    partners = {r.id: r for r in data.partners}
    for dep in data.departures:
        require(dep.route_id in routes, f"{dep.id}: roteiro inexistente.")
    for lead in data.leads:
        require(
            lead.route_id in routes and lead.created_at <= data.metadata.reference_date,
            f"{lead.id}: roteiro/data inválidos.",
        )
    traveler_keys: set[tuple[str, str]] = set()
    linked: set[str] = set()
    for booking in data.bookings:
        dep, lead = departures.get(booking.departure_id), leads.get(booking.lead_id)
        require(dep is not None and lead is not None, f"{booking.id}: saída/lead inexistentes.")
        require(
            lead.route_id == dep.route_id and lead.category == booking.category,
            f"{booking.id}: lead/roteiro/categoria incompatíveis.",
        )
        require(
            lead.created_at <= booking.booked_at <= min(dep.date, data.metadata.reference_date),
            f"{booking.id}: data de contratação inválida.",
        )
        require(
            booking.confirmed_at is None or booking.confirmed_at <= data.metadata.reference_date,
            f"{booking.id}: confirmação futura ao cenário.",
        )
        require(
            booking.lead_id not in linked
            and (lead.stage == "won") == (booking.status == "confirmed"),
            f"{booking.id}: conversão/vínculo inconsistente.",
        )
        linked.add(booking.lead_id)
        for customer_id in booking.traveler_ids:
            require(customer_id in customers, f"{booking.id}: cliente inexistente.")
            key = (booking.departure_id, customer_id)
            if booking.status != "cancelled":
                require(key not in traveler_keys, f"{booking.id}: viajante duplicado na saída.")
                traveler_keys.add(key)
    for partner in data.partners:
        require(partner.route_id in routes, f"{partner.id}: roteiro inexistente.")
    for row in data.allocations:
        dep, partner = departures.get(row.departure_id), partners.get(row.partner_id)
        require(
            dep is not None and partner is not None and partner.route_id == dep.route_id,
            f"{row.id}: hospedagem/saída incompatíveis.",
        )
        require(
            dep.date <= row.date <= dep.end_date and row.locality in routes[dep.route_id].stages,
            f"{row.id}: data/etapa inválidas.",
        )
    for cost in data.costs:
        dep = departures.get(cost.departure_id)
        require(dep is not None and cost.date == dep.date, f"{cost.id}: custo fora da saída.")
        require(
            (cost.status == "realized") == (dep.date <= data.metadata.reference_date),
            f"{cost.id}: status financeiro incompatível com a data.",
        )
    totals: dict[str, Decimal] = {}
    for payment in data.payments:
        booking = bookings.get(payment.booking_id)
        require(
            booking is not None
            and booking.confirmed_at is not None
            and booking.status in ("confirmed", "cancelled"),
            f"{payment.id}: pagamento sem contratação confirmada.",
        )
        require(
            booking.booked_at <= payment.date <= data.metadata.reference_date,
            f"{payment.id}: data inválida.",
        )
        totals[payment.booking_id] = totals.get(payment.booking_id, Decimal(0)) + payment.amount
    for booking_id, total in totals.items():
        require(
            total <= bookings[booking_id].total_amount,
            f"{booking_id}: pagamentos excedem o valor contratado.",
        )
    for feedback in data.feedback:
        booking = bookings.get(feedback.booking_id)
        require(
            booking is not None and booking.status == "confirmed",
            f"{feedback.id}: reserva de avaliação inválida.",
        )
        require(
            departures[booking.departure_id].end_date
            <= feedback.date
            <= data.metadata.reference_date,
            f"{feedback.id}: avaliação anterior ao fim da viagem.",
        )
