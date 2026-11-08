import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import digest
from app.models.entities import Booking, Payment, User, UserSession
from app.repositories.datasets import counts, snapshot
from app.services.seed import seed_demo


async def test_seed_exact_snapshot_and_idempotence(lab):
    source = json.loads(
        (Path(__file__).resolve().parents[2] / "public/data/demo.json").read_text(encoding="utf8")
    )
    async with lab["db"]() as db, db.begin():
        rebuilt = await snapshot(db, validate=True)
        assert rebuilt.model_dump(mode="json", by_alias=True) == source
        original = await counts(db)
        assert (await seed_demo(db, Path(__file__).resolve().parents[2] / "public/data/demo.json"))[
            "alreadySeeded"
        ]
        assert await counts(db) == original


async def test_authentication_revocation_and_token_hash(lab):
    client = lab["client"]
    assert (await client.get("/api/v1/dataset")).status_code == 401
    headers = await lab["login"]()
    assert (await client.get("/api/v1/auth/me", headers=headers)).json()["role"] == "admin"
    async with lab["db"]() as db:
        token = headers["Authorization"].split()[1]
        stored = await db.scalar(select(UserSession).where(UserSession.token_hash == digest(token)))
        assert stored and stored.token_hash != token
        assert (await db.get(User, lab["identities"]["admin"]["id"])).password_hash.startswith(
            "$argon2id$"
        )
    assert (await client.post("/api/v1/auth/logout", headers=headers)).status_code == 204
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401


@pytest.mark.parametrize("role", ["viewer", "analyst"])
async def test_read_only_roles_cannot_write(lab, role):
    headers = await lab["login"](role)
    assert (await lab["client"].get("/api/v1/dataset", headers=headers)).status_code == 200
    assert (
        await lab["client"].patch(
            "/api/v1/bookings/T4F-0001",
            headers=headers,
            json={"expectedVersion": 1, "formComplete": False},
        )
    ).status_code == 403
    assert (await lab["client"].get("/api/v1/admin/audit", headers=headers)).status_code == 403


async def test_real_write_new_session_and_audit(lab):
    client = lab["client"]
    first = await lab["login"]("manager")
    response = await client.patch(
        "/api/v1/bookings/T4F-0001",
        headers=first,
        json={"expectedVersion": 1, "totalAmount": 25000},
    )
    assert response.status_code == 200, response.text
    assert response.json()["version"] == 2
    async with lab["db"]() as db:
        assert (await db.get(Booking, "T4F-0001")).total_amount == Decimal("25000")
    assert (await client.post("/api/v1/auth/logout", headers=first)).status_code == 204
    second = await lab["login"]("manager")
    assert (await client.get("/api/v1/bookings/T4F-0001", headers=second)).json()[
        "totalAmount"
    ] == 25000
    history = await client.get("/api/v1/bookings/T4F-0001/history", headers=second)
    assert history.status_code == 200 and history.json()[0]["after"]["totalAmount"] == 25000
    admin = await lab["login"]()
    audit = (
        await client.get(
            "/api/v1/admin/audit?entity_type=bookings&entity_id=T4F-0001", headers=admin
        )
    ).json()
    assert audit["total"] == 1


async def test_versions_prevent_stale_updates(lab):
    headers = await lab["login"]("manager")
    path = "/api/v1/allocations/ALC-0001"
    first = await lab["client"].patch(
        path, headers=headers, json={"expectedVersion": 1, "capacity": 10}
    )
    assert first.status_code == 200, first.text
    assert (
        await lab["client"].patch(
            path, headers=headers, json={"expectedVersion": 1, "capacity": 20}
        )
    ).status_code == 409


async def test_validation_missing_resources_and_sql_injection(lab):
    headers = await lab["login"]()
    client = lab["client"]
    assert (await client.get("/api/v1/bookings/NOT-EXISTS", headers=headers)).status_code == 404
    assert (
        await client.patch(
            "/api/v1/costs/CST-001", headers=headers, json={"expectedVersion": 1, "amount": -1}
        )
    ).status_code == 422
    assert (await client.get("/api/v1/bookings?page=0", headers=headers)).status_code == 422
    assert (
        await client.get("/api/v1/bookings?sort=DROP_TABLE", headers=headers)
    ).status_code == 422
    response = await client.get("/api/v1/bookings", headers=headers, params={"q": "' OR 1=1 --"})
    assert response.status_code == 200 and response.json()["total"] == 0


