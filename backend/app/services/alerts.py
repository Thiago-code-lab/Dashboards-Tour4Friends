from datetime import date
from typing import Any

from app.schemas.domain import Dataset
from app.services.analytics import analyze_dataset


def derive_alerts(
    data: Dataset,
    start: date | None = None,
    end: date | None = None,
    route_id: str | None = None,
    modality: str | None = None,
    category: str | None = None,
    attention: float = 75,
    critical: float = 85,
) -> list[dict[str, Any]]:
    view = analyze_dataset(data, start, end, route_id, modality, category)
    reference = data.metadata.reference_date
    start, end = start or data.metadata.history_start, end or date(reference.year, 12, 31)
    routes = {r.id: r for r in data.routes}
    deps = [
        d
        for d in data.departures
        if start <= d.date <= end
        and d.date >= reference
        and (not route_id or d.route_id == route_id)
        and (not modality or routes[d.route_id].modality == modality)
    ]
    alerts: list[dict[str, Any]] = []

    def add(
        identifier: str, kind: str, severity: str, dep: Any, day: date, cause: str, action: str
    ) -> None:
        alerts.append(
            {
                "id": identifier,
                "type": kind,
                "severity": severity,
                "routeId": dep.route_id,
                "departureId": dep.id,
                "date": day.isoformat(),
                "cause": cause,
                "action": action,
            }
        )

    for dep in deps:
        rows = [
            b
            for b in data.bookings
            if b.departure_id == dep.id
            and b.status == "confirmed"
            and (not category or b.category == category)
        ]
        missing = sum(not b.form_complete for b in rows)
        days = (dep.date - reference).days
        if days <= 7 and missing:
            add(
                f"forms-{dep.id}",
                "Ficha pré-viagem",
                "critical",
                dep,
                dep.date,
                f"{missing} reserva(s) com ficha incompleta a {days} dias da saída.",
                "Concluir a conferência das fichas antes da saída.",
            )
        if not dep.transfer_confirmed and dep.transfer_due <= reference:
            add(
                f"transfer-{dep.id}",
                "Transfer de bagagem",
                "critical",
                dep,
                dep.transfer_due,
                "Transfer sem confirmação após o prazo operacional.",
                "Confirmar o prestador e o horário de coleta.",
            )
        costs = [c for c in data.costs if c.departure_id == dep.id]
        budget, actual = sum(c.budget for c in costs), sum(c.amount for c in costs)
        has_cost_share = not category or sum(b.total_amount for b in rows) > 0
        if has_cost_share and budget and (actual / budget - 1) * 100 > 20:
            add(
                f"cost-{dep.id}",
                "Desvio de custo",
                "attention",
                dep,
                dep.date,
                f"Custo estimado {(actual / budget - 1) * 100:.1f}% acima do orçamento.",
                "Revisar cotações e a margem da saída.",
            )
        travelers = sum(len(b.traveler_ids) for b in rows)
        if travelers > dep.capacity:
            add(
                f"departure-{dep.id}",
                "Capacidade da saída",
                "critical",
                dep,
                dep.date,
                f"{travelers} viajantes para {dep.capacity} vagas na saída.",
                "Revisar a capacidade do grupo e contratar vagas.",
            )
    dep_map = {d.id: d for d in data.departures}
    for slot in view["allocations"]:
        if slot["date"] < reference.isoformat() or not slot["committed"]:
            continue
        dep = dep_map[slot["departureId"]]
        day = date.fromisoformat(slot["date"])
        if not slot["confirmed"]:
            add(
                f"unconfirmed-{slot['id']}",
                "Hospedagem sem confirmação",
                "attention",
                dep,
                day,
                f"{slot['locality']} · {slot['category']}: {slot['committed']} vagas comprometidas sem confirmação.",
                "Confirmar a contratação com a hospedagem demonstrativa.",
            )
        if slot["occupancy"] >= attention:
            add(
                f"occupancy-{slot['id']}",
                "Ocupação de hospedagem",
                "critical" if slot["occupancy"] > critical else "attention",
                dep,
                day,
                f"{slot['locality']} · {slot['category']}: {slot['committed']}/{slot['capacity']} vagas ({slot['occupancy']:.0f}%).",
                f"Contratar pelo menos {slot['shortage']} vaga(s) para esta data/etapa."
                if slot["shortage"]
                else "Negociar uma alternativa antes de aceitar novas reservas.",
            )
    return sorted(alerts, key=lambda a: (a["severity"] != "critical", a["date"]))
