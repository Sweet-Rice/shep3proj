from typing import Any

from app.models.events import EventSource, NormalizedEvent
from app.parsers.common import (
    event_id,
    optional_text,
    parse_timestamp,
    raw_evidence,
    required_text,
)


def parse_network(record: dict[str, Any], index: int) -> NormalizedEvent:
    bytes_value = record.get("bytes_out", record.get("bytes_sent"))
    bytes_out = int(bytes_value) if bytes_value is not None else None
    if bytes_out is not None and bytes_out < 0:
        raise ValueError("bytes_out must be non-negative")

    return NormalizedEvent(
        id=event_id(record, index),
        timestamp=parse_timestamp(record),
        source=EventSource.NETWORK,
        event_type="network_transfer" if bytes_out is not None else "network_connection",
        user=optional_text(record, "user", "username", "account"),
        src_ip=optional_text(record, "src_ip", "source_ip"),
        dst_ip=required_text(record, "dst_ip", "destination_ip", "remote_ip"),
        host=optional_text(record, "host", "hostname", "source_host"),
        bytes_out=bytes_out,
        severity=int(record.get("severity", 2)),
        raw=raw_evidence(record),
        metadata={
            "parser": "network",
            "demo_destination": bool(
                record.get("demo_destination", record.get("marked_destination", False))
            ),
        },
    )

