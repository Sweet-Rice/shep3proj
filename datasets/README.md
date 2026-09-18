# Synthetic datasets (Student C)

All telemetry here is synthetic — no real hosts, users, or IPs. Each dataset
doubles as an API fixture (`POST /api/analyze {"sample_id": "<name>"}`, see
`backend/app/services/analyzer.py::_sample_paths`, which checks this
directory before the backend's own bundled `app/samples/`) and as a
regression fixture for the integration harness in `integration/`.

## Datasets

| Dataset | Scenario | Expected result |
|---|---|---|
| `benign-baseline.json` | Normal logins, an ordinary process, small transfers, plus one isolated failed login that never repeats | 0 incidents, 0 relationships — proves the engine doesn't over-fire on noise |
| `brute-force-only.json` | 5 failed logins in a tight window, no follow-up success | 1 incident, `brute_force` stage only, `MEDIUM` severity, score 2 |
| `full-kill-chain.json` | Brute force → successful login → suspicious process (`wget`) → large outbound transfer, distinct actors/host from the bundled `compromise` sample | 1 incident, all four stages, `HIGH` severity, score 5 |

Each has a paired fixture in `expected/<name>.expected.json`, containing the
exact `AnalysisResponse` (`events`, `incidents`, `relationships`) the backend
must produce for that dataset.

## Expected outcomes are generated, not hand-written

`generate_expected.py` runs each dataset through the real
`normalize_records` + `correlate_incidents` pipeline (the same code the API
uses) and writes the result to `expected/`. This means the fixtures can
never silently drift from actual backend behavior — if the detection engine
changes, regenerate and review the diff:

```bash
backend/.venv/bin/python datasets/generate_expected.py   # macOS/Linux venv
backend/.venv/Scripts/python.exe datasets/generate_expected.py  # Windows venv
```

## How these get verified

`integration/test_datasets.py` posts every `datasets/*.json` file to a
running backend (`API_BASE_URL`, default `http://localhost:8000`) and
asserts the response matches its `expected/*.expected.json` byte-for-byte
(modulo key order). This is the acceptance check for C1, and it runs as
part of the C3 integration harness and in CI (see
`.github/workflows/ci.yml`).
