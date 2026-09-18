"""Regenerate datasets/expected/*.expected.json from the real backend pipeline.

Expected outcomes are not hand-written: this script feeds each dataset in
datasets/*.json through the actual normalize_records + correlate_incidents
pipeline and writes the resulting AnalysisResponse as the fixture. Run this
whenever a dataset or the detection engine changes, then commit the diff.

Usage (from repo root):
    backend/.venv/bin/python datasets/generate_expected.py
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = REPO_ROOT / "backend"
DATASETS_DIR = REPO_ROOT / "datasets"
EXPECTED_DIR = DATASETS_DIR / "expected"

sys.path.insert(0, str(BACKEND_ROOT))

from app.detection import correlate_incidents  # noqa: E402
from app.parsers import normalize_records  # noqa: E402
from app.models.analysis import AnalysisResponse  # noqa: E402


def build_expected(dataset_path: Path) -> dict:
    records = json.loads(dataset_path.read_text(encoding="utf-8"))
    events = normalize_records(records)
    incidents, relationships = correlate_incidents(events)
    response = AnalysisResponse(events=events, incidents=incidents, relationships=relationships)
    return json.loads(response.model_dump_json())


def main() -> None:
    EXPECTED_DIR.mkdir(parents=True, exist_ok=True)
    for dataset_path in sorted(DATASETS_DIR.glob("*.json")):
        expected = build_expected(dataset_path)
        out_path = EXPECTED_DIR / f"{dataset_path.stem}.expected.json"
        out_path.write_text(json.dumps(expected, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(
            f"{dataset_path.name}: {len(expected['events'])} events, "
            f"{len(expected['incidents'])} incidents, "
            f"{len(expected['relationships'])} relationships -> {out_path.relative_to(REPO_ROOT)}"
        )


if __name__ == "__main__":
    main()
