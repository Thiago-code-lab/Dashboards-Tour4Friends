"""Guard evidence against stale success and failed cluster cleanup without using a database."""

import importlib.util
import json
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "p2_lab", Path(__file__).resolve().parents[1] / "verify-p2-lab.py"
)
assert SPEC is not None and SPEC.loader is not None
LAB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAB)


class EvidenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.directory = Path(self.stack.enter_context(tempfile.TemporaryDirectory()))
        self.stack.enter_context(patch.object(LAB, "ART", self.directory))
        self.stack.enter_context(
            patch("sys.argv", ["verify-p2-lab.py", "--pg-bin", str(self.directory)])
        )

    def result(self) -> dict:
        return json.loads((self.directory / "results.json").read_text(encoding="utf8"))

    def test_preflight_failure_invalidates_previous_success_before_cluster_creation(
        self,
    ) -> None:
        (self.directory / "results.json").write_text(
            '{"status":"passed"}', encoding="utf8"
        )
        with (
            patch.object(
                LAB,
                "validate_environment",
                side_effect=RuntimeError("Dependência ausente"),
            ),
            patch.object(LAB, "initialize") as initialize,
            self.assertRaisesRegex(RuntimeError, "Dependência ausente"),
        ):
            LAB.main()
        self.assertEqual(self.result()["status"], "failed")
        self.assertEqual(set(self.result()["checks"].values()), {"not_run"})
        self.assertIsNone(self.result()["stopped"])
        initialize.assert_not_called()

    def test_new_run_replaces_success_before_starting_checks(self) -> None:
        (self.directory / "results.json").write_text(
            '{"status":"passed"}', encoding="utf8"
        )

        def succeed(_pg: Path, _port: int, evidence: dict) -> None:
            self.assertEqual(self.result()["status"], "running")
            evidence.update(
                stopped=True,
                checks=dict.fromkeys(("ruff", "pytest", "connected"), "passed"),
            )

        with patch.object(LAB, "verify", side_effect=succeed):
            LAB.main()
        self.assertEqual(self.result()["status"], "passed")
        self.assertTrue(self.result()["stopped"])
        self.assertIn("checkedAt", self.result())

    def mock_cluster(self) -> None:
        for name in ("validate_environment", "initialize"):
            self.stack.enter_context(patch.object(LAB, name))
        self.stack.enter_context(
            patch.object(LAB.tempfile, "mkdtemp", return_value=str(self.directory))
        )

    def test_failed_suite_stops_cluster_and_does_not_claim_later_checks(self) -> None:
        self.mock_cluster()

        def fail_pytest(
            _command: list[str], name: str, _environment: dict, *_cwd: Path
        ) -> None:
            if name == "pytest":
                raise RuntimeError("pytest falhou")

        with (
            patch.object(LAB, "run", side_effect=fail_pytest),
            patch.object(LAB, "stop_cluster") as stop,
            self.assertRaisesRegex(RuntimeError, "pytest falhou"),
        ):
            LAB.main()
        self.assertEqual(self.result()["status"], "failed")
        self.assertEqual(
            self.result()["checks"],
            {"ruff": "passed", "pytest": "failed", "connected": "not_run"},
        )
        self.assertTrue(self.result()["stopped"])
        stop.assert_called_once()

    def test_shutdown_failure_cannot_be_reported_as_success(self) -> None:
        self.mock_cluster()
        with (
            patch.object(LAB, "run"),
            patch.object(
                LAB, "stop_cluster", side_effect=RuntimeError("Falha ao encerrar")
            ),
            self.assertRaisesRegex(RuntimeError, "Falha ao encerrar"),
        ):
            LAB.main()
        self.assertEqual(self.result()["status"], "failed")
        self.assertFalse(self.result()["stopped"])

    def test_interruption_records_failure_and_stops_cluster(self) -> None:
        self.mock_cluster()
        with (
            patch.object(LAB, "run"),
            patch.object(LAB, "check_suites", side_effect=KeyboardInterrupt),
            patch.object(LAB, "stop_cluster") as stop,
            self.assertRaises(KeyboardInterrupt),
        ):
            LAB.main()
        self.assertEqual(self.result()["status"], "failed")
        self.assertTrue(self.result()["stopped"])
        stop.assert_called_once()


if __name__ == "__main__":
    unittest.main()
