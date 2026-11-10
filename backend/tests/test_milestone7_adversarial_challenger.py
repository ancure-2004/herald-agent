"""
Adversarial Verification Suite for Milestone 7 (MVP Polish & Bug Fix Directive).
Authored by Challenger 1 (teamwork_challenger).

Empirically tests:
1. Runner Controls & Stop API Contract (POST /api/autopilot/stop):
   - Graceful idle handling (no 500 when no run active).
   - EMPIRICAL BUG FINDING: DiscoveryService line 135 attempts getattr(JobManager, "_ACTIVE_CANCEL_TOKEN", None),
     which evaluates to None because _ACTIVE_CANCEL_TOKEN is a module-level variable in job_manager.py,
     causing active discovery runs to ignore cancellation requests.
   - Stop & cancellation behavior when token is properly bound:
     - Run status in database transitions to 'cancelled'.
     - Staged leads prior to cancellation remain committed with zero lead loss.
     - JobManager single-flight lock is released (_ACTIVE_RUN_ID = None).
     - Subsequent discovery run triggers without 409 Conflict.
   - Concurrent stop request idempotency.
2. Testing Mode Parameter Validation:
   - JSON body testing_mode: true tags leads with is_test: true and test_run_id.
   - Query parameter ?testing_mode=true tags leads with is_test: true and test_run_id.
   - testing_mode: false creates standard production leads (is_test: false).
   - Buffer capacity count isolation between test and production leads.
   - Isolation from cleanup_test_data.
3. Database Live Sync Smoke Test:
   - Live query of GET /api/leads (200, non-empty, validated schema).
   - Live query of GET /api/autopilot/cockpit-state (200, valid telemetry).
   - Live query of GET /api/batch (200, non-empty batch payload).
   - Live query of GET /api/runs (200, non-empty history).
   - Compatibility verification across /api and /api/v1 routes.
"""

import threading
import time
from typing import Any, Dict, List
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.autopilot.runs.job_manager as jm_module
from app.autopilot.discovery.service import STAGING_BUFFER_CEILING, DiscoveryService
from app.autopilot.runs.job_manager import JobManager
from app.autopilot.types import Candidate
from app.db.session import Base, get_db
from app.main import app
from app.models.entities import Hustle, Lead, RunLog, Stage
from app.seed import seed_initial_data
from app.services.pipeline_service import PipelineService, cleanup_test_data


# ---------------------------------------------------------------------------
# Test Fixtures (Isolated In-Memory SQLite Database)
# ---------------------------------------------------------------------------

@pytest.fixture
def isolated_db_and_client():
    """Sets up an isolated in-memory SQLite DB with clean tables and overrides get_db."""
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Seed baseline lookup data
    init_db = TestingSession()
    seed_initial_data(init_db, include_demo_leads=False)
    # Ensure standard stage exists
    hustle = init_db.query(Hustle).first()
    if not hustle:
        hustle = Hustle(id=1, name="Dental Clinics (No Website)", slug="dental-clinics")
        init_db.add(hustle)
        init_db.flush()
    disc_stage = init_db.query(Stage).filter(Stage.slug == "discovered").first()
    if not disc_stage:
        init_db.add(Stage(hustle_id=hustle.id, name="Discovered", slug="discovered", order=0))
    init_db.commit()
    init_db.close()

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    # Ensure single-flight lock is completely clean
    active_id = JobManager.get_active_run_id()
    if active_id is not None:
        JobManager.release_single_flight(active_id)

    with TestClient(app) as test_client:
        yield {
            "client": test_client,
            "session_factory": TestingSession,
            "engine": test_engine,
        }

    app.dependency_overrides.clear()
    active_id = JobManager.get_active_run_id()
    if active_id is not None:
        JobManager.release_single_flight(active_id)


# ---------------------------------------------------------------------------
# Section 1: Runner Controls & Stop API Contract
# ---------------------------------------------------------------------------

def test_stop_endpoint_when_no_run_is_active(isolated_db_and_client):
    """POST /api/autopilot/stop must gracefully return 200 without throwing 500 errors when idle."""
    client = isolated_db_and_client["client"]

    # 1. Unversioned route
    res = client.post("/api/autopilot/stop")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "no_run_active"
    assert "No autopilot run is currently executing" in data["detail"]

    # 2. Versioned route
    res_v1 = client.post("/api/v1/autopilot/stop")
    assert res_v1.status_code == 200
    assert res_v1.json()["status"] == "no_run_active"

    # 3. Targeting a non-existent run ID directly
    res_cancel_id = client.post("/api/autopilot/runs/99999/cancel")
    assert res_cancel_id.status_code == 200
    assert res_cancel_id.json()["status"] == "not_running"
    assert res_cancel_id.json()["run_id"] == 99999


