import json
from datetime import date
from pathlib import Path

import pytest
from test_integration import frontend_results

from app.schemas.domain import Dataset
from app.services.analytics import analyze_dataset

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = json.loads((ROOT / 'tests/fixtures/kpi-reference.json').read_text(encoding='utf8'))
CASES = json.loads((ROOT / 'tests/fixtures/kpi-reference-expected.json').read_text(encoding='utf8'))


@pytest.mark.parametrize('case', CASES, ids=[case['name'] for case in CASES])
def test_independent_hand_calculated_reference(case: dict) -> None:
    filters = case['filters']
    result = analyze_dataset(Dataset.model_validate(REFERENCE), start=date.fromisoformat(filters['start']),
        end=date.fromisoformat(filters['end']), category=None if filters['category'] == 'all' else filters['category'])
    frontend = frontend_results(REFERENCE, [filters])[0]
    for key, expected in case['expected'].items():
        assert result[key] == pytest.approx(expected, abs=0.000001), key
        assert frontend[key] == pytest.approx(expected, abs=0.000001), key
