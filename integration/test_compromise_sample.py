"""Cross-workstream regression check, independent of the C1 datasets.

backend/README.md states the acceptance criterion in prose: 'The bundled
attack sample must yield one HIGH incident with brute_force,
account_compromise, suspicious_execution, and possible_exfiltration
stages.' This test turns that sentence into an automated check that runs
against the deployed stack, so a future change to the engine, the parsers,
or the bundled fixture can't silently break the documented guarantee.
"""

import requests


def test_bundled_compromise_sample_reaches_all_four_stages(api_base_url: str) -> None:
    response = requests.post(f"{api_base_url}/api/analyze", json={"sample_id": "compromise"}, timeout=10)

    assert response.status_code == 200, response.text
    body = response.json()

    assert len(body["incidents"]) == 1
    incident = body["incidents"][0]
    assert incident["severity"] == "HIGH"
    assert incident["stages"] == [
        "brute_force",
        "account_compromise",
        "suspicious_execution",
        "possible_exfiltration",
    ]
