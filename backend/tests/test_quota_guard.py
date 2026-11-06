from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.discovery.google_places import GooglePlacesProvider
from app.autopilot.discovery.localities import resolve_locality
from app.autopilot.discovery.overpass import OverpassProvider
from app.autopilot.discovery.waterfall import CandidateStream
from app.autopilot.quota import QuotaGuard
from app.autopilot.types import Candidate
from app.db.session import Base


@pytest.fixture
def memory_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = Session()
    yield db
    db.close()


def test_quota_guard_soft_limit_enforcement(memory_db):
    quota = QuotaGuard(memory_db)
    # Set soft limit to 2 for testing
    quota.SOFT_LIMITS["test_provider"] = {"test_sku": 2}

    assert quota.try_consume("test_provider", "test_sku") is True
    assert quota.try_consume("test_provider", "test_sku") is True
    # 3rd attempt exceeds soft limit
    assert quota.try_consume("test_provider", "test_sku") is False


def test_waterfall_skips_google_on_quota_and_falls_through_to_overpass(memory_db):
    # Exceed quota for google_places
    QuotaGuard.SOFT_LIMITS["google_places"] = {"text_search": 0}

    locality = resolve_locality("South Delhi / Saket")
    overpass_candidate = Candidate(
        name="Overpass Dental",
        locality="Saket",
        phone="+919811000000",
        source_tier="OSM Overpass",
    )

    with (
        patch("app.autopilot.discovery.google_places.google_places_search") as mock_google,
        patch(
            "app.autopilot.discovery.overpass.OverpassProvider.search_candidates", return_value=[overpass_candidate]
        ) as mock_overpass,
    ):
        stream = CandidateStream(
            query="dental clinic in Saket",
            locality=locality,
            providers=[GooglePlacesProvider(), OverpassProvider()],
            target_count=1,
            db=memory_db,
        )

        candidates = list(stream)

        # Google should not even be called because soft limit was 0
        mock_google.assert_not_called()
        mock_overpass.assert_called_once()
        assert len(candidates) == 1
        assert candidates[0].name == "Overpass Dental"
