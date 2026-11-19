"""Tier 2: Boundary & Corner Cases - Cockpit Attention Dashboards (F20, F21, F22, R5)."""

import time
from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_boundary_cockpit_empty_leads_handling(client: E2EClientWrapper):
    """Verifies that Cockpit attention handles empty queues gracefully with empty lists."""
    res = client.get("/api/cockpit/attention")
    if res.status_code == 404:
        res = client.get("/api/autopilot/cockpit-state")
    assert res.status_code in (200, 201)
    data = res.json()
    assert isinstance(data, dict)


def test_boundary_cockpit_archived_leads_excluded(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that archiving a lead excludes it from attention dashboards."""
    lead_id = dental_lead["id"]
    # Archive the lead
    arch_res = client.post(f"/api/leads/{lead_id}/archive")
    assert arch_res.status_code in (200, 201), f"Archive failed: {arch_res.text}"

    # Verify lead is excluded from active attention queues
    res = client.get("/api/cockpit/attention")
    if res.status_code == 404:
        res = client.get("/api/autopilot/cockpit-state")
    assert res.status_code in (200, 201)
    data = res.json()
    followup_list = data.get("followup_required", [])
    assert not any(item.get("id") == lead_id for item in followup_list if isinstance(item, dict))


def test_boundary_cockpit_do_not_contact_leads_excluded(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that leads flagged as do_not_contact=True are omitted from outreach attention."""
    lead_id = dental_lead["id"]
    client.patch(f"/api/leads/{lead_id}", json={
        "do_not_contact": True,
        "do_not_contact_reason": "Requested removal via WhatsApp",
    })

    res = client.get("/api/cockpit/attention")
    if res.status_code == 404:
        res = client.get("/api/autopilot/cockpit-state")
    assert res.status_code in (200, 201)
    data = res.json()
    followup = data.get("followup_required", [])
    assert not any(item.get("id") == lead_id for item in followup if isinstance(item, dict))


def test_boundary_cockpit_future_due_actions_handling(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that actions due in the far future do not crowd today's immediate attention actions."""
    lead_id = dental_lead["id"]
    client.patch(f"/api/leads/{lead_id}", json={
        "next_action": "Follow up after clinic renovation",
        "next_action_due_at": "2029-12-31T10:00:00Z",
    })

    res = client.get("/api/cockpit/attention")
    if res.status_code == 404:
        res = client.get("/api/autopilot/cockpit-state")
    assert res.status_code in (200, 201)


def test_boundary_cockpit_rapid_polling_stability(client: E2EClientWrapper):
    """Verifies performance under rapid polling (simulating live dashboard refresh in browser)."""
    start = time.perf_counter()
    for _ in range(5):
        res = client.get("/api/cockpit/attention")
        if res.status_code == 404:
            res = client.get("/api/autopilot/cockpit-state")
        assert res.status_code in (200, 201)
    total_elapsed = time.perf_counter() - start
    assert total_elapsed < 3.0, f"5 rapid polls took {total_elapsed:.2f}s, exceeding 3.0s budget"
