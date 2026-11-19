from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.runs.job_manager import JobManager
from app.db.session import Base
from app.models.entities import Hustle, RunLog
from app.services.event_bus import get_terminal_logs
from app.services.pipeline_service import PipelineService


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = Session()
    hustle = Hustle(name="Dental Clinics (No Website)", slug="dental-clinics")
    db.add(hustle)
    db.commit()
    yield db
    db.close()


def test_single_flight_lock_raises_409(client: TestClient, test_db):
    hustle = test_db.query(Hustle).first()
    # Acquire lock artificially
    token = JobManager.acquire_single_flight(prospective_run_id=888)
    assert token is not None

    try:
        res = client.post(
            "/api/autopilot/run-refill",
            json={"hustle_id": hustle.id, "batch_size": 1},
        )
        assert res.status_code == 409
        assert "already in progress" in res.json()["detail"].lower()
    finally:
        JobManager.release_single_flight(888)


def test_exception_marks_is_running_false_and_runlog_failed(test_db):
    hustle = test_db.query(Hustle).first()

    with patch("app.autopilot.runs.runner.stage_discovery", side_effect=RuntimeError("Simulated pipeline crash")):
        with pytest.raises(RuntimeError):
            PipelineService.trigger_refill(
                db=test_db,
                hustle_id=hustle.id,
                batch_size=1,
                async_mode=False,
            )

        # Ensure single flight lock is released
        assert JobManager.get_active_run_id() is None

        # Ensure RunLog was marked failed
        latest_run = test_db.query(RunLog).order_by(RunLog.id.desc()).first()
        assert latest_run is not None
        assert latest_run.status == "failed"
        assert "Simulated pipeline crash" in (latest_run.errors[0] if latest_run.errors else "")


def test_cancel_endpoint(client: TestClient, test_db):
    token = JobManager.acquire_single_flight(prospective_run_id=999)
    assert token.is_cancelled is False

    try:
        res = client.post("/api/autopilot/stop")
        assert res.status_code == 200
        assert res.json()["status"] == "cancelling"
        assert token.is_cancelled is True
    finally:
        JobManager.release_single_flight(999)


def test_terminal_logs_shape():
    # Without since_seq: returns list
    logs_list = get_terminal_logs()
    assert isinstance(logs_list, list)

    # With since_seq: returns {"logs": [...], "latest_seq": N}
    result = get_terminal_logs(since_seq=0)
    assert isinstance(result, dict)
    assert "logs" in result
    assert "latest_seq" in result


def test_cockpit_state_built_from_runlog(test_db):
    hustle = test_db.query(Hustle).first()
    run = RunLog(
        hustle_id=hustle.id,
        job_type="autopilot_refill",
        status="succeeded",
        count_found=3,
        count_passed=2,
    )
    test_db.add(run)
    test_db.commit()

    state = PipelineService.get_cockpit_state(test_db, hustle_id=hustle.id)
    assert "is_running" in state
    assert state["is_running"] is False
    assert state["metrics"]["runId"] == f"#run-{run.id}"
    assert state["metrics"]["candidateFound"] == 3
    assert state["metrics"]["verifiedNoSite"] == 2
    assert state["metrics"]["status"] == "COMPLETED"
