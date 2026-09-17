from typing import Any

from app.models.events import EventSource, NormalizedEvent
from app.parsers.common import (
    event_id,
    optional_text,
    parse_timestamp,
    raw_evidence,
    required_text,
)

FAILED_ACTIONS = {"auth_failure", "authentication_failure", "failed_login", "login_failed"}
SUCCESS_ACTIONS = {"auth_success", "authentication_success", "login_success", "successful_login"}


def parse_auth(record: dict[str, Any], index: int) -> NormalizedEvent:
    action = required_text(record, "event_type", "action", "result").lower().replace(" ", "_")
    if action in FAILED_ACTIONS or action == "failed":
        event_type = "login_failure"
        default_severity = 2
    elif action in SUCCESS_ACTIONS or action == "success":
        event_type = "login_success"
        default_severity = 1
    else:
        raise ValueError(f"unsupported auth action: {action}")

    return NormalizedEvent(
        id=event_id(record, index),
        timestamp=parse_timestamp(record),
        source=EventSource.AUTH,
        event_type=event_type,
        user=required_text(record, "user", "username", "account"),
        src_ip=required_text(record, "src_ip", "source_ip", "remote_ip"),
        dst_ip=optional_text(record, "dst_ip", "destination_ip"),
        host=optional_text(record, "host", "hostname", "target_host"),
        severity=int(record.get("severity", default_severity)),
        raw=raw_evidence(record),
        metadata={"parser": "auth"},
    )

