"""Run browser tests against a real API and a disposable PostgreSQL, without shared credentials."""

import argparse
import asyncio
import os
import secrets
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen
from uuid import uuid4

from dotenv import dotenv_values
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app.core.config import Settings
from app.core.database import database_factory
from app.core.security import hash_password
from app.models.entities import Base, User
from app.services.seed import seed_demo


async def prepare(url: str, password: str) -> dict[str, str]:
    factory = database_factory(Settings(database_url=SecretStr(url), _env_file=None))
    result = {}
    try:
        async with factory() as db, db.begin():
            tables = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
            await db.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
            await seed_demo(db, ROOT / "public/data/demo.json")
            hashed = hash_password(password)
            for role in ("admin", "manager", "analyst", "viewer"):
                identifier = str(uuid4())
                email = f"{role}-{identifier}@example.com"
                result[f"T4F_E2E_{role.upper()}_EMAIL"] = email
                db.add(
                    User(
                        id=identifier,
                        email=email,
                        name=f"{role} de teste",
                        password_hash=hashed,
                        role=role,
                        active=True,
                    )
                )
    finally:
        await factory.kw["bind"].dispose()
    return result


def wait_ready(url: str, process: subprocess.Popen, timeout: int = 40) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(
                "O serviço de teste encerrou antes de iniciar. Confira artifacts/connected-services.log."
            )
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except (URLError, TimeoutError):
            time.sleep(0.25)
    raise RuntimeError("O serviço de teste não ficou pronto no prazo.")


def stop(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True)
    else:
        import signal

        os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-reset-test-db", action="store_true", required=True)
    parser.parse_args()
    values = dotenv_values(ROOT / "backend/.env")
    url = os.environ.get("TEST_DATABASE_URL") or values.get("TEST_DATABASE_URL", "")
    if not url or not make_url(url).database.endswith("_test"):
        parser.error("TEST_DATABASE_URL deve apontar para um banco descartável terminado em _test.")
    environment = {**os.environ, "DATABASE_URL": url}
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT / "backend",
        env=environment,
        check=True,
    )
    password = secrets.token_urlsafe(32)
    environment.update(asyncio.run(prepare(url, password)))
    environment.update(
        T4F_E2E_PASSWORD=password,
        VITE_API_BASE_URL="http://127.0.0.1:8001",
        VITE_DATA_MODE="demo",
        CORS_ORIGINS='["http://127.0.0.1:4174"]',
        REQUEST_LIMIT="10000",
    )
    (ROOT / "artifacts").mkdir(exist_ok=True)
    processes = []
    try:
        with (ROOT / "artifacts/connected-services.log").open("w", encoding="utf8") as log:
            kwargs = {
                "env": environment,
                "stdout": log,
                "stderr": subprocess.STDOUT,
                "start_new_session": os.name != "nt",
            }
            backend = subprocess.Popen(
                [sys.executable, "-m", "app.server", "--host", "127.0.0.1", "--port", "8001"],
                cwd=ROOT / "backend",
                **kwargs,
            )
            processes.append(backend)
            wait_ready("http://127.0.0.1:8001/ready", backend)
            frontend = subprocess.Popen(
                [
                    shutil.which("node"),
                    "node_modules/vite/bin/vite.js",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "4174",
                    "--strictPort",
                ],
                cwd=ROOT,
                **kwargs,
            )
            processes.append(frontend)
            wait_ready("http://127.0.0.1:4174/Dashboards-Tour4Friends/", frontend)
            return subprocess.run(
                [
                    shutil.which("node"),
                    "node_modules/@playwright/test/cli.js",
                    "test",
                    "--config",
                    "playwright.api.config.ts",
                ],
                cwd=ROOT,
                env=environment,
            ).returncode
    finally:
        for process in reversed(processes):
            stop(process)
        # Ephemeral test sessions cannot be reused after browser verification.
        asyncio.run(disable_test_users(url))


async def disable_test_users(url: str) -> None:
    from datetime import UTC, datetime

    from sqlalchemy import update

    from app.models.entities import UserSession

    factory = database_factory(Settings(database_url=SecretStr(url), _env_file=None))
    try:
        async with factory() as db, db.begin():
            await db.execute(update(User).values(active=False))
            await db.execute(update(UserSession).values(revoked_at=datetime.now(UTC)))
    finally:
        await factory.kw["bind"].dispose()


if __name__ == "__main__":
    raise SystemExit(main())
