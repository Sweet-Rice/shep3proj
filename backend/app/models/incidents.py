from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class DetectionStage(StrEnum):
    BRUTE_FORCE = "brute_force"
    ACCOUNT_COMPROMISE = "account_compromise"
    SUSPICIOUS_EXECUTION = "suspicious_execution"
    POSSIBLE_EXFILTRATION = "possible_exfiltration"


class IncidentSeverity(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class IncidentEntities(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_ips: list[str] = Field(default_factory=list)
    users: list[str] = Field(default_factory=list)
    hosts: list[str] = Field(default_factory=list)
    processes: list[str] = Field(default_factory=list)
    destination_ips: list[str] = Field(default_factory=list)


class Incident(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    severity: IncidentSeverity
    score: int = Field(ge=1, le=5)
    entities: IncidentEntities
    stages: list[DetectionStage]
    event_ids: list[str]


class RelationshipType(StrEnum):
    AUTHENTICATED_AS = "authenticated_as"
    AUTHENTICATED_ON = "authenticated_on"
    EXECUTED_ON = "executed_on"
    CONNECTED_TO = "connected_to"
    PRECEDED_BY = "preceded_by"
    CORRELATED_WITH = "correlated_with"


class Relationship(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    target: str
    relationship_type: RelationshipType
    reason: str
    event_ids: list[str] = Field(default_factory=list)

