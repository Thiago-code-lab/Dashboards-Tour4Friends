import asyncio
import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select, text

from app.models.entities import UserSession


async def test_create_confirm_cancel_keeps_bookings_and_history(lab):
    headers = await lab["login"]("manager")
    client = lab["client"]
    dataset = (await client.get("/api/v1/dataset", headers=headers)).json()
    departure = next(
        d for d in dataset["departures"] if d["date"] > dataset["metadata"]["referenceDate"]
    )
    used_leads = {b["leadId"] for b in dataset["bookings"]}
    lead = next(
        candidate
        for candidate in dataset["leads"]
        if candidate["id"] not in used_leads and candidate["routeId"] == departure["routeId"]
    )
    occupied = {
        c
        for b in dataset["bookings"]
        if b["departureId"] == departure["id"] and b["status"] != "cancelled"
        for c in b["travelerIds"]
    }
    customer = next(c for c in dataset["customers"] if c["id"] not in occupied)
    payload = {
        "id": f"TEST-{uuid4()}",
        "customerId": customer["id"],
        "travelerIds": [customer["id"]],
        "leadId": lead["id"],
        "departureId": departure["id"],
        "bookedAt": dataset["metadata"]["referenceDate"],
        "confirmedAt": None,
        "status": "pending",
        "category": lead["category"],
        "totalAmount": 8000,
        "formComplete": True,
        "cancellationReason": None,
    }
    create = await client.post("/api/v1/bookings", headers=headers, json=payload)
    assert create.status_code == 201, create.text
    identifier = payload["id"]
    for slot in dataset["allocations"]:
        if slot["departureId"] == departure["id"] and slot["category"] == lead["category"]:
            update = await client.patch(
                f"/api/v1/allocations/{slot['id']}",
                headers=headers,
                json={"expectedVersion": 1, "capacity": 50, "confirmed": True},
            )
            assert update.status_code == 200, update.text
    confirmed = await client.patch(
        f"/api/v1/bookings/{identifier}",
        headers=headers,
        json={"expectedVersion": 1, "status": "confirmed"},
    )
    assert confirmed.status_code == 200, confirmed.text
    cancelled = await client.patch(
        f"/api/v1/bookings/{identifier}",
        headers=headers,
        json={
            "expectedVersion": 2,
            "status": "cancelled",
            "cancellationReason": "Cancelamento sintético de teste",
        },
    )
    assert cancelled.status_code == 200 and cancelled.json()["confirmedAt"] is not None
    history = (await client.get(f"/api/v1/bookings/{identifier}/history", headers=headers)).json()
    assert len(history) == 3 and history[0]["after"]["status"] == "cancelled"


async def test_cancelling_future_paid_booking_retains_receipts(lab):
    headers = await lab["login"]("manager")
    client = lab["client"]
    original = (await client.get("/api/v1/dataset", headers=headers)).json()
    reference = original["metadata"]["referenceDate"]
    future = {d["id"] for d in original["departures"] if d["date"] > reference}
    candidate = next(
        b for b in original["bookings"] if b["status"] == "confirmed" and b["departureId"] in future
    )
    response = await client.patch(
        f"/api/v1/bookings/{candidate['id']}",
        headers=headers,
        json={
            "expectedVersion": 1,
            "status": "cancelled",
            "cancellationReason": "Mudança de planos simulada",
        },
    )
    assert response.status_code == 200, response.text
    after = (await client.get("/api/v1/dataset", headers=headers)).json()
    assert original["payments"] == after["payments"]
    from test_integration import frontend_results

    result = await asyncio.to_thread(frontend_results, after)
    assert result[0]["confirmedBookings"] == 142


async def test_expired_session_is_rejected(lab):
    headers = await lab["login"]("viewer")
    async with lab["db"]() as db, db.begin():
        session = await db.scalar(
            select(UserSession).where(UserSession.user_id == lab["identities"]["viewer"]["id"])
        )
        session.created_at = datetime.now(UTC) - timedelta(hours=3)
        session.expires_at = datetime.now(UTC) - timedelta(hours=2)
    assert (await lab["client"].get("/api/v1/dataset", headers=headers)).status_code == 401


async def test_migration_downgrade_upgrade_only_in_disposable_database(lab):
    from conftest import ROOT, TEST_URL

    environment = {**os.environ, "DATABASE_URL": TEST_URL}
    assert TEST_URL.rsplit("/", 1)[-1].endswith("_test")
    for command in (["downgrade", "-1"], ["upgrade", "head"]):
        await asyncio.to_thread(
            subprocess.run,
            [sys.executable, "-m", "alembic", *command],
            cwd=ROOT / "backend",
            env=environment,
            check=True,
            capture_output=True,
        )
    async with lab["db"]() as db:
        assert await db.scalar(text("SELECT count(*) FROM routes")) == 0
