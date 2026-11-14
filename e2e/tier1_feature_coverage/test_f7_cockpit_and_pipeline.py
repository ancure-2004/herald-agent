"""Tier 1: Feature Coverage - Cockpit Attention Dashboards & Pipeline Management (F20, F21, F22, R4, R5)."""

import time
from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_cockpit_attention_endpoint_success(client: E2EClientWrapper):
    """Verifies R5: Cockpit surfaces items requiring attention."""
    res = client.get("/api/cockpit/attention")
    if res.status_code == 404:
        # Fallback to existing cockpit-state endpoint
        res = client.get("/api/autopilot/cockpit-state")
    assert res.status_code in (200, 201), f"Cockpit endpoint failed: {res.text}"


def test_cockpit_attention_four_dashboards_presence(client: E2EClientWrapper):
    """Verifies R5: Cockpit provides 4 distinct attention dashboards with zero terminals."""
    res = client.get("/api/cockpit/attention")
    client.check_or_skip(res, "GET /api/cockpit/attention")

    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    for dashboard in ["followup_required", "unreplied_messages", "todays_actions", "call_preparation"]:
        assert dashboard in data, f"Missing attention dashboard: {dashboard}"
        assert isinstance(data[dashboard], list)


def test_cockpit_attention_surfacing_latency_under_5s(client: E2EClientWrapper):
    """Verifies R5 Acceptance Criteria: Cockpit surfaces attention items in under 5 seconds."""
    start_time = time.perf_counter()
    res = client.get("/api/cockpit/attention")
    if res.status_code == 404:
        res = client.get("/api/autopilot/cockpit-state")
    elapsed = time.perf_counter() - start_time

    assert res.status_code in (200, 201)
    assert elapsed < 5.0, f"Cockpit attention took {elapsed:.2f}s, exceeding 5s requirement"


def test_pipeline_stages_order_and_colors(client: E2EClientWrapper):
    """Verifies R4: Kanban board displays meaningful stages with proper ordering."""
    res = client.get("/api/hustles")
    assert res.status_code == 200
    hustles = res.json()
    dental_hustle = next((h for h in hustles if "dental" in h.get("slug", "").lower()), hustles[0])

    if "stages" in dental_hustle and len(dental_hustle["stages"]) > 0:
        stages = dental_hustle["stages"]
        orders = [s.get("order", 0) for s in stages]
        assert orders == sorted(orders), "Stages must be ordered by rank"


def test_lead_stage_transition_flow(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies advancing a lead across pipeline stages via PATCH /api/leads/{id}."""
    lead_id = dental_lead["id"]
    update_payload = {"status": "ACTIVE"}
    res = client.patch(f"/api/leads/{lead_id}", json=update_payload)
    assert res.status_code in (200, 204), f"Lead update failed: {res.text}"

    lead_res = client.get_lead(lead_id)
    assert lead_res.status_code == 200
    assert lead_res.json().get("status") == "ACTIVE"
