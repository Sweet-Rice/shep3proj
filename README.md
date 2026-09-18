# Traceback — Cyber Incident Timeline Visualizer

Normalizes synthetic authentication, process, and network telemetry,
applies deterministic correlation rules, and returns a timeline plus graph
of the reconstructed incident. See `AGENTS.md` for ownership boundaries and
the frozen API contract.

- `backend/` — FastAPI service (Student A). See `backend/README.md`.
- `frontend/` — React/Vite UI (Student B). See `frontend/README.md`.
- `datasets/` — synthetic fixtures + expected outcomes (Student C). See
  `datasets/README.md`.
- `integration/` — root-level tests against the live, deployed stack
  (Student C). See `integration/README.md`.
- `docs/` — the frozen API contract and generated schemas.

## Run the full stack

```bash
docker compose up --build
```

- Backend: http://localhost:8000 (docs at `/docs`)
- Frontend: http://localhost:5173

## Verify a release/demo candidate

```bash
./scripts/run-integration.sh
```

Builds both Docker images, brings the backend up, runs the root
integration suite against it (including every synthetic dataset in
`datasets/`), brings the frontend up and health-checks the production
build, then runs the frontend's live browser test against the real
backend. This is the same sequence CI runs on every push (see
`.github/workflows/ci.yml`).
