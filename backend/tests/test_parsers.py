import pytest

from app.parsers import RecordNormalizationError, normalize_records


def test_auth_records_normalize_and_sort() -> None:
    records = [
        {
            "timestamp": "2026-09-16T12:02:00+00:00",
            "source": "auth",
            "action": "success",
            "account": "admin",
            "remote_ip": "10.2.4.18",
            "target_host": "web-01",
        },
        {
            "timestamp": "2026-09-16T12:01:00Z",
            "category": "auth",
            "result": "failed",
            "user": "admin",
            "src_ip": "10.2.4.18",
            "host": "web-01",
        },
    ]

    events = normalize_records(records)

    assert [event.event_type for event in events] == ["login_failure", "login_success"]
    assert events[0].timestamp.isoformat() == "2026-09-16T12:01:00+00:00"
    assert events[0].raw


def test_process_and_network_records_normalize() -> None:
    records = [
        {
            "timestamp": "2026-09-16T12:04:00Z",
            "source": "process",
            "image": "python",
            "command": "python -c 'print(1)'",
            "username": "admin",
            "hostname": "web-01",
        },
        {
            "timestamp": "2026-09-16T12:05:00Z",
            "source": "network",
            "destination_ip": "198.51.100.24",
            "source_host": "web-01",
            "bytes_sent": "1024",
            "marked_destination": True,
        },
    ]

    process, network = normalize_records(records)

    assert process.process == "python"
    assert process.metadata["command_line"].startswith("python -c")
    assert network.event_type == "network_transfer"
    assert network.bytes_out == 1024
    assert network.metadata["demo_destination"] is True


@pytest.mark.parametrize(
    "record, message",
    [
        ({"timestamp": "2026-09-16T12:00:00Z", "source": "unknown"}, "source/category"),
        (
            {
                "timestamp": "2026-09-16T12:00:00",
                "source": "auth",
                "action": "failed",
                "user": "admin",
                "src_ip": "10.2.4.18",
            },
            "timezone",
        ),
    ],
)
def test_malformed_records_produce_indexed_error(record: dict, message: str) -> None:
    with pytest.raises(RecordNormalizationError, match=message) as error:
        normalize_records([record])
    assert "record 1" in str(error.value)


def test_duplicate_event_ids_are_rejected() -> None:
    record = {
        "id": "evt-repeated",
        "timestamp": "2026-09-16T12:00:00Z",
        "source": "auth",
        "action": "failed",
        "user": "admin",
        "src_ip": "10.2.4.18",
    }
    with pytest.raises(RecordNormalizationError, match="duplicate event id"):
        normalize_records([record, record])

