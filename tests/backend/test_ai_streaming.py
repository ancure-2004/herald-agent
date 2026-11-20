import json
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.services.ai_service import AIService, LLMProvider
from app.services.assistant_service import AssistantService


class MockStreamingProvider(LLMProvider):
    def __init__(self, answer: str = "This is a streaming test response from Herald AI."):
        self.answer = answer

    def generate_json(self, prompt: str, json_schema=None, timeout_seconds: float = 30.0):
        return {"answer": self.answer}

    def generate_stream(self, prompt: str, system_instruction=None, timeout_seconds: float = 30.0):
        words = self.answer.split(" ")
        for i, w in enumerate(words):
            yield w + (" " if i < len(words) - 1 else "")

    def test_connection(self):
        return {"ok": True, "provider": "mock_streaming"}


@pytest.fixture
def client():
    return TestClient(app)


def test_ai_service_generate_stream():
    provider = MockStreamingProvider("Alpha Beta Gamma")
    chunks = list(AIService.generate_stream("prompt", provider=provider))
    assert "".join(chunks) == "Alpha Beta Gamma"


def test_assistant_stream_ask_or_do(client, monkeypatch):
    mock_provider = MockStreamingProvider("Grounded assistant stream response.")
    monkeypatch.setattr(AIService, "get_provider", lambda db=None: mock_provider)

    # Test via AssistantService directly
    events = list(AssistantService.stream_ask_or_do(None, {"prompt": "What is Herald?", "mode": "ask"}))
    assert len(events) >= 2  # At least tokens + done event

    has_token = any("event: token" in e for e in events)
    has_done = any("event: done" in e for e in events)
    assert has_token
    assert has_done


def test_api_assistant_stream_endpoint(client, monkeypatch):
    mock_provider = MockStreamingProvider("Token streaming through FastAPI route.")
    monkeypatch.setattr(AIService, "get_provider", lambda db=None: mock_provider)

    # 1. Test POST /api/v1/assistant/ask-do/stream
    res = client.post("/api/v1/assistant/ask-do/stream", json={"prompt": "Test query"})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")

    body = res.text
    assert "event: token" in body
    assert "event: done" in body
    assert "Token streaming through FastAPI route." in body

    # 2. Test POST /api/assistant/ask-do?stream=true
    res_query = client.post("/api/assistant/ask-do?stream=true", json={"prompt": "Another test query"})
    assert res_query.status_code == 200
    assert "text/event-stream" in res_query.headers.get("content-type", "")
    assert "event: done" in res_query.text

    # 3. Test POST /api/assistant/ask-do with payload stream: true
    res_body_stream = client.post("/api/assistant/ask-do", json={"prompt": "Payload stream", "stream": True})
    assert res_body_stream.status_code == 200
    assert "text/event-stream" in res_body_stream.headers.get("content-type", "")
    assert "event: done" in res_body_stream.text

    # Verify standard non-streaming still returns regular JSON
    res_json = client.post("/api/assistant/ask-do", json={"prompt": "Non stream query"})
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers.get("content-type", "")
    assert "reply" in res_json.json()
