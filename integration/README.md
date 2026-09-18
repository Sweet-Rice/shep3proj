# Root-level integration tests (Student C)

These tests run against a **live** backend (a real HTTP server — the
Docker container or a local `uvicorn` process), not an in-process test
client. They are the acceptance check for C1 and the "does everything
actually talk to everything else" check for C2.

- `test_datasets.py` — posts every `datasets/*.json` fixture two ways
  (`{"records": [...]}` and `{"sample_id": "<name>"}`) and diffs the
  response against `datasets/expected/*.expected.json`.
- `test_health.py` — health endpoint and the frozen "exactly one of
  sample_id/records" contract rule.
- `test_compromise_sample.py` — regression check for the bundled
  `compromise` sample's documented acceptance criterion (one `HIGH`
  incident, all four stages).

## Running locally

The full harness (Docker build, backend, frontend, and the browser-driven
live test) is one command:

```bash
./scripts/run-integration.sh
```

To run just this pytest suite against a backend you already have running
(e.g. `uvicorn app.main:app` from `backend/`, or `docker compose up backend`):

```bash
python -m venv .venv
.venv/bin/pip install -r integration/requirements.txt
API_BASE_URL=http://localhost:8000 .venv/bin/pytest integration -v
```
