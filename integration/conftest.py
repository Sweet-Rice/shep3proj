import os
import time

import pytest
import requests

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173")


def _wait_until_healthy(url: str, timeout_seconds: float = 60.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            response = requests.get(url, timeout=3)
            if response.ok:
                return
        except requests.RequestException as exc:
            last_error = exc
        time.sleep(1)
    raise RuntimeError(f"{url} did not become healthy within {timeout_seconds}s") from last_error


@pytest.fixture(scope="session", autouse=True)
def backend_is_healthy() -> None:
    """Gate the whole session on the stack actually being up.

    Running against a stack that never started would otherwise fail every
    test with a confusing connection-refused error instead of one clear
    message.
    """
    _wait_until_healthy(f"{API_BASE_URL}/api/health")


@pytest.fixture(scope="session")
def api_base_url() -> str:
    return API_BASE_URL
