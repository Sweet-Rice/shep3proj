# Traceback API contract

This contract is frozen for the MVP. Coordinate changes in `AGENTS.md` before modifying it.

## `GET /api/health`

Returns HTTP 200:

```json
{"status":"healthy"}
```

## `POST /api/analyze`

Send one, and only one, input form:

```json
{"sample_id":"compromise"}
```

or:

```json
{"records":[{"source":"auth","timestamp":"2026-09-16T12:01:00Z","action":"login_failed","username":"admin","source_ip":"10.2.4.18"}]}
```

The response always has these top-level arrays:

```json
{"events":[],"incidents":[],"relationships":[]}
```

Events are sorted chronologically. Relationship endpoints use stable prefixed identifiers such as `ip:10.2.4.18`, `host:web-01`, `event:evt-001`, and `stage:INC-001:brute_force`; the frontend may derive graph nodes from these endpoints. Every relationship includes a human-readable `reason` and supporting `event_ids` for the evidence panel.

Run `PYTHONPATH=backend python backend/scripts/export_contract.py` from the repository root to refresh both the machine-readable JSON Schema bundle at `docs/api-contract.json` and the frontend-ready response fixture at `docs/sample-analysis.json`.

