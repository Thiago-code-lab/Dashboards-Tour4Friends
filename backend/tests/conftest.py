import os
import secrets
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from dotenv import dotenv_values
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
env_values = dotenv_values(ROOT / "backend/.env")
TEST_URL = os.environ.get("TEST_DATABASE_URL") or env_values.get("TEST_DATABASE_URL", "")
if not TEST_URL or not make_url(TEST_URL).database.endswith("_test"):
    raise RuntimeError(
        "TEST_DATABASE_URL deve apontar para um PostgreSQL descartável com nome terminado em _test."
    )
os.environ["DATABASE_URL"] = TEST_URL

from app.core.config import Settings
from app.core.database import database_factory
from app.core.security import hash_password
from app.main import create_app
from app.models.entities import Base, User
from app.services.seed import seed_demo


@pytest.fixture(scope="session", autouse=True)
def migrated():
    environment = {**os.environ, "DATABASE_URL": TEST_URL}
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT / "backend",
        env=environment,
        check=True,
        capture_output=True,
    )


@pytest.fixture
async def lab(migrated):
    settings = Settings(database_url=SecretStr(TEST_URL), request_limit=10000, _env_file=None)
    factory = database_factory(settings)
    application = create_app(settings)
    application.state.sessions = factory
    password = secrets.token_urlsafe(30)
    identities = {}
    async with factory() as session, session.begin():
        tables = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
        await session.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
        await seed_demo(session, ROOT / "public/data/demo.json")
        hashed = hash_password(password)
        for role in ("admin", "manager", "analyst", "viewer"):
            identifier = str(uuid4())
            email = f"{role}-{identifier}@example.com"
            identities[role] = {"id": identifier, "email": email}
            session.add(
                User(
                    id=identifier,
                    email=email,
                    name=f"{role} de teste",
                    role=role,
                    password_hash=hashed,
                    active=True,
                )
            )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=application, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:

        async def login_as(role="admin"):
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": identities[role]["email"], "password": password},
            )
            assert response.status_code == 200, response.text
            return {"Authorization": f"Bearer {response.json()['accessToken']}"}

        yield {
            "client": client,
            "db": factory,
            "app": application,
            "login": login_as,
            "identities": identities,
            "password": password,
            "settings": settings,
        }
    await factory.kw["bind"].dispose()
