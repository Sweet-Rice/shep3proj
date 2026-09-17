from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.events import NormalizedEvent
from app.models.incidents import Incident, Relationship


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sample_id: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    records: list[dict[str, Any]] | None = None

    @model_validator(mode="after")
    def require_exactly_one_input(self) -> "AnalysisRequest":
        if (self.sample_id is None) == (self.records is None):
            raise ValueError("provide exactly one of sample_id or records")
        return self


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: list[NormalizedEvent]
    incidents: list[Incident]
    relationships: list[Relationship]

