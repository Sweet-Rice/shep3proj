from typing import Any

from pydantic import ValidationError

from app.models.events import EventSource, NormalizedEvent
from app.parsers.auth import parse_auth
from app.parsers.network import parse_network
from app.parsers.process import parse_process


class RecordNormalizationError(ValueError):
    """A source record could not be converted into the common schema."""


def _parse_record(record: dict[str, Any], index: int) -> NormalizedEvent:
    if "id" in record and "event_type" in record:
        try:
            return NormalizedEvent.model_validate(record)
        except ValidationError:
            # Records carrying IDs may still be source-specific; fall through to a parser.
            pass

    source = str(record.get("source", record.get("category", ""))).lower()
    if source == EventSource.AUTH:
        return parse_auth(record, index)
    if source == EventSource.PROCESS:
        return parse_process(record, index)
    if source == EventSource.NETWORK:
        return parse_network(record, index)
    raise ValueError("source/category must be one of: auth, process, network")


def normalize_records(records: list[dict[str, Any]]) -> list[NormalizedEvent]:
    events: list[NormalizedEvent] = []
    seen_ids: set[str] = set()
    for index, record in enumerate(records, start=1):
        try:
            event = _parse_record(record, index)
        except (TypeError, ValueError, ValidationError) as exc:
            raise RecordNormalizationError(f"record {index}: {exc}") from exc
        if event.id in seen_ids:
            raise RecordNormalizationError(f"record {index}: duplicate event id {event.id!r}")
        seen_ids.add(event.id)
        events.append(event)
    return sorted(events, key=lambda event: (event.timestamp, event.id))

