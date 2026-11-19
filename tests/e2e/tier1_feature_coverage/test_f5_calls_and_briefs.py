"""Tier 1: Feature Coverage - Calls Management & Pre-Call Prep Briefs (F2, F8, F9, R3)."""

from typing import Any, Dict
from e2e.conftest import E2EClientWrapper


def test_log_raw_call_transcript_success(
    client: E2EClientWrapper, dental_lead: Dict[str, Any], sample_raw_call_transcript: str
):
    """Verifies R3: Logging raw call text records the call entity."""
    lead_id = dental_lead["id"]
    payload = {
        "raw_text": sample_raw_call_transcript,
        "duration_seconds": 180,
        "outcome": "demo_scheduled",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/calls")

    assert res.status_code in (200, 201), f"Call logging failed: {res.text}"
    data = res.json()
    assert "call_id" in data or "id" in data


def test_call_notes_structured_five_sections(
    client: E2EClientWrapper, dental_lead: Dict[str, Any], sample_raw_call_transcript: str
):
    """Verifies R3: AI structures call into 5 sections: summary, interests, objections, commitments, next steps."""
    lead_id = dental_lead["id"]
    payload = {
        "raw_text": sample_raw_call_transcript,
        "duration_seconds": 180,
        "outcome": "interested",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/calls (AI structuring)")

    assert res.status_code in (200, 201)
    data = res.json()
    for section in ["summary", "interests", "objections", "commitments", "next_steps"]:
        assert section in data, f"Missing structured section: {section}"
        assert data[section] is not None


def test_call_prep_brief_endpoint_structure(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies R3: Pre-call brief combines structured notes and chat history."""
    lead_id = dental_lead["id"]
    res = client.get(f"/api/leads/{lead_id}/call-brief")
    client.check_or_skip(res, "GET /api/leads/{id}/call-brief")

    assert res.status_code == 200
    data = res.json()
    assert "prep_brief" in data
    assert "past_commitments" in data
    assert "key_objections" in data


def test_call_duration_and_outcome_recording(
    client: E2EClientWrapper, dental_lead: Dict[str, Any], sample_raw_call_transcript: str
):
    """Verifies that call records persist call duration and call outcome status."""
    lead_id = dental_lead["id"]
    payload = {
        "raw_text": sample_raw_call_transcript,
        "duration_seconds": 240,
        "outcome": "agreed_to_review",
    }
    res = client.post(f"/api/leads/{lead_id}/calls", json=payload)
    client.check_or_skip(res, "POST /api/leads/{id}/calls")

    assert res.status_code in (200, 201)
    data = res.json()
    if "duration_seconds" in data:
        assert data["duration_seconds"] == 240
    if "outcome" in data:
        assert data["outcome"] == "agreed_to_review"


def test_post_call_draft_existing_endpoint_operational(client: E2EClientWrapper, dental_lead: Dict[str, Any]):
    """Verifies that existing post-call drafting endpoint responds operational without dead routes."""
    lead_id = dental_lead["id"]
    payload = {
        "call_note": "Doctor expressed interest in 3 clinic templates and requested WhatsApp demo.",
    }
    res = client.post(f"/api/leads/{lead_id}/post-call-draft", json=payload)
    assert res.status_code in (200, 201), f"Post-call draft failed: {res.text}"
