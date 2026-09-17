import json
from pathlib import Path
from typing import Any

from app.detection import correlate_incidents
from app.models.analysis import AnalysisRequest, AnalysisResponse
from app.parsers import normalize_records


class SampleNotFoundError(FileNotFoundError):
    pass


def _sample_paths(sample_id: str) -> list[Path]:
    repo_root = Path(__file__).resolve().parents[3]
    package_samples = Path(__file__).resolve().parents[1] / "samples"
    return [repo_root / "datasets" / f"{sample_id}.json", package_samples / f"{sample_id}.json"]


def load_sample(sample_id: str) -> list[dict[str, Any]]:
    for path in _sample_paths(sample_id):
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and "records" in payload:
                payload = payload["records"]
            if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
                raise ValueError(f"sample {sample_id!r} must contain a JSON array of records")
            return payload
    raise SampleNotFoundError(f"unknown sample dataset: {sample_id}")


def analyze_records(records: list[dict[str, Any]]) -> AnalysisResponse:
    events = normalize_records(records)
    incidents, relationships = correlate_incidents(events)
    return AnalysisResponse(events=events, incidents=incidents, relationships=relationships)


def analyze_request(payload: AnalysisRequest) -> AnalysisResponse:
    records = load_sample(payload.sample_id) if payload.sample_id else payload.records
    return analyze_records(records or [])

