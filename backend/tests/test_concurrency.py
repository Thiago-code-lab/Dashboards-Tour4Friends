import asyncio
from uuid import uuid4

from sqlalchemy import func, select

from app.core.database import write_lock
from app.core.security import hash_password
from app.models.entities import User


async def test_concurrent_admin_changes_cannot_remove_both_admins(lab, monkeypatch):
    from app.api import admin

    second_id = str(uuid4())
    second_email = f"admin-{second_id}@example.com"
    async with lab["db"]() as db, db.begin():
        db.add(
            User(
                id=second_id,
                name="Segundo administrador de teste",
                email=second_email,
                role="admin",
                password_hash=hash_password(lab["password"]),
                active=True,
            )
        )
    first_headers = await lab["login"]()
    login = await lab["client"].post(
        "/api/v1/auth/login", json={"email": second_email, "password": lab["password"]}
    )
    assert login.status_code == 200
    second_headers = {"Authorization": f"Bearer {login.json()['accessToken']}"}
    waiting = asyncio.Event()
    arrived = 0

    async def synchronized_lock(db):
        nonlocal arrived
        arrived += 1
        if arrived == 2:
            waiting.set()
        await asyncio.wait_for(waiting.wait(), timeout=5)
        await write_lock(db)

    monkeypatch.setattr(admin, "write_lock", synchronized_lock)
    responses = await asyncio.gather(
        lab["client"].patch(
            f"/api/v1/admin/users/{second_id}",
            headers=first_headers,
            json={"expectedVersion": 1, "active": False},
        ),
        lab["client"].patch(
            f"/api/v1/admin/users/{lab['identities']['admin']['id']}",
            headers=second_headers,
            json={"expectedVersion": 1, "active": False},
        ),
    )
    assert sorted(response.status_code for response in responses) == [200, 409]
    async with lab["db"]() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(User)
                .where(User.role == "admin", User.active.is_(True))
            )
            >= 1
        )
