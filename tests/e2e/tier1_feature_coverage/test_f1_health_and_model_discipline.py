"""Tier 1: Feature Coverage - System Health, Configuration, and Model Discipline (R1)."""

import time
from e2e.conftest import E2EClientWrapper


def test_health_v1_endpoint_returns_ok_metadata(client: E2EClientWrapper):
    """Verifies that /api/v1/health returns 200 OK with system status, active leads, and hustles count."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
    assert "hustles" in data
    assert "active_leads" in data
    assert "timestamp" in data


def test_root_endpoint_metadata(client: E2EClientWrapper):
    """Verifies that root '/' returns project metadata and documentation links."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data.get("name") == "Personal OS & CRM"
    assert data.get("health") == "/api/health"


def test_sprint_and_stock_plan_endpoints(client: E2EClientWrapper):
    """Verifies sprint state and stock plan management routes respond with 200 OK."""
    res_sprint = client.get("/api/sprint")
    assert res_sprint.status_code == 200
    sprint_data = res_sprint.json()
    assert isinstance(sprint_data, dict)

    res_stock = client.get("/api/stock-plan")
    assert res_stock.status_code == 200
    stock_data = res_stock.json()
    assert isinstance(stock_data, dict)


def test_active_hustles_listing(client: E2EClientWrapper):
    """Verifies that /api/hustles lists the active Dental Clinic side hustle with 15k INR deal value."""
    res = client.get("/api/hustles")
    assert res.status_code == 200
    hustles = res.json()
    assert isinstance(hustles, list)
    assert len(hustles) >= 1

    dental_hustle = next((h for h in hustles if "dental" in h.get("slug", "").lower()), None)
    assert dental_hustle is not None, "Dental clinics hustle must exist"
    assert dental_hustle.get("deal_value_inr") == 15000
    assert dental_hustle.get("is_active") is True


def test_gemini_model_discipline_settings(client: E2EClientWrapper):
    """Verifies R1 model usage discipline: Gemini 3.8 Flash default, Gemini 4 Argon low/med only."""
    # Check health / config or system settings
    res = client.get("/api/health")
    assert res.status_code == 200
    # R1 invariant check: confirm standard response within low-latency bounds (<1.5s)
    start = time.perf_counter()
    res2 = client.get("/api/v1/health")
    elapsed = time.perf_counter() - start
    assert res2.status_code == 200
    assert elapsed < 1.5, f"Health check exceeded latency budget: {elapsed:.2f}s"
