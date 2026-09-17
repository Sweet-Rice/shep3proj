import asyncio

import httpx

from app.main import app


def request(method: str, path: str, **kwargs) -> httpx.Response:
    async def send() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(send())


def test_health() -> None:
    response = request("GET", "/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_analyze_known_sample() -> None:
    response = request("POST", "/api/analyze", json={"sample_id": "compromise"})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"events", "incidents", "relationships"}
    assert [event["id"] for event in body["events"]] == [
        f"evt-{index:03d}" for index in range(1, 9)
    ]
    assert body["incidents"][0]["severity"] == "HIGH"
    assert body["incidents"][0]["stages"] == [
        "brute_force",
        "account_compromise",
        "suspicious_execution",
        "possible_exfiltration",
    ]


def test_empty_records_is_a_valid_empty_analysis() -> None:
    response = request("POST", "/api/analyze", json={"records": []})
    assert response.status_code == 200
    assert response.json() == {"events": [], "incidents": [], "relationships": []}


def test_exactly_one_input_is_required() -> None:
    assert request("POST", "/api/analyze", json={}).status_code == 422
    assert (
        request(
            "POST",
            "/api/analyze",
            json={"sample_id": "compromise", "records": []},
        ).status_code
        == 422
    )


def test_unknown_sample_is_controlled() -> None:
    response = request("POST", "/api/analyze", json={"sample_id": "does-not-exist"})
    assert response.status_code == 404
    assert "unknown sample dataset" in response.json()["detail"]


def test_malformed_source_record_is_controlled() -> None:
    response = request(
        "POST",
        "/api/analyze",
        json={"records": [{"source": "auth", "timestamp": "not-a-date"}]},
    )
    assert response.status_code == 422
    assert "record 1" in response.json()["detail"]
