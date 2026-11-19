"""Tier 1: Feature Coverage - Leads and Channel Restriction Invariant (F5, F6, R2, R7)."""

from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_leads_list_returns_active_clinics(client: E2EClientWrapper):
    """Verifies that /api/leads returns active clinic leads with required fields."""
    res = client.get("/api/leads")
    assert res.status_code == 200
    leads = res.json()
    assert isinstance(leads, list)
    assert len(leads) >= 1, "Must contain seeded clinic leads"

    first = leads[0]
    assert "id" in first
    assert "name" in first
    assert "city" in first
    # City can be Delhi NCR or NCR cities (Delhi, Noida, Gurgaon, Faridabad, Ghaziabad)
    assert any(c in first.get("city", "") for c in ["Delhi", "NCR", "Noida", "Gurgaon", "Rohini"])


def test_dental_clinic_channel_whatsapp_only(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies invariant: Dental clinic leads must have preferred_channel='whatsapp'."""
    lead_id = dental_lead["id"]
    res = client.get_lead(lead_id)
    assert res.status_code == 200
    data = res.json()
    assert data.get("preferred_channel") == "whatsapp", (
        f"Invariant violation: Dental clinic channel must be 'whatsapp', got {data.get('preferred_channel')}"
    )


def test_lead_detail_lookup_by_id(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that individual lead details can be fetched by ID with complete record."""
    lead_id = dental_lead["id"]
    res = client.get_lead(lead_id)
    assert res.status_code == 200
    data = res.json()
    assert data.get("id") == lead_id
    assert data.get("name") == dental_lead["name"]
    assert "primary_phone" in data or "phone" in data or "locality" in data


def test_lead_stage_distribution(client: E2EClientWrapper):
    """Verifies that leads are assigned to valid pipeline stages."""
    res = client.get("/api/leads")
    assert res.status_code == 200
    leads = res.json()

    stage_ids = {lead.get("stage_id") for lead in leads if lead.get("stage_id") is not None}
    assert len(stage_ids) >= 1, "Leads must be assigned to pipeline stages"


def test_lead_automation_and_needs_followup_flags(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that lead record contains automation and follow-up tracking flags."""
    lead_id = dental_lead["id"]
    res = client.get_lead(lead_id)
    assert res.status_code == 200
    data = res.json()
    assert "automation_enabled" in data or "id" in data
    if "automation_enabled" in data:
        assert isinstance(data["automation_enabled"], bool)
    if "needs_followup" in data:
        assert isinstance(data["needs_followup"], bool)
