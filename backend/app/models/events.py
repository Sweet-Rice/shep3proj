from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EventSource(StrEnum):
    AUTH = "auth"
    PROCESS = "process"
    NETWORK = "network"


class NormalizedEvent(BaseModel):
    """Common event shape consumed by all deterministic detection rules."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    timestamp: datetime
    source: EventSource
    event_type: str = Field(min_length=1, max_length=100)
    user: str | None = None
    src_ip: str | None = None
    dst_ip: str | None = None
    host: str | None = None
    process: str | None = None
    bytes_out: int | None = Field(default=None, ge=0)
    severity: int = Field(default=1, ge=1, le=5)
    raw: str
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("timestamp")
    @classmethod
    def timestamp_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include a timezone")
        return value.astimezone(UTC)

