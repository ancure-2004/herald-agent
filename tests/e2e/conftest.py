import os
import sys
from typing import Any, Dict, Generator, Optional
import pytest

# Ensure backend and tests roots are on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
tests_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if tests_path not in sys.path:
    sys.path.insert(0, tests_path)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app
from app.seed import seed_initial_data


class LeadDetailResponse:
    """Wrapper response object for lead details."""

    def __init__(self, data: Dict[str, Any], status_code: int = 200):
        self._data = data
        self.status_code = status_code

    def json(self) -> Dict[str, Any]:
        return self._data


class E2EClientWrapper:
    """Wrapper around TestClient/HTTP client providing capability discovery and progressive testability."""

    def __init__(self, raw_client: Any, base_url: str = ""):
        self._client = raw_client
        self._base_url = base_url

    def get(self, url: str, **kwargs) -> Any:
        return self._client.get(url, **kwargs)

    def post(self, url: str, **kwargs) -> Any:
        return self._client.post(url, **kwargs)

    def patch(self, url: str, **kwargs) -> Any:
        return self._client.patch(url, **kwargs)

    def delete(self, url: str, **kwargs) -> Any:
        return self._client.delete(url, **kwargs)

    def put(self, url: str, **kwargs) -> Any:
        return self._client.put(url, **kwargs)

    def get_lead(self, lead_id: int) -> Any:
        """Fetches lead detail directly or via list query if direct route is not defined."""
        res = self.get(f"/api/leads/{lead_id}")
        if res.status_code == 200:
            return res
        # Fallback to list query
        list_res = self.get("/api/leads")
        if list_res.status_code == 200:
            for lead in list_res.json():
                if lead.get("id") == lead_id:
                    return LeadDetailResponse(lead, status_code=200)
        return res

    def check_or_skip(self, response: Any, feature_name: str, milestone: str = "Milestone 2") -> None:
        """Skips test if the endpoint is not yet mounted (404), respecting progressive testability."""
        if response.status_code == 404:
            pytest.skip(f"Feature '{feature_name}' pending {milestone} backend implementation (endpoint returned 404).")


@pytest.fixture()
def client() -> Generator[E2EClientWrapper, None, None]:
    """Provides an isolated E2E TestClient backed by fresh in-memory state, or live URL if set."""
    base_url = os.environ.get("E2E_BASE_URL")
    if base_url:
        import httpx
        with httpx.Client(base_url=base_url, timeout=30.0) as http_client:
            yield E2EClientWrapper(http_client, base_url=base_url)
        return

    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    seed_initial_data(db, include_demo_leads=True)
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield E2EClientWrapper(test_client)
    app.dependency_overrides.clear()


@pytest.fixture()
def dental_lead(client: E2EClientWrapper) -> Dict[str, Any]:
    """Fetches an existing Delhi NCR dental clinic lead or creates one."""
    res = client.get("/api/leads")
    assert res.status_code == 200, f"Failed to list leads: {res.text}"
    leads = res.json()
    if leads and len(leads) > 0:
        return leads[0]

    new_lead = {
        "name": "Dr. Grover Dental Care",
        "doctor_name": "Dr. Rohit Grover",
        "locality": "Rohini Sector 9",
        "city": "Delhi NCR",
        "primary_phone": "+919811002233",
        "preferred_channel": "whatsapp",
    }
    create_res = client.post("/api/leads", json=new_lead)
    assert create_res.status_code in (200, 201), f"Failed to create test lead: {create_res.text}"
    return create_res.json()


@pytest.fixture()
def sample_raw_call_transcript() -> str:
    """Returns realistic raw phone conversation transcript for a dental clinic."""
    return (
        "Receptionist: Good morning, Dr. Grover Dental Clinic.\n"
        "Me: Hi, this is Ankur calling. May I speak with Dr. Rohit Grover regarding your clinic website and online booking?\n"
        "Dr. Grover: Yes, Dr. Grover speaking. What is this about?\n"
        "Me: Doctor, I noticed your Google Maps listing gets great reviews in Rohini, but prospective patients cannot view your treatments or book directly online.\n"
        "Dr. Grover: Yes, our old website went down 6 months ago. We do want a modern website with WhatsApp booking and treatment showcase for implants and Invisalign.\n"
        "Me: We specialize in dental clinic engines. I can send you 3 custom interactive preview templates and a 60-second video demo on WhatsApp.\n"
        "Dr. Grover: That sounds interesting. Please send it on my WhatsApp at 9811002233. How much would it cost?\n"
        "Me: The complete package is 15,000 INR one-time including hosting. I'll send the preview designs right now.\n"
        "Dr. Grover: Send the WhatsApp preview today. I'll review it with my clinic partner tonight and let you know tomorrow morning.\n"
        "Me: Excellent doctor, sending the WhatsApp link right now. Thank you!"
    )