def test_adversarial_cancellation_reveals_unbound_token_bug(isolated_db_and_client):
    """
    CRITICAL EMPIRICAL BUG FINDING:
    DiscoveryService.run_discovery_and_staging line 135 attempts:
        cancel_token = getattr(JobManager, "_ACTIVE_CANCEL_TOKEN", None) or CancelToken()
    However, _ACTIVE_CANCEL_TOKEN is defined at the module level in job_manager.py,
    NOT as an attribute on JobManager.
    Therefore, getattr(JobManager, "_ACTIVE_CANCEL_TOKEN", None) evaluates to None,
    causing run_discovery_and_staging to instantiate an unlinked orphan CancelToken()!
    When POST /api/autopilot/stop is invoked, JobManager.cancel_active_run() cancels the
    module-level token, but the discovery worker NEVER sees the cancel signal and runs
    to completion, setting run_log.status = 'succeeded' instead of 'cancelled'.
    """
    client = isolated_db_and_client["client"]
    Session = isolated_db_and_client["session_factory"]

    # 1. Prove that JobManager class does not have attribute '_ACTIVE_CANCEL_TOKEN'
    assert not hasattr(JobManager, "_ACTIVE_CANCEL_TOKEN")
    assert getattr(JobManager, "_ACTIVE_CANCEL_TOKEN", None) is None

    candidates = [
        Candidate(
            name=f"Verified Clinic {i}",
            address=f"Street {i}, Saket, New Delhi",
            locality="Saket",
            phone=f"+91981100000{i}",
            source_tier="Test Provider",
            place_id=f"PID_TEST_{i}",
        )
        for i in range(1, 5)
    ]

    staged_event = threading.Event()
    stop_called_event = threading.Event()

    def controlled_candidate_generator(*args, **kwargs):
        for idx, cand in enumerate(candidates):
            yield cand
            if idx == 1:
                staged_event.set()
                stop_called_event.wait(timeout=3.0)

    with (
        patch("app.services.pipeline_service.SessionLocal", Session),
        patch("app.autopilot.discovery.waterfall.CandidateStream.__iter__", controlled_candidate_generator),
    ):
        start_res = client.post(
            "/api/autopilot/discover",
            json={
                "hustle_id": 1,
                "target_count": 4,
                "locality": "Saket",
                "testing_mode": True,
                "async_mode": True,
            },
        )
        assert start_res.status_code == 202
        run_id = start_res.json()["run_id"]

        assert staged_event.wait(timeout=5.0)
        time.sleep(0.1)

        # Call stop
        stop_res = client.post("/api/autopilot/stop")
        assert stop_res.status_code == 200
        assert stop_res.json()["status"] == "cancelling"

        stop_called_event.set()

        deadline = time.time() + 5.0
        while time.time() < deadline:
            if JobManager.get_active_run_id() is None:
                break
            time.sleep(0.05)

        with Session() as db:
            run_log = db.query(RunLog).filter(RunLog.id == run_id).first()
            assert run_log.status == "cancelled", "Verifies worker properly halted and status transitioned to cancelled"


