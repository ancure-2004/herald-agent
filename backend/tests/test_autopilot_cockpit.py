from fastapi.testclient import TestClient

from app.services.event_bus import (
    emit_pipeline_step,
    get_pipeline_state,
    set_autopilot_running,
)


def test_get_cockpit_state_endpoint(client: TestClient):
    response = client.get("/api/autopilot/cockpit-state")
    assert response.status_code == 200
    data = response.json()

    assert "is_running" in data
    assert "nodes" in data
    assert "metrics" in data
    assert len(data["nodes"]) == 6

    step_names = [n["name"] for n in data["nodes"]]
    assert step_names == [
        "DISCOVERY",
        "VERIFICATION",
        "DEEP RESEARCH",
        "NEXT.JS BUILD",
        "WALKTHROUGH",
        "REVIEW TRAY",
    ]

    for node in data["nodes"]:
        assert "id" in node
        assert "stepNumber" in node
        assert "name" in node
        assert "status" in node
        assert "badge" in node
        assert "payload" in node
        assert isinstance(node["payload"], list)


def test_pipeline_step_event_emission():
    set_autopilot_running(True, run_id=101)
    state = get_pipeline_state()
    assert state["is_running"] is True
    assert state["current_run_id"] == 101

    event = emit_pipeline_step(
        node_id="node-2",
        step_name="VERIFICATION",
        status="RUNNING",
        clinic_name="Dr Test Dental",
        latency_ms=350,
        metrics={"processed": 2, "total": 5, "badge_text": "2/5 Verified"},
        payload=[{"clinic": "Dr Test Dental", "status": "PASSED"}],
    )

    assert event["node_id"] == "node-2"
    assert event["step_name"] == "VERIFICATION"
    assert event["status"] == "RUNNING"
    assert event["clinic_name"] == "Dr Test Dental"

    state_after = get_pipeline_state()
    assert state_after["active_node_id"] == "node-2"
    assert "node-2" in state_after["nodes"]

    set_autopilot_running(False)
    state_final = get_pipeline_state()
    assert state_final["is_running"] is False
    assert state_final["active_node_id"] is None
