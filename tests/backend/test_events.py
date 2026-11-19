import json

from app.services.event_bus import emit_terminal_log


def test_terminal_logs_endpoint(client):
    """Verifies that terminal logs can be retrieved via endpoint."""
    emit_terminal_log("TEST", "Unit test message for terminal logs")
    res = client.get("/api/terminal/logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert any("Unit test message for terminal logs" in item.get("line", "") for item in logs)


def test_sse_stream_initial_handshake(client):
    """Verifies that SSE endpoint initiates with connected event."""
    with client.stream("GET", "/api/events") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        # Read the first event
        for line in response.iter_lines():
            if line.startswith("data:"):
                payload = json.loads(line.replace("data:", "").strip())
                assert payload["event"] == "connected"
                assert payload["status"] == "streaming"
                break
