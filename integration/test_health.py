import requests


def test_health_endpoint(api_base_url: str) -> None:
    response = requests.get(f"{api_base_url}/api/health", timeout=5)
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_analyze_rejects_ambiguous_payload(api_base_url: str) -> None:
    """The frozen contract (AGENTS.md) requires exactly one of sample_id/records."""
    response = requests.post(f"{api_base_url}/api/analyze", json={}, timeout=5)
    assert response.status_code == 422

    response = requests.post(
        f"{api_base_url}/api/analyze",
        json={"sample_id": "compromise", "records": []},
        timeout=5,
    )
    assert response.status_code == 422