def test_stop_endpoint_halts_active_discovery_with_bound_token(isolated_db_and_client):
    """
    Empirically verifies that WHEN the CancelToken is properly accessible to the worker:
    1. Active run is halted via POST /api/autopilot/stop without 500 errors.
    2. Run status in database transitions to 'cancelled'.
    3. Leads staged prior to cancellation remain committed with ZERO loss.
    4. JobManager single-flight lock is released (_ACTIVE_RUN_ID = None).
    5. A subsequent discovery run can be started without 409 Conflict.
    """
    client = isolated_db_and_client["client"]
    Session = isolated_db_and_client["session_factory"]

    candidates = [
        Candidate(
            name=f"Bound Clinic {i}",
            address=f"Street {i}, Saket, New Delhi",
            locality="Saket",
            phone=f"+91981100001{i}",
            source_tier="Test Provider",
            place_id=f"PID_BOUND_TEST_{i}",
        )
        for i in range(1, 5)
    ]

    staged_event = threading.Event()
    stop_called_event = threading.Event()

    def controlled_candidate_generator(*args, **kwargs):
        for idx, cand in enumerate(candidates):
            yield cand
            if idx == 1:
                staged_event.set()
                stop_called_event.wait(timeout=3.0)

    # Patch JobManager.acquire_single_flight to also attach _ACTIVE_CANCEL_TOKEN to JobManager class
    orig_acquire = JobManager.acquire_single_flight
    def patched_acquire(prospective_run_id):
        tok = orig_acquire(prospective_run_id)
        JobManager._ACTIVE_CANCEL_TOKEN = tok
        return tok

    orig_release = JobManager.release_single_flight
    def patched_release(run_id):
        orig_release(run_id)
        if hasattr(JobManager, "_ACTIVE_CANCEL_TOKEN"):
            delattr(JobManager, "_ACTIVE_CANCEL_TOKEN")

    with (
        patch.object(JobManager, "acquire_single_flight", side_effect=patched_acquire),
        patch.object(JobManager, "release_single_flight", side_effect=patched_release),
        patch("app.services.pipeline_service.SessionLocal", Session),
        patch("app.autopilot.discovery.waterfall.CandidateStream.__iter__", controlled_candidate_generator),
    ):
        start_res = client.post(
            "/api/autopilot/discover",
            json={
                "hustle_id": 1,
                "target_count": 4,
                "locality": "Saket",
                "testing_mode": True,
                "async_mode": True,
            },
        )
        assert start_res.status_code == 202
        run_id = start_res.json()["run_id"]
        assert JobManager.get_active_run_id() == run_id

        # Verify concurrent run request triggers 409 Conflict
        conflict_res = client.post(
            "/api/autopilot/discover",
            json={"hustle_id": 1, "target_count": 2, "async_mode": True},
        )
        assert conflict_res.status_code == 409
        assert "already in progress" in conflict_res.json()["detail"].lower()

        # Wait until 2 leads have been processed
        assert staged_event.wait(timeout=5.0)
        time.sleep(0.1)

        # Call POST /api/autopilot/stop
        stop_res = client.post("/api/autopilot/stop")
        assert stop_res.status_code == 200
        assert stop_res.json()["status"] == "cancelling"

        stop_called_event.set()

        deadline = time.time() + 5.0
        while time.time() < deadline:
            if JobManager.get_active_run_id() is None:
                break
            time.sleep(0.05)

        # 1. Lock must be released
        assert JobManager.get_active_run_id() is None, "JobManager single-flight lock was not released!"

        # 2. Database verification: Run status must be 'cancelled'
        with Session() as db:
            run_log = db.query(RunLog).filter(RunLog.id == run_id).first()
            assert run_log is not None
            assert run_log.status == "cancelled", f"Expected 'cancelled', got '{run_log.status}'"
            assert run_log.finished_at is not None

            # 3. Verify zero lead loss: leads staged prior to cancel are safely stored
            staged_leads = db.query(Lead).filter(Lead.test_run_id == str(run_id)).all()
            assert len(staged_leads) >= 2, f"Expected at least 2 staged leads, found {len(staged_leads)}"
            assert run_log.count_passed == len(staged_leads)
            for l in staged_leads:
                assert l.status == "STAGED"
                assert l.is_test is True

        # 4. Subsequent run triggers cleanly without 409 Conflict
        subsequent_res = client.post(
            "/api/autopilot/discover",
            json={
                "hustle_id": 1,
                "target_count": 1,
                "locality": "Saket",
                "testing_mode": True,
                "async_mode": True,
            },
        )
        assert subsequent_res.status_code == 202
        new_run_id = subsequent_res.json()["run_id"]
        assert new_run_id != run_id

        client.post("/api/autopilot/stop")
        time.sleep(0.2)
        JobManager.release_single_flight(new_run_id)