async def test_listing_is_paginated_filtered_and_sorted(lab):
    headers = await lab["login"]()
    response = await lab["client"].get(
        "/api/v1/bookings",
        headers=headers,
        params={
            "page_size": 3,
            "sort": "total_amount",
            "direction": "desc",
            "route_id": "portugues",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert len(payload["items"]) == 3 and payload["total"] > 3
    amounts = [r["totalAmount"] for r in payload["items"]]
    assert amounts == sorted(amounts, reverse=True)


async def test_database_constraints_and_rollback(lab):
    with pytest.raises(IntegrityError):
        async with lab["db"]() as db, db.begin():
            db.add(
                Payment(
                    id="INVALID",
                    booking_id="missing",
                    date=datetime.now(UTC).date(),
                    amount=Decimal(-1),
                )
            )
            await db.flush()
    async with lab["db"]() as db:
        assert await db.get(Payment, "INVALID") is None
        assert (await counts(db))["bookings"] == 164


async def test_login_limit_does_not_reveal_email(lab):
    for _ in range(5):
        response = await lab["client"].post(
            "/api/v1/auth/login",
            json={"email": f"unknown-{uuid4()}@example.com", "password": "wrong"},
        )
        assert response.status_code == 401 and response.json()["detail"] == "Credenciais inválidas."
    assert (
        await lab["client"].post(
            "/api/v1/auth/login",
            json={"email": lab["identities"]["admin"]["email"], "password": lab["password"]},
        )
    ).status_code == 429


async def test_session_expiration_and_disable_user(lab):
    admin = await lab["login"]()
    viewer = await lab["login"]("viewer")
    identifier = lab["identities"]["viewer"]["id"]
    response = await lab["client"].patch(
        f"/api/v1/admin/users/{identifier}",
        headers=admin,
        json={"expectedVersion": 1, "active": False},
    )
    assert response.status_code == 200
    assert (await lab["client"].get("/api/v1/dataset", headers=viewer)).status_code == 401
    assert (
        await lab["client"].patch(
            f"/api/v1/admin/users/{lab['identities']['admin']['id']}",
            headers=admin,
            json={"expectedVersion": 1, "active": False},
        )
    ).status_code == 409


async def test_health_ready_cors_and_internal_error(lab, monkeypatch):
    from app.api import datasets

    async def broken_snapshot(db):
        raise RuntimeError("private SQL and credentials must never appear")

    assert (await lab["client"].get("/health")).status_code == 200
    assert (await lab["client"].get("/ready")).status_code == 200
    cors = await lab["client"].options(
        "/api/v1/dataset",
        headers={"Origin": "https://attacker.invalid", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in cors.headers
    headers = await lab["login"]()
    monkeypatch.setattr(datasets, "snapshot", broken_snapshot)
    response = await lab["client"].get("/api/v1/dataset", headers=headers)
    assert (
        response.status_code == 500
        and "private SQL" not in response.text
        and "requestId" in response.json()
    )


async def test_body_limit_and_database_readiness_failure(lab):
    import httpx
    from pydantic import SecretStr
    from sqlalchemy.engine import make_url

    from app.main import create_app

    response = await lab["client"].post("/api/v1/auth/login", content=b"x" * 1_100_001)
    assert response.status_code == 413
    bad_url = make_url(lab["settings"].database_url.get_secret_value()).set(port=65432)
    settings = lab["settings"].model_copy(
        update={"database_url": SecretStr(bad_url.render_as_string(hide_password=False))}
    )
    app = create_app(settings)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://test",
        ) as client:
            assert (await client.get("/health")).status_code == 200
            ready = await client.get("/ready")
            assert ready.status_code == 503 and ready.json() == {"status": "not_ready"}
    finally:
        await app.state.sessions.kw["bind"].dispose()
