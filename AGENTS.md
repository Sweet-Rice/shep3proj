# Traceback Collaboration Guide

This repository is a shared three-person workspace. Read this file before editing and update the coordination log whenever ownership, contracts, or integration status changes.

## Project goal

Deliver a demoable incident-reconstruction MVP that normalizes synthetic authentication, process, and network telemetry; applies deterministic correlation rules; and returns a timeline plus graph relationships.

## Ownership boundaries

- **Student A — Backend / Detection:** `backend/`, backend tests, normalized schemas, parser implementations, deterministic detection/correlation, and the canonical API contract.
- **Student B — Frontend / Visualization:** `frontend/`, UI tests, timeline, graph, details panel, frontend API client, and frontend state handling.
- **Student C — Integration / QA / DevOps:** `datasets/`, `.github/`, Docker/Compose, root-level integration tests, release/demo verification, and deployment.
- Shared files (`README.md`, `docs/`, root configuration) require small, additive edits and a coordination-log entry. Do not overwrite another owner's unfinished work.

## Frozen integration contract

- Backend base URL in local development: `http://localhost:8000`.
- Health: `GET /api/health` returns `{ "status": "healthy" }`.
- Analysis: `POST /api/analyze` accepts JSON with exactly one of:
  - `{ "sample_id": "compromise" }`, or
  - `{ "records": [ ...source-specific or normalized records... ] }`.
- Successful analysis returns `{ "events": [], "incidents": [], "relationships": [] }`.
- Timestamps use UTC ISO 8601 strings. Enum values use `snake_case`.
- Validation failures use FastAPI's standard JSON error response and a 4xx status.
- The canonical schema is generated at `docs/api-contract.json`; TypeScript consumers should mirror or generate types from it.

Do not silently change this contract. Record a proposed change below and coordinate consumers first.

## Collaboration rules

1. Work on a feature branch; do not edit another student's owned area without recording why.
2. Keep commits scoped and avoid formatting unrelated files.
3. Never commit credentials, `.env` secrets, or real telemetry.
4. All datasets and test fixtures must be synthetic.
5. Before declaring work complete, run the relevant tests and record the exact result below.
6. Move Trello work only after acceptance criteria have been verified.

## Coordination log

Newest entries first.

- **2026-09-16 — Student A:** Initialized Git after receiving permission and split work into scoped commits: `6046593` coordination, `2d26014` schemas/parsers, `deb6376` detection, `6b6a6d3` API contract, and `563b9f0` tests. The repository has no remote yet; public GitHub publication remains Student C/team work.
- **2026-09-16 — Student A:** Reconciled Trello into distinct A1–A8 cards with complete Goal, Acceptance Criteria, Dependencies, and Blocks fields. All eight were moved to Review / Integration after local verification; none were marked Done. A1 also has a completed Acceptance Criteria checklist as the verification exemplar.
- **2026-09-16 — Student A:** Backend implementation reached review-ready status. Added the FastAPI app, normalized event/incident/relationship models, auth/process/network parsers, deterministic four-stage correlation, sample analysis, JSON Schema export, and 16 behavioral tests. Verification: `ruff check backend` passed; `pytest --cov=app` passed 16/16 with 97% coverage. The API contract remains unchanged.
- **2026-09-16 — Student A:** Trello access confirmed for Peyton T Tran. Reused the existing Traceback project board and moved the three pre-existing aggregate A cards to In Progress while work was active. The connector exposes no member-assignment operation, so no real member assignment is claimed.
- **2026-09-16 — Student A:** Claimed the Student A backend/detection workstream. Initialized backend/API contract work in an otherwise empty workspace. Student B and C paths remain unclaimed by A.

## Current integration status

- Backend: implementation complete; awaiting cross-workstream review/integration (Student A).
- Frontend: awaiting Student B.
- Datasets/CI/Docker/end-to-end QA: awaiting Student C.
- Public GitHub repository: local Git is initialized with scoped commits; no remote/public repository is configured yet.
- Trello: [Traceback — Cyber Incident Timeline Visualizer](https://trello.com/b/i3lpkJwJ/traceback-cyber-incident-timeline-visualizer); A1–A8 are in Review / Integration after verified acceptance criteria.
