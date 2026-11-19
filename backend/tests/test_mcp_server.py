import json
from datetime import datetime, timedelta, timezone
import pytest
from app.models.entities import Lead
import mcp_server as mcp


def test_mcp_tools_list():
    """Verify all 11 MCP tools are exposed with correct schemas and legacy agent tools are removed."""
    req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
    }
    resp = mcp.handle_request(req)
    assert resp is not None
    assert resp["id"] == 1
    tools = resp["result"]["tools"]
    names = [t["name"] for t in tools]
    
    expected = [
        "add_lead",
        "bulk_add_leads",
        "send_message",
        "log_call",
        "run_discovery",
        "run_demo_factory",
        "run_batch_outreach",
        "list_leads",
        "get_lead_dossier",
        "move_lead_stage",
        "get_lead_activity",
    ]
    assert sorted(names) == sorted(expected)

    # Obsolete tools must be removed
    assert "run_scout_agent" not in names
    assert "run_auditor_agent" not in names
    assert "run_closer_agent" not in names
    assert "run_refill_batch" not in names


def test_mcp_initialize():
    """Verify MCP initialize handshake returns server info and protocol version."""
    req = {
        "jsonrpc": "2.0",
        "id": 10,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0"},
        },
    }
    resp = mcp.handle_request(req)
    assert resp["result"]["protocolVersion"] == "2024-11-05"
    assert resp["result"]["serverInfo"]["name"] == "firstmate-crm-mcp"
    assert resp["result"]["serverInfo"]["version"] == "2.0.0"


def test_mcp_add_and_list_leads(client, monkeypatch):
    """Verify adding a lead via MCP tool and listing it back."""
    monkeypatch.setattr(mcp, "SessionLocal", client.get_db_session)

    # Call add_lead
    add_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "add_lead",
            "arguments": {
                "name": "Apex Dental Clinic Hauz Khas",
                "doctor_name": "Dr. Sameer Khan",
                "locality": "Hauz Khas",
                "primary_phone": "+919999000001",
                "deal_value_inr": 35000,
            },
        },
    }
    resp = mcp.handle_request(add_req)
    assert resp is not None
    assert resp.get("error") is None
    data = json.loads(resp["result"]["content"][0]["text"])
    assert data.get("ok") is True
    lead_id = data["lead_id"]
    assert data["name"] == "Apex Dental Clinic Hauz Khas"

    # List leads filtering by search
    list_req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "list_leads",
            "arguments": {
                "search": "Apex Dental",
            },
        },
    }
    list_resp = mcp.handle_request(list_req)
    list_data = json.loads(list_resp["result"]["content"][0]["text"])
    assert list_data["count"] >= 1
    matched = [l for l in list_data["leads"] if l["id"] == lead_id]
    assert len(matched) == 1
    assert matched[0]["doctor_name"] == "Dr. Sameer Khan"


def test_mcp_bulk_add_leads(client, monkeypatch):
    """Verify bulk adding leads with deduplication."""
    monkeypatch.setattr(mcp, "SessionLocal", client.get_db_session)

    req = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "bulk_add_leads",
            "arguments": {
                "leads": [
                    {
                        "name": "Bulk Clinic One",
                        "doctor_name": "Dr. Alpha",
                        "locality": "Rohini",
                        "primary_phone": "+919999000002",
                    },
                    {
                        "name": "Bulk Clinic Two",
                        "doctor_name": "Dr. Beta",
                        "locality": "Pitampura",
                        "primary_phone": "+919999000003",
                    },
                    {
                        "name": "Bulk Clinic Duplicate",
                        "doctor_name": "Dr. Alpha Again",
                        "locality": "Rohini",
                        "primary_phone": "+919999000002",  # duplicate phone
                    },
                ],
            },
        },
    }
    resp = mcp.handle_request(req)
    data = json.loads(resp["result"]["content"][0]["text"])
    assert data["ok"] is True
    assert data["total_input"] == 3
    assert data["created_count"] == 2
    assert data["skipped_count"] == 1
    assert "Duplicate blocked" in data["skipped"][0]["reason"]


