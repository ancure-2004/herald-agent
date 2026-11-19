from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.discovery.google_places import GooglePlacesProvider, GoogleQuotaExhausted
from app.autopilot.discovery.local_pool import LocalPoolProvider, is_candidate_in_locality
from app.autopilot.discovery.localities import Locality
from app.autopilot.discovery.waterfall import CandidateStream
from app.autopilot.runs.runner import execute_autopilot_run
from app.autopilot.types import RunOptions
from app.db.schema_migrations import ensure_schema_columns
from app.db.session import Base
from app.models.entities import Hustle, Lead, Package, Stage


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    hustle = Hustle(name="Dental Clinics (No Website)", slug="dental-clinics", search_query="dental clinic in Delhi NCR")
    stage_disc = Stage(id=1, hustle_id=1, name="Discovered", slug="discovered", order=1)
    stage_ready = Stage(id=2, hustle_id=1, name="Review Tray (Ready)", slug="package_ready", order=2)
    stage_contacted = Stage(id=4, hustle_id=1, name="Pitch Sent", slug="contacted", order=4)
    stage_won = Stage(id=7, hustle_id=1, name="Won", slug="won", order=7)
    db.add_all([hustle, stage_disc, stage_ready, stage_contacted, stage_won])
    db.commit()
    yield db
    db.close()


def test_lead_status_backfill_invariants(test_db):
    """
    Verifies that when ensure_schema_columns runs:
    1. Leads with packages or in stage > 1 are migrated to DEMO_READY / CONTACTED / WON.
    2. Only genuine unbuilt leads in stage 1 without packages retain status='STAGED'.
    """
    # Create leads with legacy 'STAGED' status
    lead_unbuilt = Lead(hustle_id=1, stage_id=1, status="STAGED", slug="unbuilt-1", name="Unbuilt Clinic", primary_phone="+919811100001")
    lead_with_pkg = Lead(hustle_id=1, stage_id=1, status="STAGED", slug="built-1", name="Built Clinic", primary_phone="+919811100002")
    lead_contacted = Lead(hustle_id=1, stage_id=4, status="STAGED", slug="contacted-1", name="Contacted Clinic", primary_phone="+919811100003")
    lead_won = Lead(hustle_id=1, stage_id=7, status="STAGED", slug="won-1", name="Won Clinic", primary_phone="+919811100004")
    test_db.add_all([lead_unbuilt, lead_with_pkg, lead_contacted, lead_won])
    test_db.commit()

    # Add package for built-1
    pkg = Package(lead_id=lead_with_pkg.id, status="ready_for_review")
    test_db.add(pkg)
    test_db.commit()

    # Re-run ensure_schema_columns
    ensure_schema_columns(test_db)
    test_db.commit()

    # Verify backfilled statuses
    test_db.refresh(lead_unbuilt)
    test_db.refresh(lead_with_pkg)
    test_db.refresh(lead_contacted)
    test_db.refresh(lead_won)

    assert lead_unbuilt.status == "STAGED", "Genuine unbuilt lead in stage 1 must remain STAGED"
    assert lead_with_pkg.status == "DEMO_READY", "Lead with package must become DEMO_READY"
    assert lead_contacted.status == "CONTACTED", "Lead in contacted stage must become CONTACTED"
    assert lead_won.status == "WON", "Lead in won stage must become WON"


def test_google_places_raw_caching(test_db):
    """
    GooglePlacesProvider must cache raw query results in DbCache (provider='google_places_raw').
    Repeated queries must hit DbCache and make 0 live API calls.
    """
    provider = GooglePlacesProvider(api_key="mock_key")
    loc = Locality(label="Noida Sector 50", city="Noida", state="Uttar Pradesh", bbox=(28.5, 77.3, 28.6, 77.4))
    query = "dental clinic in Noida Sector 50, Delhi NCR, India"

    mock_search = MagicMock(return_value=[
        {
            "place_id": "PID_CACHED_1",
            "title": "Cached Dental Clinic",
            "address": "Sector 50 Noida",
            "phoneNumber": "+919811122334",
            "rating": 4.9,
            "ratingCount": 10,
        }
    ])

    with patch("app.autopilot.discovery.google_places.google_places_search", mock_search):
        # 1st call: calls API and stores in DbCache
        res1 = provider.search_candidates(query=query, locality=loc, db=test_db)
        assert len(res1) == 1
        assert res1[0].name == "Cached Dental Clinic"
        assert mock_search.call_count == 1

        # 2nd call: returns from DbCache with 0 API calls!
        res2 = provider.search_candidates(query=query, locality=loc, db=test_db)
        assert len(res2) == 1
        assert res2[0].name == "Cached Dental Clinic"
        assert mock_search.call_count == 1  # Unchanged!


