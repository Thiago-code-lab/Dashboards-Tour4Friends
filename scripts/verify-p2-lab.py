"""Run existing relational suites in a new local cluster; never reuse backend/.env."""

import argparse
import importlib.util
import json
import os
import secrets
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts/p2-lab"


def run(
    command: list[str], name: str, environment: dict[str, str], cwd: Path = ROOT
) -> None:
    with (ART / f"{name}.log").open("w", encoding="utf8") as log:
        result = subprocess.run(
            command,
            cwd=cwd,
            env=environment,
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
        )
    print(f"{name}: exit {result.returncode}", flush=True)
    if result.returncode:
        raise RuntimeError(f"{name} falhou; consulte artifacts/p2-lab/{name}.log")


def initialize(pg: Path, cluster: Path, environment: dict[str, str]) -> None:
    descriptor, filename = tempfile.mkstemp(prefix="t4f-p2-")
    try:
        with os.fdopen(descriptor, "w", encoding="utf8") as secret:
            secret.write(environment["PGPASSWORD"])
        run(
            [
                str(pg / "initdb"),
                "-D",
                str(cluster),
                "-U",
                "t4f_p2",
                "-A",
                "scram-sha-256",
                "--pwfile",
                filename,
                "--encoding=UTF8",
                "--locale=C",
            ],
            "init",
            environment,
        )
    finally:
        Path(filename).unlink(missing_ok=True)


def check_suites(environment: dict[str, str], evidence: dict[str, Any]) -> None:
    suites = [
        (
            "ruff",
            ["-m", "ruff", "check", "backend/app", "backend/tests", "backend/scripts"],
            ROOT,
        ),
        ("pytest", ["-m", "pytest", "-q"], ROOT / "backend"),
        (
            "connected",
            ["backend/scripts/run_connected_tests.py", "--allow-reset-test-db"],
            ROOT,
        ),
    ]
    for name, arguments, cwd in suites:
        evidence["checks"][name] = "running"
        save_results(evidence)
        try:
            run([sys.executable, *arguments], name, environment, cwd)
        except (Exception, KeyboardInterrupt):
            evidence["checks"][name] = "failed"
            raise
        evidence["checks"][name] = "passed"


def save_results(evidence: dict[str, Any]) -> None:
    temporary = ART / "results.tmp"
    temporary.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf8")
    temporary.replace(ART / "results.json")


def validate_environment(pg: Path) -> None:
    modules = (
        "argon2",
        "fastapi",
        "sqlalchemy",
        "psycopg",
        "alembic",
        "pytest",
        "pytest_asyncio",
        "dotenv",
        "ruff",
    )
    missing = [name for name in modules if importlib.util.find_spec(name) is None]
    if missing:
        raise RuntimeError(
            f"Dependências Python ausentes: {', '.join(missing)}. "
            "Instale backend/requirements.txt no Python usado para executar este script."
        )
    suffix = ".exe" if os.name == "nt" else ""
    if any(
        not (pg / f"{name}{suffix}").is_file()
        for name in ("initdb", "pg_ctl", "createdb")
    ):
        raise RuntimeError("--pg-bin deve conter initdb, pg_ctl e createdb.")
    if not (ROOT / "node_modules/@playwright/test/package.json").is_file():
        raise RuntimeError(
            "Dependências Node ausentes; execute npm ci antes do laboratório."
        )


def stop_cluster(control: list[str], environment: dict[str, str]) -> None:
    status = subprocess.run(
        [*control, "status"], env=environment, capture_output=True, check=False
    )
    if status.returncode == 0:
        run([*control, "-m", "fast", "-w", "stop"], "stop", environment)
    elif status.returncode != 3:
        raise RuntimeError(
            "Não foi possível verificar o encerramento do cluster temporário."
        )


def verify(pg: Path, port: int, evidence: dict[str, Any]) -> None:
    validate_environment(pg)
    cluster = Path(tempfile.mkdtemp(prefix="t4f-p2-pg-"))
    evidence["cluster"] = str(cluster)
    password = secrets.token_urlsafe(36)
    environment = {**os.environ, "PGPASSWORD": password, "PYTHONIOENCODING": "utf-8"}
    initialize(pg, cluster, environment)
    control = [str(pg / "pg_ctl"), "-D", str(cluster)]
    evidence["stopped"] = False
    try:
        run(
            [
                *control,
                "-l",
                str(ART / "postgres.log"),
                "-o",
                f"-h 127.0.0.1 -p {port}",
                "-w",
                "start",
            ],
            "start",
            environment,
        )
        run(
            [
                str(pg / "createdb"),
                "-h",
                "127.0.0.1",
                "-p",
                str(port),
                "-U",
                "t4f_p2",
                "t4f_p2_test",
            ],
            "createdb",
            environment,
        )
        url = f"postgresql+psycopg://t4f_p2:{password}@127.0.0.1:{port}/t4f_p2_test"
        environment.update(DATABASE_URL=url, TEST_DATABASE_URL=url)
        check_suites(environment, evidence)
    finally:
        stop_cluster(control, environment)
        evidence["stopped"] = True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", type=Path, required=True)
    parser.add_argument("--port", type=int, default=55439)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("A porta deve estar entre 1024 e 65535.")
    pg = args.pg_bin.resolve()
    ART.mkdir(parents=True, exist_ok=True)
    evidence: dict[str, Any] = {
        "startedAt": datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
        "status": "running",
        "database": "t4f_p2_test",
        "port": args.port,
        "existingEnvironmentModified": False,
        "stopped": None,
        "checks": dict.fromkeys(("ruff", "pytest", "connected"), "not_run"),
    }
    save_results(evidence)
    try:
        verify(pg, args.port, evidence)
        evidence["status"] = "passed"
    except (Exception, KeyboardInterrupt) as error:
        evidence["status"] = "failed"
        evidence["error"] = str(error) or type(error).__name__
        raise
    finally:
        evidence["checkedAt"] = datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat()
        save_results(evidence)


if __name__ == "__main__":
    main()
