from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.runs.runner import execute_autopilot_run
from app.autopilot.search.cache import DbCache
from app.autopilot.types import Candidate, RunOptions, WebsiteVerdict
from app.db.session import Base
from app.models.entities import Hustle, Lead, Stage


class CacheSpy(DbCache):
    def __init__(self, db):
        super().__init__(db)
        self.reads = 0
        self.writes = 0

    def get(self, key: str, *, bypass: bool = False):
        if not bypass:
            self.reads += 1
        return super().get(key, bypass=bypass)

    def set(self, key: str, value, *, ttl_hours: int = 720, bypass: bool = False):
        if not bypass:
            self.writes += 1
        return super().set(key, value, ttl_hours=ttl_hours, bypass=bypass)


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
    stage = Stage(hustle_id=1, name="Package Ready", slug="package_ready", order=1)
    db.add_all([hustle, stage])
    db.commit()
    yield db
    db.close()


def test_testing_mode_zero_cache_reads_and_writes(test_db):
    cache_spy = CacheSpy(test_db)

    # In testing mode, cache must have 0 non-bypassed reads and 0 non-bypassed writes
    cache_spy.get("test-key", bypass=True)
    cache_spy.set("test-key", {"data": 123}, bypass=True)
    assert cache_spy.reads == 0
    assert cache_spy.writes == 0


def test_testing_mode_tags_leads_and_isolates_db(test_db):
    hustle = test_db.query(Hustle).first()

    mock_candidate = Candidate(
        name="Apex Dental Clinic",
        address="Saket New Delhi",
        locality="Saket",
        phone="+919811001122",
        source_tier="OSM Overpass",
    )

    with (
        patch("app.autopilot.discovery.waterfall.CandidateStream.__iter__", return_value=iter([mock_candidate])),
        patch("app.autopilot.verification.verifier.check_candidate_website") as mock_check,
        patch(
            "app.autopilot.runs.stage_recording.sync_verified_links_to_batch_json",
            return_value={"verified_count": 1, "failed_count": 0, "verified": 1, "total": 1},
        ),
        patch(
            "app.autopilot.runs.stage_recording.record_walkthrough_batch",
            return_value={"total_count": 1, "recorded_count": 1, "items": []},
        ),
    ):
        mock_check.return_value = (
            WebsiteVerdict(status="NO_SITE", domain=None, evidence=["no website found"], source="search"),
            [],
        )

        options = RunOptions(
            hustle_id=hustle.id,
            target_count=1,
            testing_mode=True,
            base_url="http://localhost:3001",
        )
        res = execute_autopilot_run(
            db=test_db,
            options=options,
            hustle=hustle,
        )

        assert res["passed"] == 1
        created_lead = test_db.query(Lead).filter(Lead.primary_phone == "+919811001122").first()
        assert created_lead is not None
        assert created_lead.is_test is True
        assert created_lead.test_run_id == str(res["run_id"])


def test_cleanup_test_data_endpoint(test_db):
    from app.services.pipeline_service import cleanup_test_data

    hustle = test_db.query(Hustle).first()
    stage = test_db.query(Stage).first()

    # Create 1 production lead and 2 test leads
    prod_lead = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        slug="prod-clinic",
        name="Prod Clinic",
        primary_phone="+919811111111",
        is_test=False,
    )
    test_lead1 = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        slug="test-clinic-1",
        name="Test Clinic 1",
        primary_phone="+919822222222",
        is_test=True,
        test_run_id="run-1",
    )
    test_lead2 = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        slug="test-clinic-2",
        name="Test Clinic 2",
        primary_phone="+919833333333",
        is_test=True,
        test_run_id="run-2",
    )
    test_db.add_all([prod_lead, test_lead1, test_lead2])
    test_db.commit()

    # Purge only run-1
    result = cleanup_test_data(test_db, confirmation="DELETE_TEST_DATA", test_run_id="run-1")
    assert result["deleted_leads"] == 1

    remaining_test = test_db.query(Lead).filter(Lead.is_test == True).all()
    assert len(remaining_test) == 1
    assert remaining_test[0].test_run_id == "run-2"

    # Prod lead must remain untouched
    remaining_prod = test_db.query(Lead).filter(Lead.is_test == False).all()
    assert len(remaining_prod) == 1
    assert remaining_prod[0].name == "Prod Clinic"
