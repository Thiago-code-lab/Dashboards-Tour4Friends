"""Generate reproducible, entirely fictional small-agency data. Python 3.11+, stdlib only."""
from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Any

SEED = 42
RNG = random.Random(SEED)
REFERENCE = date(2026, 11, 7)
ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = ["Premium", "Conforto", "Alternativa"]


def catalog() -> list[dict[str, Any]]:
    specs = [
        ("portugues", "Caminho Português", "Português", "A pé", "Portugal · Espanha", 8, 118, ["Tui", "O Porriño", "Redondela", "Santiago de Compostela"]),
        ("santiago", "Caminho de Santiago a Pé", "Santiago a pé", "A pé", "Espanha", 9, 115, ["Sarria", "Portomarín", "Palas de Rei", "Santiago de Compostela"]),
        ("frances-bike", "Caminho Francês de Bicicleta", "Francês de bike", "Bicicleta", "Espanha", 12, 310, ["León", "Astorga", "Ponferrada", "Santiago de Compostela"]),
        ("portugues-bike", "Caminho Português de Bicicleta", "Português de bike", "Bicicleta", "Portugal · Espanha", 7, 240, ["Porto", "Ponte de Lima", "Tui", "Santiago de Compostela"]),
        ("assis", "Caminho de Assis", "Assis", "A pé", "Itália", 10, 100, ["Gubbio", "Valfabbrica", "Assis"]),
        ("espanha", "Roteiro Cultural pela Espanha", "Espanha cultural", "Cultural", "Espanha", 8, 0, ["Madri", "Toledo", "Córdoba", "Sevilha"]),
    ]
    return [dict(id=s[0], name=s[1], shortName=s[2], modality=s[3], country=s[4], days=s[5], distanceKm=s[6], stages=s[7]) for s in specs]


