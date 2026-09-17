from typing import Any

from app.models.events import EventSource, NormalizedEvent
from app.parsers.common import (
    event_id,
    optional_text,
    parse_timestamp,
    raw_evidence,
    required_text,
)


def parse_process(record: dict[str, Any], index: int) -> NormalizedEvent:
    process = required_text(record, "process", "process_name", "image")
    command_line = optional_text(record, "command_line", "command", "cmdline")
    return NormalizedEvent(
        id=event_id(record, index),
        timestamp=parse_timestamp(record),
        source=EventSource.PROCESS,
        event_type="process_start",
        user=optional_text(record, "user", "username", "account"),
        host=required_text(record, "host", "hostname"),
        process=process,
        severity=int(record.get("severity", 2)),
        raw=raw_evidence(record),
        metadata={"parser": "process", "command_line": command_line or process},
    )

