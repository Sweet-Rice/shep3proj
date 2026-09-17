import json
from datetime import UTC, datetime
from typing import Any


def event_id(record: dict[str, Any], index: int) -> str:
    return str(record.get("id") or f"evt-{index:03d}")


def raw_evidence(record: dict[str, Any]) -> str:
    raw = record.get("raw")
    if isinstance(raw, str) and raw.strip():
        return raw
    return json.dumps(record, sort_keys=True, default=str)


def required_text(record: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    raise ValueError(f"missing required field (one of: {', '.join(keys)})")


def optional_text(record: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def parse_timestamp(record: dict[str, Any]) -> datetime:
    value = record.get("timestamp") or record.get("time")
    if not isinstance(value, str):
        raise ValueError("missing required timestamp")
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(UTC)