def test_google_quota_429_circuit_breaker():
    """
    When Google Places encounters HTTP 429, it sets quota_exhausted=True.
    CandidateStream catches this and immediately halts querying Google for subsequent localities.
    """
    GooglePlacesProvider.reset_quota_status()
    loc1 = Locality(label="Locality 1", city="Noida", state="UP", bbox=(0, 0, 0, 0))
    loc2 = Locality(label="Locality 2", city="Noida", state="UP", bbox=(0, 0, 0, 0))

    google_calls = 0

    def mock_search_429(*args, **kwargs):
        nonlocal google_calls
        google_calls += 1
        GooglePlacesProvider.quota_exhausted = True
        raise GoogleQuotaExhausted("Simulated 429")

    with patch("app.autopilot.discovery.google_places.google_places_search", side_effect=mock_search_429):
        # Stream 1 encounters 429
        stream1 = CandidateStream(query="query 1", locality=loc1, target_count=5)
        list(stream1)
        assert google_calls == 1
        assert GooglePlacesProvider.quota_exhausted is True

        # Stream 2 on subsequent locality must skip Google immediately
        stream2 = CandidateStream(query="query 2", locality=loc2, target_count=5)
        list(stream2)
        assert google_calls == 1  # Still 1! No subsequent calls attempted.


def test_local_pool_locality_tagging_and_filtering():
    """
    Verifies that:
    1. Candidate.locality is populated from item.get('locality') or locality.label.
    2. When locality_specified=True, candidates are filtered by locality.
    3. When scanning across presets (locality_specified=False), pool is evaluated once.
    """
    LocalPoolProvider.reset_pool_status()
    provider = LocalPoolProvider()
    loc = Locality(label="Malviya Nagar", city="Delhi", state="Delhi", bbox=(0, 0, 0, 0))

    # Test locality match helper
    assert is_candidate_in_locality({"locality": "Malviya Nagar"}, "Malviya Nagar") is True
    assert is_candidate_in_locality({"address": "B-4, Malviya Nagar, New Delhi"}, "Malviya Nagar") is True
    assert is_candidate_in_locality({"locality": "Noida Sector 62"}, "Malviya Nagar") is False

    # Filtered by locality
    results = provider.search_candidates("dental clinic", locality=loc, locality_specified=True)
    assert len(results) > 0
    for r in results:
        assert r.locality == "Malviya Nagar"
        assert "malviya" in (r.address + r.name + r.locality).lower()

    # Unfiltered pool scanning: first call scans, second call returns []
    LocalPoolProvider.reset_pool_status()
    p2 = LocalPoolProvider()
    all_res = p2.search_candidates("dental clinic", locality=loc, locality_specified=False)
    assert len(all_res) == 216
    second_res = p2.search_candidates("dental clinic", locality=loc, locality_specified=False)
    assert len(second_res) == 0  # Re-evaluation skipped!


def test_runner_search_query_uses_micro_locality(test_db):
    """
    Runner must use f'dental clinic in {locality.label}, Delhi NCR, India'
    instead of falling back to hustle.search_query.
    """
    hustle = test_db.query(Hustle).first()
    assert hustle.search_query == "dental clinic in Delhi NCR"

    captured_queries = []

    def mock_discovery(ctx, locality, query, **kwargs):
        captured_queries.append(query)
        return []

    with patch("app.autopilot.runs.runner.stage_discovery", side_effect=mock_discovery):
        opts = RunOptions(hustle_id=1, target_count=1, locality="Noida Sector 75", stop_after="discovery")
        execute_autopilot_run(db=test_db, options=opts, hustle=hustle)

        assert len(captured_queries) >= 1
        assert captured_queries[0] == "dental clinic in Noida Sector 75, Delhi NCR, India"
        assert "Delhi NCR, India" in captured_queries[0]
        assert captured_queries[0] != hustle.search_query
