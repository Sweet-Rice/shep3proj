# Traceback backend

The FastAPI backend converts synthetic source records into one normalized event schema, then reconstructs incidents with deterministic rules. It requires Python 3.12 or newer.

## Run locally

From the repository root:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
cd backend
../.venv/bin/uvicorn app.main:app --reload
```

The service listens on `http://localhost:8000`. Interactive OpenAPI documentation is available at `/docs`.

## API

- `GET /api/health` returns `{"status":"healthy"}`.
- `POST /api/analyze` accepts either `{"sample_id":"compromise"}` or `{"records":[...]}`.
- Responses always contain `events`, `incidents`, and `relationships` arrays.

The authoritative human-readable contract is in `docs/api-contract.md`; `docs/api-contract.json` contains generated JSON Schemas, and `docs/sample-analysis.json` is a frontend-ready example response.

## Verification

```bash
.venv/bin/ruff check backend
cd backend
../.venv/bin/pytest --cov=app --cov-report=term-missing
```

The bundled attack sample must yield one `HIGH` incident with `brute_force`, `account_compromise`, `suspicious_execution`, and `possible_exfiltration` stages.

