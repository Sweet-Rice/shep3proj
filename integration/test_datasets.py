"""End-to-end acceptance check for the C1 synthetic datasets.

Posts each datasets/*.json fixture to a *running* backend (the real
container, not an in-process test client) two different ways and checks
the response against datasets/expected/*.expected.json:

1. via {"records": [...]} — exercises the parser/normalize/correlate path.
2. via {"sample_id": "<name>"} — exercises the repo-root datasets/ lookup
   in app/services/analyzer.py, which only works when the datasets/
   directory is actually deployed alongside the backend (see
   backend/Dockerfile). This is the concrete proof that C1 and C2 are
   wired together correctly, not just individually correct.
"""

import json
from pathlib import Path

import pytest
import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASETS_DIR = REPO_ROOT / "datasets"
EXPECTED_DIR = DATASETS_DIR / "expected"

DATASET_NAMES = sorted(path.stem for path in DATASETS_DIR.glob("*.json"))


def _load_records(name: str) -> list[dict]:
    return json.loads((DATASETS_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _load_expected(name: str) -> dict:
    return json.loads((EXPECTED_DIR / f"{name}.expected.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module", autouse=True)
def _require_datasets() -> None:
    if not DATASET_NAMES:
        pytest.fail("no datasets found under datasets/ — C1 fixtures are missing")


@pytest.mark.parametrize("name", DATASET_NAMES)
def test_records_payload_matches_expected(api_base_url: str, name: str) -> None:
    records = _load_records(name)
    expected = _load_expected(name)

    response = requests.post(f"{api_base_url}/api/analyze", json={"records": records}, timeout=10)

    assert response.status_code == 200, response.text
    assert response.json() == expected


@pytest.mark.parametrize("name", DATASET_NAMES)
def test_sample_id_payload_matches_expected(api_base_url: str, name: str) -> None:
    expected = _load_expected(name)

    response = requests.post(f"{api_base_url}/api/analyze", json={"sample_id": name}, timeout=10)

    assert response.status_code == 200, response.text
    assert response.json() == expected
