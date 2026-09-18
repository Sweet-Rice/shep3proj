#!/usr/bin/env bash
# End-to-end integration harness (C3): builds and starts the real Docker
# images (C2), then verifies the synthetic datasets (C1) and the frontend
# against the live stack. This is what CI runs; run it the same way locally
# before pushing.
#
# Note on sequencing: frontend/tests/live (via playwright.live.config.ts)
# starts its own Vite dev server on :5173 to drive the browser against the
# real backend. That collides with the Dockerized frontend container also
# bound to :5173, so the production frontend container is health-checked
# and stopped again before the live browser test claims the port.
set -euo pipefail
cd "$(dirname "$0")/.."

cleanup() {
  echo "--- docker compose logs (last 100 lines) ---"
  docker compose logs --tail=100 || true
  docker compose down -v --remove-orphans || true
}
trap cleanup EXIT

echo "--- building and starting backend ---"
docker compose up -d --build backend

echo "--- waiting for backend health ---"
timeout 60 bash -c 'until curl -sf http://localhost:8000/api/health > /dev/null; do sleep 2; done'

echo "--- running root integration tests: C1 datasets, health, frozen contract ---"
python -m venv .integration-venv
VENV_BIN=.integration-venv/bin
[ -d "$VENV_BIN" ] || VENV_BIN=.integration-venv/Scripts
"$VENV_BIN/pip" install -q -r integration/requirements.txt
"$VENV_BIN/pytest" integration -v

echo "--- building and starting the production frontend container ---"
docker compose up -d --build frontend

echo "--- waiting for frontend health ---"
timeout 60 bash -c 'until curl -sf http://localhost:5173 > /dev/null; do sleep 2; done'
echo "frontend container is serving the production build correctly"

echo "--- stopping the frontend container to free :5173 for the live browser test ---"
docker compose stop frontend

echo "--- running frontend live end-to-end test against the real backend ---"
npm ci --prefix frontend
npx --prefix frontend playwright install --with-deps chromium
npm run --prefix frontend test:live

echo "--- integration harness passed ---"