def departures(routes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seasonal = [0, 0, 1, 2, 2, 2, 1, 1, 2, 2, 1, 0]
    for year in range(2024, 2027):
        for month in range(1, 13):
            if year == 2026 and month > 10:
                continue
            count = seasonal[month - 1] + (1 if RNG.random() < .17 else 0)
            for group in range(count):
                route = RNG.choices(routes, weights=[32, 24, 12, 10, 13, 9])[0]
                start = date(year, month, 7 + group * 8)
                result.append(make_departure(route, start, len(result)))
    for i, start in enumerate([date(2026, 11, 10), date(2026, 11, 13), date(2026, 11, 25), date(2026, 12, 8), date(2027, 1, 15)]):
        result.append(make_departure(routes[i], start, len(result)))
    return result


def make_departure(route: dict[str, Any], start: date, index: int) -> dict[str, Any]:
    return dict(id=f"DEP-{index + 1:03}", routeId=route["id"], date=start.isoformat(),
                endDate=(start + timedelta(days=route["days"] - 1)).isoformat(), capacity=12,
                transferConfirmed=start < REFERENCE or index % 2 == 0,
                transferDue=(start - timedelta(days=7)).isoformat())


def make_bookings(deps: list[dict[str, Any]], customers: list[dict[str, str]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    bookings: list[dict[str, Any]] = []
    leads: list[dict[str, Any]] = []
    channels = ["Indicação", "Instagram", "Site", "Agência parceira"]
    for dep in deps:
        start = date.fromisoformat(dep["date"])
        future = start > REFERENCE
        for j in range(RNG.randint(2, 4) if not future else 4):
            index = len(bookings)
            booked = max(date(2024, 1, 1), min(REFERENCE - timedelta(days=1), start - timedelta(days=RNG.randint(21, 95))))
            status = RNG.choices(["confirmed", "cancelled", "pending"], weights=[79, 16, 5] if future else [87, 13, 0])[0]
            category = CATEGORIES[j % 3]
            travelers = RNG.sample(customers, RNG.choices([1, 2, 3], weights=[60, 35, 5])[0])
            occupied = {c for b in bookings if b["departureId"] == dep["id"] and b["status"] != "cancelled" for c in b["travelerIds"]}
            travelers = [c for c in travelers if c["id"] not in occupied] or [next(c for c in customers if c["id"] not in occupied)]
            unit = {"Premium": 10500, "Conforto": 7800, "Alternativa": 5900}[category] + RNG.randint(-5, 5) * 100
            total = unit * len(travelers)
            lead_id = f"LEAD-{index + 1:03}"
            leads.append(dict(id=lead_id, routeId=dep["routeId"], category=category, createdAt=max(date(2024, 1, 1), booked - timedelta(days=RNG.randint(2, 28))).isoformat(), channel=RNG.choice(channels), stage="won" if status == "confirmed" else "lost" if status == "cancelled" else "proposal", potentialValue=total))
            bookings.append(dict(id=f"T4F-{index + 1:04}", customerId=travelers[0]["id"], travelerIds=[c["id"] for c in travelers], leadId=lead_id,
                departureId=dep["id"], bookedAt=booked.isoformat(), confirmedAt=booked.isoformat() if status == "confirmed" else None,
                status=status, category=category, totalAmount=total, formComplete=not future or j % 3 != 0,
                cancellationReason=RNG.choice(["Mudança de planos", "Orçamento", "Agenda pessoal"]) if status == "cancelled" else None))
    for index in range(len(leads), 258):
        created = date(2024, 1, 1) + timedelta(days=RNG.randint(0, (REFERENCE - date(2024, 1, 1)).days))
        leads.append(dict(id=f"LEAD-{index + 1:03}", routeId=RNG.choice(deps)["routeId"], category=RNG.choice(CATEGORIES), createdAt=created.isoformat(), channel=RNG.choice(channels), stage=RNG.choice(["new", "qualified", "proposal", "lost"]), potentialValue=RNG.randint(60, 110) * 100))
    return bookings, leads


def make_allocations(deps: list[dict[str, Any]], routes: list[dict[str, Any]], bookings: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    partners = [dict(id=f"HOS-{i + 1:02}", name=f"Hospedagem demonstrativa {i + 1:02}", routeId=r["id"], locality=r["stages"][i % len(r["stages"])] ) for i, r in enumerate(routes * 2)]
    allocations: list[dict[str, Any]] = []
    for dep in deps:
        route = next(r for r in routes if r["id"] == dep["routeId"])
        for stage, locality in enumerate(route["stages"]):
            for category in CATEGORIES:
                committed = sum(len(b["travelerIds"]) for b in bookings if b["departureId"] == dep["id"] and b["category"] == category and b["status"] == "confirmed")
                future = dep["date"] > REFERENCE.isoformat()
                capacity = max(2, committed + RNG.choice([2, 3, 4] if future else [0, 1, 2, 3]))
                if future and stage == 1 and category == "Premium":
                    capacity = max(1, committed - 1)
                partner = [p for p in partners if p["routeId"] == dep["routeId"]][stage % 2]
                allocations.append(dict(id=f"ALC-{len(allocations) + 1:04}", departureId=dep["id"], partnerId=partner["id"], locality=locality,
                    date=(date.fromisoformat(dep["date"]) + timedelta(days=stage)).isoformat(), category=category, capacity=capacity,
                    confirmed=not future or not (stage == 0 and category == "Premium")))
    return partners, allocations


def make_costs(deps: list[dict[str, Any]], bookings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    costs: list[dict[str, Any]] = []
    for dep in deps:
        revenue = sum(b["totalAmount"] for b in bookings if b["departureId"] == dep["id"] and b["status"] == "confirmed")
        total = round(revenue * RNG.uniform(.59, .82))
        for kind, weight in [("Hospedagem", .57), ("Transporte", .24), ("Guias e apoio", .19)]:
            amount = round(total * weight)
            costs.append(dict(id=f"CST-{len(costs) + 1:03}", departureId=dep["id"], category=kind, date=dep["date"],
                              budget=round(amount * (.72 if dep["date"] == "2026-11-10" else 1.04)), amount=amount,
                              status="estimated" if dep["date"] > REFERENCE.isoformat() else "realized"))
    return costs


def make_feedback(bookings: list[dict[str, Any]], deps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    completed = [b for b in bookings if b["status"] == "confirmed" and next(d for d in deps if d["id"] == b["departureId"])["endDate"] < "2026-10-28"]
    feedback: list[dict[str, Any]] = []
    for b in RNG.sample(completed, min(72, len(completed))):
        dep = next(d for d in deps if d["id"] == b["departureId"])
        score = RNG.choices([5, 6, 7, 8, 9, 10], weights=[3, 6, 12, 17, 32, 30])[0]
        feedback.append(dict(id=f"FDB-{len(feedback) + 1:03}", bookingId=b["id"], date=(date.fromisoformat(dep["endDate"]) + timedelta(days=2)).isoformat(),
            nps=score, service=min(10, score + 1), accommodation=max(0, score - RNG.choice([0, 0, 1, 2])), logistics=max(0, score - RNG.choice([0, 0, 1])),
            comment="A comunicação sobre os horários poderia ser mais clara." if score < 8 else "Boa organização e acolhimento durante as etapas." if score < 10 else "Experiência muito positiva, do planejamento à chegada."))
    return feedback


def main() -> None:
    routes = catalog()
    customers = [dict(id=f"CLI-{i + 1:03}", label=f"Viajante demonstrativo {i + 1:03}") for i in range(116)]
    deps = departures(routes)
    bookings, leads = make_bookings(deps, customers)
    partners, allocations = make_allocations(deps, routes, bookings)
    payments = [dict(id=f"PAY-{i + 1:03}", bookingId=b["id"], date=b["bookedAt"], amount=b["totalAmount"] if next(d for d in deps if d["id"] == b["departureId"])["date"] < REFERENCE.isoformat() else round(b["totalAmount"] * .4)) for i, b in enumerate(b for b in bookings if b["status"] == "confirmed")]
    data = dict(metadata=dict(source_type="synthetic_demo", version="1.0.0", seed=SEED, generatedAt="2026-11-07T12:00:00Z", referenceDate=REFERENCE.isoformat(), historyStart="2024-01-01", historyEnd="2026-10-31", currency="BRL"),
                routes=routes, customers=customers, departures=deps, bookings=bookings, leads=leads,
                partners=partners, allocations=allocations, costs=make_costs(deps, bookings), payments=payments, feedback=make_feedback(bookings, deps))
    destination = ROOT / "public" / "data" / "demo.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({k: len(v) for k, v in data.items() if isinstance(v, list)}))


if __name__ == "__main__":
    main()
