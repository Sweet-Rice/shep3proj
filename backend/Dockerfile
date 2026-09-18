# Build context is the repository root (see docker-compose.yml) so the
# image layout mirrors the local dev layout: app/services/analyzer.py
# walks up three parents to find /repo/datasets, exactly as it does when
# run directly from a repo checkout.
FROM python:3.12-slim

WORKDIR /repo

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY datasets/ datasets/

WORKDIR /repo/backend

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health').read()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
