from copy import deepcopy

from app.detection import correlate_incidents
from app.models.incidents import DetectionStage, IncidentSeverity, RelationshipType
from app.parsers import normalize_records


def test_full_attack_chain_correlates_deterministically(attack_records: list[dict]) -> None:
    incidents, relationships = correlate_incidents(normalize_records(attack_records))

    assert len(incidents) == 1
    incident = incidents[0]
    assert incident.id == "INC-001"
    assert incident.severity == IncidentSeverity.HIGH
    assert incident.score == 5
    assert incident.stages == [
        DetectionStage.BRUTE_FORCE,
        DetectionStage.ACCOUNT_COMPROMISE,
        DetectionStage.SUSPICIOUS_EXECUTION,
        DetectionStage.POSSIBLE_EXFILTRATION,
    ]
    assert incident.entities.source_ips == ["10.2.4.18"]
    assert incident.entities.users == ["admin"]
    assert incident.entities.hosts == ["web-01"]
    assert set(incident.event_ids) == {f"evt-{index:03d}" for index in range(1, 9)}
    assert {relationship.relationship_type for relationship in relationships} >= {
        RelationshipType.AUTHENTICATED_AS,
        RelationshipType.EXECUTED_ON,
        RelationshipType.CONNECTED_TO,
        RelationshipType.PRECEDED_BY,
        RelationshipType.CORRELATED_WITH,
    }
    assert all(relationship.reason for relationship in relationships)


def test_four_failures_do_not_trigger(attack_records: list[dict]) -> None:
    records = [record for record in attack_records if record["id"] != "evt-005"]

    incidents, relationships = correlate_incidents(normalize_records(records))

    assert incidents == []
    assert relationships == []


def test_failures_outside_sixty_seconds_do_not_trigger(attack_records: list[dict]) -> None:
    records = deepcopy(attack_records[:5])
    records[-1]["timestamp"] = "2026-09-16T12:02:30Z"

    incidents, _ = correlate_incidents(normalize_records(records))

    assert incidents == []


def test_unrelated_success_does_not_create_compromise(attack_records: list[dict]) -> None:
    records = deepcopy(attack_records[:6])
    records[-1]["source_ip"] = "10.2.4.99"

    incidents, _ = correlate_incidents(normalize_records(records))

    assert len(incidents) == 1
    assert incidents[0].severity == IncidentSeverity.MEDIUM
    assert incidents[0].score == 2
    assert incidents[0].stages == [DetectionStage.BRUTE_FORCE]


def test_normal_noise_does_not_join_incident(attack_records: list[dict]) -> None:
    attack_records.insert(
        6,
        {
            "id": "noise-001",
            "timestamp": "2026-09-16T12:03:30Z",
            "source": "process",
            "process_name": "systemd",
            "username": "service",
            "hostname": "db-01",
        },
    )

    incidents, _ = correlate_incidents(normalize_records(attack_records))

    assert "noise-001" not in incidents[0].event_ids