def test_rapid_concurrent_stop_requests_are_idempotent(isolated_db_and_client):
    """Firing rapid/concurrent POST /api/autopilot/stop requests must not throw errors or deadlock."""
    client = isolated_db_and_client["client"]

    token = JobManager.acquire_single_flight(prospective_run_id=777)
    assert token.is_cancelled is False

    responses = []
    def call_stop():
        r = client.post("/api/autopilot/stop")
        responses.append(r)

    threads = [threading.Thread(target=call_stop) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # All responses must be HTTP 200
    assert len(responses) == 5
    for r in responses:
        assert r.status_code == 200
        assert r.json()["status"] == "cancelling"
    assert token.is_cancelled is True

    JobManager.release_single_flight(777)


# ---------------------------------------------------------------------------
# Section 2: Testing Mode Parameter Validation
# ---------------------------------------------------------------------------

def test_testing_mode_true_json_body_tags_leads(isolated_db_and_client):
    """POST /api/autopilot/discover with testing_mode: true in JSON body tags leads correctly."""
    client = isolated_db_and_client["client"]
    Session = isolated_db_and_client["session_factory"]

    mock_cand = Candidate(
        name="Test Dental Lab Saket",
        address="Saket, New Delhi",
        locality="Saket",
        phone="+919811009988",
        source_tier="Mocked Provider",
        place_id="PID_TEST_BODY_1",
    )

    with (
        patch("app.services.pipeline_service.SessionLocal", Session),
        patch("app.autopilot.discovery.waterfall.CandidateStream.__iter__", return_value=iter([mock_cand])),
    ):
        res = client.post(
            "/api/autopilot/discover",
            json={
                "hustle_id": 1,
                "target_count": 1,
                "locality": "Saket",
                "testing_mode": True,
                "async_mode": False,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "succeeded"
        run_id = data["run_id"]

        with Session() as db:
            lead = db.query(Lead).filter(Lead.primary_phone == "+919811009988").first()
            assert lead is not None
            assert lead.is_test is True, "Lead must be tagged is_test=True"
            assert lead.test_run_id == str(run_id), f"Lead test_run_id must equal '{run_id}'"
            assert lead.status == "STAGED"


def test_testing_mode_true_query_param_tags_leads(isolated_db_and_client):
    """POST /api/autopilot/discover with ?testing_mode=true query param tags leads correctly."""
    client = isolated_db_and_client["client"]
    Session = isolated_db_and_client["session_factory"]

    mock_cand = Candidate(
        name="Query Param Test Clinic",
        address="Noida Sector 62",
        locality="Noida",
        phone="+919811009977",
        source_tier="Mocked Provider",
        place_id="PID_TEST_QUERY_1",
    )

    with (
        patch("app.services.pipeline_service.SessionLocal", Session),
        patch("app.autopilot.discovery.waterfall.CandidateStream.__iter__", return_value=iter([mock_cand])),
    ):
        res = client.post(
            "/api/autopilot/discover?testing_mode=true&target_count=1&locality=Noida",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "succeeded"
        run_id = data["run_id"]

        with Session() as db:
            lead = db.query(Lead).filter(Lead.primary_phone == "+919811009977").first()
            assert lead is not None
            assert lead.is_test is True, "Lead must be tagged is_test=True"
            assert lead.test_run_id == str(run_id)


def test_testing_mode_false_creates_production_leads(isolated_db_and_client):
    """POST /api/autopilot/discover with testing_mode: false creates standard production leads."""
    client = isolated_db_and_client["client"]
    Session = isolated_db_and_client["session_factory"]

    mock_cand = Candidate(
        name="Production Apex Smiles",
        address="Vasant Kunj, New Delhi",
        locality="Vasant Kunj",
        phone="+919811009966",
        source_tier="Mocked Provider",
        place_id="PID_PROD_1",
    )

    with (
        patch("app.services.pipeline_service.SessionLocal", Session),
        patch("app.autopilot.discovery.waterfall.CandidateStream.__iter__", return_value=iter([mock_cand])),
    ):
        res = client.post(
            "/api/autopilot/discover",
            json={
                "hustle_id": 1,
                "target_count": 1,
                "locality": "Vasant Kunj",
                "testing_mode": False,
                "async_mode": False,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "succeeded"

        with Session() as db:
            lead = db.query(Lead).filter(Lead.primary_phone == "+919811009966").first()
            assert lead is not None
            assert lead.is_test is False, "Production lead must have is_test=False"


def test_staging_buffer_capacity_isolates_test_from_production():
    """
    DiscoveryService.get_staged_count isolates test leads from production buffer capacity:
    testing_mode=False filters (is_test == False | is_test == None) so test leads do not consume
    production buffer capacity.
    """
    clean_engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=clean_engine)
    CleanSession = sessionmaker(bind=clean_engine)

    with CleanSession() as db:
        hustle = Hustle(id=1, name="Dental Clinics (No Website)", slug="dental-clinics")
        stage = Stage(id=1, hustle_id=1, name="Discovered", slug="discovered", order=0)
        db.add_all([hustle, stage])
        db.commit()

        # Add 3 production staged leads
        for i in range(3):
            db.add(
                Lead(
                    hustle_id=1,
                    stage_id=1,
                    status="STAGED",
                    slug=f"clean-prod-{i}",
                    name=f"Clean Prod {i}",
                    primary_phone=f"+91987700010{i}",
                    is_test=False,
                )
            )

        # Add 5 test staged leads
        for i in range(5):
            db.add(
                Lead(
                    hustle_id=1,
                    stage_id=1,
                    status="STAGED",
                    slug=f"clean-test-{i}",
                    name=f"Clean Test {i}",
                    primary_phone=f"+91986600010{i}",
                    is_test=True,
                    test_run_id="run-clean-test",
                )
            )
        db.commit()

        prod_staged = DiscoveryService.get_staged_count(db, hustle_id=1, testing_mode=False)
        test_staged = DiscoveryService.get_staged_count(db, hustle_id=1, testing_mode=True)

        # testing_mode=False correctly ignores the 5 test leads, reporting only the 3 production leads
        assert prod_staged == 3, f"Expected 3 production staged leads, got {prod_staged}"
        # testing_mode=True reports the full pool (3 + 5 = 8)
        assert test_staged == 8, f"Expected 8 total staged leads, got {test_staged}"

        # Cleanup test leads only
        res = cleanup_test_data(db, confirmation="DELETE_TEST_DATA", test_run_id="run-clean-test")
        assert res["deleted_leads"] == 5

        remaining_prod = db.query(Lead).filter(Lead.is_test == False, Lead.status == "STAGED").count()
        assert remaining_prod == 3, "Production leads were corrupted by cleanup_test_data!"


# ---------------------------------------------------------------------------
# Section 3: Database Live Sync Smoke Test (Real Live Backend DB)
# ---------------------------------------------------------------------------

def test_live_sync_all_four_cockpit_endpoints():
    """
    Empirically queries the live backend across all 4 operational endpoints:
    1. GET /api/leads
    2. GET /api/autopilot/cockpit-state
    3. GET /api/batch
    4. GET /api/runs
    Verifies HTTP 200, schema conformance, and non-empty records.
    """
    with TestClient(app) as live_client:
        # 1. GET /api/leads
        res_leads = live_client.get("/api/leads?hustle_id=1")
        assert res_leads.status_code == 200, f"/api/leads failed: {res_leads.status_code}"
        leads_data = res_leads.json()
        assert isinstance(leads_data, list), "Expected list of leads"
        assert len(leads_data) > 0, "Expected non-empty leads list in database"
        first_lead = leads_data[0]
        assert "id" in first_lead
        assert "name" in first_lead
        assert "fit_score" in first_lead
        assert "status" in first_lead

        # 2. GET /api/autopilot/cockpit-state
        res_cockpit = live_client.get("/api/autopilot/cockpit-state?hustle_id=1")
        assert res_cockpit.status_code == 200, f"/api/autopilot/cockpit-state failed: {res_cockpit.status_code}"
        cockpit_data = res_cockpit.json()
        assert isinstance(cockpit_data, dict), "Expected dict response for cockpit-state"
        assert "is_running" in cockpit_data
        assert "nodes" in cockpit_data
        assert isinstance(cockpit_data["nodes"], list)
        assert len(cockpit_data["nodes"]) == 6, f"Expected 6 pipeline nodes, got {len(cockpit_data['nodes'])}"
        assert "metrics" in cockpit_data
        metrics = cockpit_data["metrics"]
        assert "status" in metrics
        assert "stagedPoolCount" in metrics
        assert "stagedCeiling" in metrics
        assert metrics["stagedCeiling"] == STAGING_BUFFER_CEILING

        # 3. GET /api/batch
        res_batch = live_client.get("/api/batch?hustle_id=1")
        assert res_batch.status_code == 200, f"/api/batch failed: {res_batch.status_code}"
        batch_data = res_batch.json()
        assert isinstance(batch_data, dict), "Expected dict response for batch"
        assert "clinics" in batch_data
        assert "total" in batch_data
        assert isinstance(batch_data["clinics"], list)
        assert batch_data["total"] > 0, "Expected non-empty batch clinics"
        first_clinic = batch_data["clinics"][0]
        assert "name" in first_clinic
        assert "slug" in first_clinic

        # 4. GET /api/runs
        res_runs = live_client.get("/api/runs?hustle_id=1")
        assert res_runs.status_code == 200, f"/api/runs failed: {res_runs.status_code}"
        runs_data = res_runs.json()
        assert isinstance(runs_data, list), "Expected list of runs"
        assert len(runs_data) > 0, "Expected non-empty runs list in database"
        first_run = runs_data[0]
        assert "id" in first_run
        assert "job_type" in first_run
        assert "status" in first_run


def test_live_sync_versioned_v1_endpoints_match():
    """Verifies that /api/v1/* routes return identical status 200 responses to /api/* routes."""
    with TestClient(app) as live_client:
        for route in ["/api/v1/leads?hustle_id=1", "/api/v1/autopilot/cockpit-state?hustle_id=1", "/api/v1/batch?hustle_id=1", "/api/v1/runs?hustle_id=1"]:
            res = live_client.get(route)
            assert res.status_code == 200, f"Versioned route {route} failed: {res.status_code}"
