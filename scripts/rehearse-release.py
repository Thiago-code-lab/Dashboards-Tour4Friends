"""Rehearse stacked merges in a new local clone with no remotes and verify its final tree."""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git(directory: Path, *arguments: str) -> str:
    return subprocess.check_output(
        ["git", *arguments], cwd=directory, text=True, stderr=subprocess.STDOUT
    ).strip()


def merge_chain(directory: Path, revisions: dict[str, str]) -> list[dict[str, str]]:
    merges: list[dict[str, str]] = []
    incoming = revisions["candidate"]
    for target in ("analytics", "backend", "main"):
        git(directory, "checkout", "-B", f"rehearsal/{target}", revisions[target])
        git(
            directory,
            "merge",
            "--no-ff",
            incoming,
            "-m",
            f"Local rehearsal: integrate into {target}",
        )
        incoming = git(directory, "rev-parse", "HEAD")
        merges.append({"target": target, "result": incoming})
    return merges


def verify_clone(directory: Path) -> list[dict[str, str | int]]:
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm:
        raise RuntimeError("npm não encontrado para validar o clone.")
    subprocess.run(
        [sys.executable, "scripts/generate_demo_data.py"], cwd=directory, check=True
    )
    git(directory, "diff", "--exit-code", "--", "public/data/demo.json")
    commands = [
        "ci",
        "run data:validate",
        "test",
        "run build:demo",
        "run release:check",
    ]
    results: list[dict[str, str | int]] = [
        {
            "command": "regenerate seed; git diff --exit-code -- public/data/demo.json",
            "exitCode": 0,
        }
    ]
    for command in commands:
        result = subprocess.run([npm, *command.split()], cwd=directory, check=True)
        results.append({"command": f"npm {command}", "exitCode": result.returncode})
    return results


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("main", "backend", "analytics", "candidate"):
        parser.add_argument(f"--{name}", required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if not all(
        re.fullmatch(r"[a-f0-9]{40}", getattr(args, name))
        for name in ("main", "backend", "analytics", "candidate")
    ):
        parser.error("Use SHAs completos verificados no GitHub.")
    destination = args.destination.resolve()
    if destination.exists() or not destination.is_relative_to(ROOT / ".tools"):
        parser.error("O clone deve ser novo e ficar dentro de .tools do workspace.")
    args.destination = destination
    return args


def prepare_clone(destination: Path, revisions: dict[str, str]) -> None:
    for base, head in (
        ("main", "backend"),
        ("backend", "analytics"),
        ("analytics", "candidate"),
    ):
        git(ROOT, "merge-base", "--is-ancestor", revisions[base], revisions[head])
    git(ROOT, "clone", "--no-hardlinks", "--no-checkout", str(ROOT), str(destination))
    git(destination, "remote", "remove", "origin")
    git(destination, "config", "user.name", "T4F Local Release QA")
    git(destination, "config", "user.email", "release-qa@example.invalid")


def integration_evidence(destination: Path, revisions: dict[str, str]) -> dict:
    merges = merge_chain(destination, revisions)
    candidate_tree = git(destination, "rev-parse", f"{revisions['candidate']}^{{tree}}")
    final_tree = git(destination, "rev-parse", "HEAD^{tree}")
    if final_tree != candidate_tree:
        raise RuntimeError(
            "A árvore integrada difere da candidata; interrompa a integração."
        )
    seeds = {
        name: git(destination, "rev-parse", f"{sha}:public/data/demo.json")
        for name, sha in revisions.items()
    }
    if len(set(seeds.values())) != 1:
        raise RuntimeError("O snapshot sintético mudou entre as etapas.")
    return {
        "generatedAt": datetime.now(UTC).isoformat(),
        "originalCommits": revisions,
        "strategy": "three --no-ff merge commits; ancestry preserved",
        "merges": merges,
        "candidateTree": candidate_tree,
        "integratedTree": final_tree,
        "conflicts": [],
        "unexpectedDifferences": [],
        "remotes": git(destination, "remote"),
        "seedBlobs": seeds,
        "datasetSha256": hashlib.sha256(
            (destination / "public/data/demo.json").read_bytes()
        ).hexdigest(),
    }


def main() -> None:
    args = arguments()
    revisions = {
        name: getattr(args, name)
        for name in ("main", "backend", "analytics", "candidate")
    }
    prepare_clone(args.destination, revisions)
    evidence = integration_evidence(args.destination, revisions)
    evidence["checks"] = verify_clone(args.destination) if args.verify else []
    output = ROOT / "artifacts/release-05/integration-rehearsal.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, indent=2), encoding="utf8")
    print(f"Ensaio local concluído, sem remotes: {output}")


if __name__ == "__main__":
    main()
