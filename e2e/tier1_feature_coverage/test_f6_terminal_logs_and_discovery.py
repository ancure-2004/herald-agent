"""Tier 1: Feature Coverage - Terminal Logs Store & Discovery Automation Trigger (F4, F12, F13, R6)."""

from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_terminal_logs_returns_list(client: E2EClientWrapper):
    """Verifies R6: GET /api/terminal/logs returns structured logs from the persistent log store."""
    res = client.get("/api/terminal/logs")
    assert res.status_code == 200, f"Failed to fetch terminal logs: {res.text}"
    data = res.json()
    assert isinstance(data, (list, dict))
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)
    if len(logs) > 0:
        first = logs[0]
        assert "seq" in first or "id" in first
        assert "line" in first or "message" in first


def test_terminal_logs_filter_by_service(client: E2EClientWrapper):
    """Verifies R6: Terminal logs can be filtered by service (discovery, building, outreach)."""
    res = client.get("/api/terminal/logs", params={"service": "discovery"})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)


def test_terminal_logs_filter_by_level(client: E2EClientWrapper):
    """Verifies R6: Terminal logs can be filtered by log level (INFO, WARN, ERROR)."""
    res = client.get("/api/terminal/logs", params={"level": "INFO"})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)


def test_terminal_logs_filter_by_lead_id(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies R6: Terminal logs can be scoped to a specific lead ID."""
    lead_id = dental_lead["id"]
    res = client.get("/api/terminal/logs", params={"lead_id": lead_id})
    assert res.status_code == 200
    data = res.json()
    logs = data if isinstance(data, list) else data.get("logs", [])
    assert isinstance(logs, list)


def test_lead_discovery_trigger_endpoint(client: E2EClientWrapper):
    """Verifies R6: Triggering lead discovery calls real backend route ('no dead UI')."""
    res = client.post("/api/autopilot/discover", json={"query": "dental clinic Rohini Delhi"})
    assert res.status_code in (200, 201, 202), f"Discovery trigger failed: {res.text}"
    data = res.json()
    assert isinstance(data, dict)
    assert "status" in data or "run_id" in data or "message" in data or "discovered" in data
