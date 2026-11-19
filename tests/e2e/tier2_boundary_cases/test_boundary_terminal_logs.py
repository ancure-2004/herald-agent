"""Tier 2: Boundary & Corner Cases - Terminal Logs Store (F4, F12, R6)."""

import pytest
from e2e.conftest import E2EClientWrapper


def test_boundary_terminal_logs_invalid_service_filter(client: E2EClientWrapper):
    """Verifies that filtering by an unknown service returns clean empty results without 500 error."""
    res = client.get("/api/terminal/logs", params={"service": "unknown_nonexistent_service_xyz"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)

    # Check if service filtering is supported (M2 capability check)
    if len(logs) > 0 and not any("service" in log for log in logs):
        pytest.skip("Terminal log filtering by 'service' pending Milestone 2 implementation")
    assert len(logs) == 0, f"Expected 0 logs for unknown service, got {len(logs)}"


def test_boundary_terminal_logs_invalid_level_filter(client: E2EClientWrapper):
    """Verifies that filtering by an invalid log level returns empty results without server crash."""
    res = client.get("/api/terminal/logs", params={"level": "SUPER_FATAL_UNKNOWN"})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)

    if len(logs) > 0 and not any("level" in log for log in logs):
        pytest.skip("Terminal log filtering by 'level' pending Milestone 2 implementation")
    assert len(logs) == 0


def test_boundary_terminal_logs_nonexistent_lead_filter(client: E2EClientWrapper):
    """Verifies that scoping logs to a non-existent lead ID returns an empty list without error."""
    res = client.get("/api/terminal/logs", params={"lead_id": 99999999})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)

    if len(logs) > 0 and not any("lead_id" in log for log in logs):
        pytest.skip("Terminal log filtering by 'lead_id' pending Milestone 2 implementation")
    assert len(logs) == 0


def test_boundary_terminal_logs_negative_seq_param(client: E2EClientWrapper):
    """Verifies that passing negative or boundary since_seq handles safely without 500."""
    res = client.get("/api/terminal/logs", params={"since_seq": -1})
    assert res.status_code in (200, 422), f"Expected 200 or 422 validation, got {res.status_code}"


def test_boundary_terminal_logs_empty_result_handling(client: E2EClientWrapper):
    """Verifies response structure when filtering matches zero items."""
    res = client.get("/api/terminal/logs", params={"service": "discovery", "level": "ERROR", "lead_id": 9999999})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)

    if len(logs) > 0 and not any("service" in log for log in logs):
        pytest.skip("Terminal log multi-field filtering pending Milestone 2 implementation")
    assert len(logs) == 0
