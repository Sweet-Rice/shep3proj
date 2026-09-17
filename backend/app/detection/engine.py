from collections import defaultdict, deque
from datetime import timedelta

from app.models.events import NormalizedEvent
from app.models.incidents import (
    DetectionStage,
    Incident,
    IncidentEntities,
    IncidentSeverity,
    Relationship,
    RelationshipType,
)

BRUTE_FORCE_THRESHOLD = 5
BRUTE_FORCE_WINDOW = timedelta(seconds=60)
COMPROMISE_WINDOW = timedelta(minutes=5)
POST_COMPROMISE_WINDOW = timedelta(minutes=20)
LARGE_TRANSFER_BYTES = 50 * 1024 * 1024
SUSPICIOUS_PROCESS_TOKENS = ("curl", "wget", "nc", "netcat", "python -c")


def _unique(values: list[str | None]) -> list[str]:
    return sorted({value for value in values if value})


def _qualifying_failures(events: list[NormalizedEvent]) -> list[NormalizedEvent] | None:
    window: deque[NormalizedEvent] = deque()
    for event in events:
        window.append(event)
        while window and event.timestamp - window[0].timestamp > BRUTE_FORCE_WINDOW:
            window.popleft()
        if len(window) >= BRUTE_FORCE_THRESHOLD:
            return list(window)
    return None


def _same_actor(event: NormalizedEvent, user: str, host: str | None) -> bool:
    return event.user == user or (host is not None and event.host == host)


def _is_suspicious_process(event: NormalizedEvent) -> bool:
    command = f"{event.process or ''} {event.metadata.get('command_line', '')}".lower()
    return event.event_type == "process_start" and any(
        token in command for token in SUSPICIOUS_PROCESS_TOKENS
    )


def _is_exfiltration(event: NormalizedEvent) -> bool:
    return event.source == "network" and (
        (event.bytes_out or 0) >= LARGE_TRANSFER_BYTES
        or bool(event.metadata.get("demo_destination"))
    )


def _relationship_builder(incident_id: str):
    relationships: list[Relationship] = []

    def add(
        source: str,
        target: str,
        relationship_type: RelationshipType,
        reason: str,
        event_ids: list[str],
    ) -> None:
        relationships.append(
            Relationship(
                id=f"rel-{incident_id}-{len(relationships) + 1:03d}",
                source=source,
                target=target,
                relationship_type=relationship_type,
                reason=reason,
                event_ids=event_ids,
            )
        )

    return relationships, add


def correlate_incidents(
    events: list[NormalizedEvent],
) -> tuple[list[Incident], list[Relationship]]:
    failures: dict[tuple[str, str], list[NormalizedEvent]] = defaultdict(list)
    for event in events:
        if event.event_type == "login_failure" and event.src_ip and event.user:
            failures[(event.src_ip, event.user)].append(event)

    incidents: list[Incident] = []
    all_relationships: list[Relationship] = []
    for src_ip, user in sorted(failures):
        brute_events = _qualifying_failures(failures[(src_ip, user)])
        if not brute_events:
            continue

        incident_id = f"INC-{len(incidents) + 1:03d}"
        stages = [DetectionStage.BRUTE_FORCE]
        evidence = list(brute_events)
        brute_end = brute_events[-1].timestamp

        successes = [
            event
            for event in events
            if event.event_type == "login_success"
            and event.src_ip == src_ip
            and event.user == user
            and brute_end <= event.timestamp <= brute_end + COMPROMISE_WINDOW
        ]
        success = successes[0] if successes else None
        host = success.host if success else brute_events[-1].host

        process_event = None
        network_event = None
        if success:
            stages.append(DetectionStage.ACCOUNT_COMPROMISE)
            evidence.append(success)
            post_compromise = [
                event
                for event in events
                if success.timestamp < event.timestamp
                <= success.timestamp + POST_COMPROMISE_WINDOW
                and _same_actor(event, user, host)
            ]
            process_event = next(
                (event for event in post_compromise if _is_suspicious_process(event)), None
            )
            if process_event:
                stages.append(DetectionStage.SUSPICIOUS_EXECUTION)
                evidence.append(process_event)

            exfil_after = process_event.timestamp if process_event else success.timestamp
            network_event = next(
                (
                    event
                    for event in post_compromise
                    if event.timestamp > exfil_after and _is_exfiltration(event)
                ),
                None,
            )
            if network_event:
                stages.append(DetectionStage.POSSIBLE_EXFILTRATION)
                evidence.append(network_event)

        score = 2 if len(stages) == 1 else min(5, len(stages) + 1)
        severity = IncidentSeverity.MEDIUM if len(stages) == 1 else IncidentSeverity.HIGH
        entities = IncidentEntities(
            source_ips=_unique([src_ip]),
            users=_unique([user]),
            hosts=_unique([event.host for event in evidence]),
            processes=_unique([event.process for event in evidence]),
            destination_ips=_unique([event.dst_ip for event in evidence]),
        )
        incident = Incident(
            id=incident_id,
            title=f"Potential credential compromise on {host or user}",
            severity=severity,
            score=score,
            entities=entities,
            stages=stages,
            event_ids=[event.id for event in evidence],
        )
        incidents.append(incident)

        relationships, add = _relationship_builder(incident_id)
        add(
            f"ip:{src_ip}",
            f"user:{user}",
            RelationshipType.AUTHENTICATED_AS,
            "Repeated authentication attempts targeted the same account.",
            [event.id for event in brute_events] + ([success.id] if success else []),
        )
        if success and host:
            add(
                f"user:{user}",
                f"host:{host}",
                RelationshipType.AUTHENTICATED_ON,
                "The successful post-brute-force login established the compromised host.",
                [success.id],
            )
        if process_event and host:
            add(
                f"process:{process_event.process}",
                f"host:{host}",
                RelationshipType.EXECUTED_ON,
                "A controlled-demo suspicious process followed the compromised login.",
                [process_event.id],
            )
        if network_event and host and network_event.dst_ip:
            add(
                f"host:{host}",
                f"ip:{network_event.dst_ip}",
                RelationshipType.CONNECTED_TO,
                "The compromised host sent a large transfer or contacted a marked destination.",
                [network_event.id],
            )
        for previous, current in zip(stages, stages[1:], strict=False):
            add(
                f"stage:{incident_id}:{previous}",
                f"stage:{incident_id}:{current}",
                RelationshipType.PRECEDED_BY,
                f"{previous} occurred before {current} for correlated entities.",
                [event.id for event in evidence],
            )
        for event in evidence:
            add(
                f"event:{event.id}",
                f"incident:{incident_id}",
                RelationshipType.CORRELATED_WITH,
                "This event is evidence for the incident's deterministic rule chain.",
                [event.id],
            )
        all_relationships.extend(relationships)

    return incidents, all_relationships

