"""Run existing relational suites in a new local cluster; never reuse backend/.env."""

import argparse
import json
import os
import secrets
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
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


def check_suites(environment: dict[str, str]) -> None:
    run(
        [
            sys.executable,
            "-m",
            "ruff",
            "check",
            "backend/app",
            "backend/tests",
            "backend/scripts",
        ],
        "ruff",
        environment,
    )
    run([sys.executable, "-m", "pytest", "-q"], "pytest", environment, ROOT / "backend")
    run(
        [
            sys.executable,
            "backend/scripts/run_connected_tests.py",
            "--allow-reset-test-db",
        ],
        "connected",
        environment,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", type=Path, required=True)
    parser.add_argument("--port", type=int, default=55439)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("A porta deve estar entre 1024 e 65535.")
    pg = args.pg_bin.resolve()
    ART.mkdir(parents=True, exist_ok=True)
    cluster = Path(tempfile.mkdtemp(prefix="t4f-p2-pg-"))
    password = secrets.token_urlsafe(36)
    environment = {**os.environ, "PGPASSWORD": password, "PYTHONIOENCODING": "utf-8"}
    initialize(pg, cluster, environment)
    control = [str(pg / "pg_ctl"), "-D", str(cluster)]
    run(
        [
            *control,
            "-l",
            str(ART / "postgres.log"),
            "-o",
            f"-h 127.0.0.1 -p {args.port}",
            "-w",
            "start",
        ],
        "start",
        environment,
    )
    try:
        run(
            [
                str(pg / "createdb"),
                "-h",
                "127.0.0.1",
                "-p",
                str(args.port),
                "-U",
                "t4f_p2",
                "t4f_p2_test",
            ],
            "createdb",
            environment,
        )
        url = (
            f"postgresql+psycopg://t4f_p2:{password}@127.0.0.1:{args.port}/t4f_p2_test"
        )
        environment.update(DATABASE_URL=url, TEST_DATABASE_URL=url)
        check_suites(environment)
    finally:
        run([*control, "-m", "fast", "-w", "stop"], "stop", environment)
    (ART / "results.json").write_text(
        json.dumps(
            {
                "checkedAt": datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
                "database": "t4f_p2_test",
                "cluster": str(cluster),
                "port": args.port,
                "existingEnvironmentModified": False,
                "stopped": True,
                "checks": {"ruff": "passed", "pytest": "passed", "connected": "passed"},
            },
            indent=2,
        ),
        encoding="utf8",
    )


if __name__ == "__main__":
    main()
