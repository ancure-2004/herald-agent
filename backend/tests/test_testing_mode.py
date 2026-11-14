from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.orchestrator import run_live_autopilot_discovery
from app.db.session import Base
from app.models.entities import Hustle


def test_trigger_refill_route_accepts_testing_mode(client: TestClient):
    with patch("app.services.pipeline_service.run_live_autopilot_discovery") as mock_run:
        mock_run.return_value = {
            "run_id": 99,
            "passed": 1,
            "batch_sync": {"verified_count": 1},
        }

        res = client.post(
            "/api/autopilot/run-refill",
            json={"hustle_id": 1, "batch_size": 2, "testing_mode": True, "locality": "Noida Sector 62"},
        )
        assert res.status_code == 200
        mock_run.assert_called_once()
        kwargs = mock_run.call_args.kwargs
        assert kwargs.get("testing_mode") is True
        assert kwargs.get("locality") == "Noida Sector 62"
        assert kwargs.get("target_count") == 2


def test_testing_mode_allows_local_pool_fallback():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = Session()

    hustle = Hustle(name="Dental Clinics (No Website)", slug="dental-clinics")
    db.add(hustle)
    db.commit()

    with (
        patch("app.autopilot.discovery.google_places.google_places_search", return_value=[]),
        patch("app.autopilot.discovery.local_pool.playwright_maps_fallback_pool") as mock_pw,
        patch("app.autopilot.runs.runner.stage_verification", return_value=([], {}, [])),
    ):
        mock_pw.return_value = [{"title": "Cached Clinic", "address": "Rohini Delhi", "phoneNumber": "+919811122334"}]

        logs = []
        result = run_live_autopilot_discovery(
            db=db,
            hustle=hustle,
            target_count=1,
            base_url="http://localhost:3001",
            log_cb=logs.append,
            testing_mode=True,
            locality="Rohini Delhi",
            stop_after="discovery",
        )

        # With testing_mode=True, local_pool serves as fallback when google yields no candidates
        mock_pw.assert_called()
        assert result["found"] == 1
    db.close()