def test_mcp_send_message_safety(client, monkeypatch):
    """Verify send_message safety gate: requires confirmed=True to transmit."""
    monkeypatch.setattr(mcp, "SessionLocal", client.get_db_session)
    session = client.get_db_session()
    try:
        lead = Lead(
            hustle_id=1,
            stage_id=1,
            slug="safety-test-dental-clinic",
            name="Safety Test Dental Clinic",
            doctor_name="Dr. Safety",
            locality="Saket",
            primary_phone="+919999000004",
            status="STAGED",
            next_action="Send initial pitch",
            next_action_due_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
        session.add(lead)
        session.commit()
        session.refresh(lead)
        target_lead_id = lead.id
    finally:
        session.close()

    # 1. Unconfirmed attempt -> pending confirmation
    unconfirmed_req = {
        "jsonrpc": "2.0",
        "id": 5,
        "method": "tools/call",
        "params": {
            "name": "send_message",
            "arguments": {
                "lead_id": target_lead_id,
                "text": "Hello Dr. Safety, this is a pitch.",
                "channel": "whatsapp",
                "confirmed": False,
            },
        },
    }
    resp1 = mcp.handle_request(unconfirmed_req)
    data1 = json.loads(resp1["result"]["content"][0]["text"])
    assert data1["requires_confirmation"] is True
    assert data1["status"] == "pending_confirmation"
    assert "Please confirm sending" in data1["message"]

    # 2. Confirmed attempt -> sent
    confirmed_req = {
        "jsonrpc": "2.0",
        "id": 6,
        "method": "tools/call",
        "params": {
            "name": "send_message",
            "arguments": {
                "lead_id": target_lead_id,
                "text": "Hello Dr. Safety, this is a pitch.",
                "channel": "whatsapp",
                "confirmed": True,
            },
        },
    }
    resp2 = mcp.handle_request(confirmed_req)
    data2 = json.loads(resp2["result"]["content"][0]["text"])
    assert data2["requires_confirmation"] is False
    assert data2["status"] == "sent"


def test_mcp_log_call_and_activity(client, monkeypatch):
    """Verify logging a call and reading it through get_lead_activity."""
    monkeypatch.setattr(mcp, "SessionLocal", client.get_db_session)
    session = client.get_db_session()
    try:
        lead = Lead(
            hustle_id=1,
            stage_id=1,
            slug="call-activity-test-clinic",
            name="Call Activity Test Clinic",
            doctor_name="Dr. Activity",
            locality="Dwarka",
            primary_phone="+919999000005",
            status="STAGED",
            next_action="Review call outcome",
            next_action_due_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
        session.add(lead)
        session.commit()
        session.refresh(lead)
        target_lead_id = lead.id
    finally:
        session.close()

    # Log call
    call_req = {
        "jsonrpc": "2.0",
        "id": 7,
        "method": "tools/call",
        "params": {
            "name": "log_call",
            "arguments": {
                "lead_id": target_lead_id,
                "raw_text": "Spoke to Dr. Activity. He liked the modern demo and asked for pricing details.",
                "duration_seconds": 150,
                "outcome": "connected",
            },
        },
    }
    call_resp = mcp.handle_request(call_req)
    call_data = json.loads(call_resp["result"]["content"][0]["text"])
    assert call_data["success"] is True
    assert call_data["lead_id"] == target_lead_id

    # Get lead activity
    act_req = {
        "jsonrpc": "2.0",
        "id": 8,
        "method": "tools/call",
        "params": {
            "name": "get_lead_activity",
            "arguments": {
                "lead_id": target_lead_id,
            },
        },
    }
    act_resp = mcp.handle_request(act_req)
    act_data = json.loads(act_resp["result"]["content"][0]["text"])
    assert act_data["lead_id"] == target_lead_id
    assert act_data["counts"]["calls"] >= 1
    assert "pricing" in act_data["calls"][0]["raw_text"]


def test_mcp_move_lead_stage(client, monkeypatch):
    """Verify move_lead_stage updates stage_id and canonical status atomically."""
    monkeypatch.setattr(mcp, "SessionLocal", client.get_db_session)
    session = client.get_db_session()
    try:
        lead = Lead(
            hustle_id=1,
            stage_id=1,
            slug="stage-move-test-clinic",
            name="Stage Move Test Clinic",
            doctor_name="Dr. Stage",
            locality="Rohini",
            primary_phone="+919999000006",
            status="STAGED",
            next_action="Prepare proposal",
            next_action_due_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
        session.add(lead)
        session.commit()
        session.refresh(lead)
        target_lead_id = lead.id
    finally:
        session.close()

    # Move to stage 2
    req = {
        "jsonrpc": "2.0",
        "id": 9,
        "method": "tools/call",
        "params": {
            "name": "move_lead_stage",
            "arguments": {
                "lead_id": target_lead_id,
                "stage_id": 2,
                "next_action": "Follow up after demo review",
            },
        },
    }
    resp = mcp.handle_request(req)
    data = json.loads(resp["result"]["content"][0]["text"])
    assert data["ok"] is True
    assert data["lead_id"] == target_lead_id
    assert data["new_stage_id"] == 2
    assert data["next_action"] == "Follow up after demo review"


def test_mcp_get_lead_dossier(client, monkeypatch):
    """Verify get_lead_dossier returns full lead profile."""
    monkeypatch.setattr(mcp, "SessionLocal", client.get_db_session)
    session = client.get_db_session()
    try:
        lead = Lead(
            hustle_id=1,
            stage_id=1,
            slug="dossier-test-clinic",
            name="Dossier Test Clinic",
            doctor_name="Dr. Dossier",
            locality="Greater Kailash",
            primary_phone="+919999000007",
            status="STAGED",
            deal_value_inr=50000,
            next_action="Initial review",
            next_action_due_at=datetime.now(timezone.utc) + timedelta(days=2),
        )
        session.add(lead)
        session.commit()
        session.refresh(lead)
        target_lead_id = lead.id
    finally:
        session.close()

    req = {
        "jsonrpc": "2.0",
        "id": 11,
        "method": "tools/call",
        "params": {
            "name": "get_lead_dossier",
            "arguments": {
                "lead_id": target_lead_id,
            },
        },
    }
    resp = mcp.handle_request(req)
    data = json.loads(resp["result"]["content"][0]["text"])
    assert data["id"] == target_lead_id
    assert data["name"] == "Dossier Test Clinic"
    assert data["deal_value_inr"] == 50000
    assert "facts" in data
    assert "packages" in data
