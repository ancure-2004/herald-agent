"""
Unit and Integration Tests for Autopilot Phase 1:
Sourcing & Staging Decoupling (Discovery Backend)

Covers:
1. 100% WhatsApp Phone Validation (Indian 10-digit mobile starting with 6,7,8,9; reject landlines).
2. Fast Website Filter (allow empty, social, linktree, wa.me, business.site; reject custom domains).
3. Triply-Redundant Deduplication (CID/Place ID, clean name, phone) in DB & session memory.
4. Rejection Cache (persist dropped candidates; instant skip in subsequent localities).
5. Lead Staging & 210-lead ceiling enforcement (status STAGED, hard cap at 210).
6. Dedicated Discovery API Endpoint (/api/autopilot/discover).
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.discovery.dedup import DiscoveryDeduplicator
from app.autopilot.discovery.service import STAGING_BUFFER_CEILING, DiscoveryService
from app.autopilot.types import Candidate
from app.autopilot.utils.hosts import is_allowed_discovery_website
from app.autopilot.utils.phone import (
    check_phone_is_valid_indian_mobile,
    is_valid_indian_mobile,
    normalize_indian_mobile,
)
from app.db.session import Base
from app.models.entities import Hustle, Lead, Stage
from app.seed import seed_initial_data

# ---------------------------------------------------------------------------
# 1. WhatsApp Phone Validation Tests
# ---------------------------------------------------------------------------


def test_whatsapp_phone_validation_valid_mobiles():
    """Valid Indian mobile numbers starting with 6, 7, 8, 9 must normalize cleanly."""
    valid_samples = [
        ("+91 98111 22334", "+919811122334", "9811122334"),
        ("09811122334", "+919811122334", "9811122334"),
        ("9811122334", "+919811122334", "9811122334"),
        ("+91-88001-22334", "+918800122334", "8800122334"),
        ("07011122334", "+917011122334", "7011122334"),
        ("6399122334", "+916399122334", "6399122334"),
        ("00919811122334", "+919811122334", "9811122334"),
    ]
    for raw, expected_norm, expected_10 in valid_samples:
        assert normalize_indian_mobile(raw) == expected_norm, f"Failed on {raw}"
        assert is_valid_indian_mobile(raw) is True
        is_val, norm, ten_d = check_phone_is_valid_indian_mobile(raw)
        assert is_val is True
        assert norm == expected_norm
        assert ten_d == expected_10


def test_whatsapp_phone_validation_rejects_landlines():
    """All landlines (Delhi 011, Noida 0120, Gurugram 0124, Mumbai 022, etc.) must be rejected."""
    landlines = [
        "011-2651-4321",  # Delhi STD 011 (8-digit number)
        "01126514321",
        "+91-011-26514321",
        "0120-4567890",  # Noida STD 0120 (7-digit number)
        "01204567890",
        "0124-4567890",  # Gurugram STD 0124
        "022-26514321",  # Mumbai STD 022
        "033-22334455",  # Kolkata STD 033
        "080-22334455",  # Bengaluru STD 080
        "1800-11-2233",  # Toll free
        "26514321",  # Local 8-digit without STD
        "5555512345",  # Starts with 5 (not an Indian mobile)
        "1234567890",  # Starts with 1
        "",  # Empty
        None,  # None
        "invalid",  # Text
    ]
    for phone in landlines:
        assert normalize_indian_mobile(phone) is None, f"Landline {phone} was unexpectedly accepted"
        assert is_valid_indian_mobile(phone) is False
        is_val, norm, ten_d = check_phone_is_valid_indian_mobile(phone)
        assert is_val is False
        assert norm is None


# ---------------------------------------------------------------------------
# 2. Fast Website Filter Tests
# ---------------------------------------------------------------------------


def test_fast_website_filter_allows_empty_and_aggregators():
    """Allows empty, social links, linktree, wa.me, and business.site."""
    allowed_cases = [
        "",
        None,
        "   ",
        "https://www.instagram.com/dr_arora_dental",
        "http://instagram.com/clinic_delhi",
        "https://facebook.com/dentalcarecentre",
        "https://www.facebook.com/pages/dentist",
        "https://linktr.ee/dentistdelhi",
        "https://wa.me/919811122334",
        "https://api.whatsapp.com/send?phone=919811122334",
        "https://dr-sharma-dental.business.site",
        "http://smiles.business.site/about",
        "https://maps.google.com/?cid=123456789",
        "https://goo.gl/maps/xyz",
        "https://www.practo.com/delhi/clinic/dr-sharma",
        "https://www.justdial.com/Delhi/Dr-Gupta-Dental",
    ]
    for url in allowed_cases:
        allowed, host = is_allowed_discovery_website(url)
        assert allowed is True, f"URL {url} (host {host}) should be allowed"


def test_fast_website_filter_rejects_independent_custom_domains():
    """Instantly rejects any candidate with an independent custom domain website."""
    rejected_cases = [
        ("https://www.drsharma.in", "drsharma.in"),
        ("http://apexdentalcare.com/services", "apexdentalcare.com"),
        ("https://smiledentaldelhi.co.in", "smiledentaldelhi.co.in"),
        ("http://delhidentist.org", "delhidentist.org"),
        ("https://clovedental.in", "clovedental.in"),
        ("https://fortishealthcare.com", "fortishealthcare.com"),
    ]
    for url, expected_host in rejected_cases:
        allowed, host = is_allowed_discovery_website(url)
        assert allowed is False, f"URL {url} should be rejected"
        assert host == expected_host


# ---------------------------------------------------------------------------
# 3. Triply-Redundant Deduplication & Rejection Cache Tests
# ---------------------------------------------------------------------------


@pytest.fixture()
def in_memory_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    seed_initial_data(db, include_demo_leads=False)
    yield db
    db.close()


def test_triply_redundant_deduplication(in_memory_db):
    """Verifies deduplication across Place ID, clean business name, and 10-digit mobile."""
    # Seed an existing lead into DB
    hustle = in_memory_db.query(Hustle).first()
    stage = in_memory_db.query(Stage).first()

    existing = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        status="STAGED",
        slug="apex-dental-saket",
        name="Apex Dental Clinic",
        primary_phone="+919811100001",
        phones=["+919811100001"],
        custom_fields={"place_id": "PLACE_APEX_123"},
    )
    in_memory_db.add(existing)
    in_memory_db.commit()

    dedup = DiscoveryDeduplicator(db=in_memory_db, ignore_test_leads=False)

    # 1. Duplicate Place ID
    c_pid = Candidate(name="Different Name", place_id="PLACE_APEX_123", phone="+919822233344")
    is_dup, reason = dedup.check_duplicate(c_pid)
    assert is_dup is True
    assert "Place ID" in reason

    # 2. Duplicate Name
    c_name = Candidate(name="Apex Dental Clinic", place_id="PLACE_NEW_999", phone="+919822233344")
    is_dup, reason = dedup.check_duplicate(c_name)
    assert is_dup is True
    assert "already exists" in reason

    # 3. Duplicate Phone
    c_phone = Candidate(name="Brand New Dental Care", place_id="PLACE_NEW_888", phone="09811100001")
    is_dup, reason = dedup.check_duplicate(c_phone)
    assert is_dup is True
    assert "Phone number" in reason

    # 4. Completely New Candidate
    c_clean = Candidate(name="Shining Smiles Dental", place_id="PLACE_NEW_777", phone="+919876543210")
    is_dup, reason = dedup.check_duplicate(c_clean)
    assert is_dup is False
    assert reason is None


def test_rejection_cache_instant_skip(in_memory_db):
    """When a candidate is rejected, it is cached and skipped in subsequent locality checks."""
    dedup = DiscoveryDeduplicator(db=in_memory_db, ignore_test_leads=False)

    cand = Candidate(
        name="Dr. Sharma Dental Hospital",
        place_id="PLACE_SHARMA_456",
        phone="+919811155555",
        website="https://drsharma.in",
    )

    # Initially not rejected
    is_rej, info = dedup.check_rejection_cache(cand)
    assert is_rej is False

    # Record rejection due to active custom website
    dedup.record_rejection(cand, reason="has_official_domain", detail="Active site: drsharma.in", domain="drsharma.in")

    # In-memory check must be instant
    is_rej, info = dedup.check_rejection_cache(cand)
    assert is_rej is True
    assert "rejected" in info.get("detail", "").lower() or info.get("reason") == "cached_session_rejection"

    # Persistent check on a fresh deduplicator instance must also find the rejection
    fresh_dedup = DiscoveryDeduplicator(db=in_memory_db, ignore_test_leads=False)
    is_rej, info = fresh_dedup.check_rejection_cache(cand)
    assert is_rej is True
    assert info.get("reason") == "has_official_domain"
    assert "drsharma.in" in info.get("detail", "")


# ---------------------------------------------------------------------------
# 4. Lead Staging & 210-Lead Buffer Ceiling Tests
# ---------------------------------------------------------------------------


def test_discovery_service_stages_leads_and_enforces_ceiling(in_memory_db):
    """Discovery stages leads with status 'STAGED' and hard-caps at 210 leads."""
    hustle = in_memory_db.query(Hustle).first()
    stage = in_memory_db.query(Stage).first()

    # Pre-seed 208 STAGED leads
    for i in range(208):
        lead = Lead(
            hustle_id=hustle.id,
            stage_id=stage.id,
            status="STAGED",
            slug=f"preseed-clinic-{i}",
            name=f"Preseed Clinic {i}",
            primary_phone=f"+9198000{i:05d}",
            phones=[f"+9198000{i:05d}"],
            custom_fields={"place_id": f"PID_PRESEED_{i}"},
        )
        in_memory_db.add(lead)
    in_memory_db.commit()

    initial_count = DiscoveryService.get_staged_count(in_memory_db, hustle_id=hustle.id, testing_mode=False)
    assert initial_count == 208

    # Mock provider yielding 5 candidates
    mock_candidates = [
        Candidate(
            name=f"New Staged Clinic {i}",
            place_id=f"PID_NEW_{i}",
            phone=f"+9197111{i:05d}",
            website="",
            rating=4.8,
            review_count=35,
            source_tier="Mock Provider",
        )
        for i in range(5)
    ]

    mock_provider = MagicMock()
    mock_provider.name = "mock_provider"
    mock_provider.search_candidates.return_value = mock_candidates

    with patch(
        "app.autopilot.discovery.waterfall.CandidateStream._init_default_providers",
        return_value=[mock_provider],
    ):
        # Request 10 leads, but ceiling is 210, so only 2 can be staged!
        res = DiscoveryService.run_discovery_and_staging(
            db=in_memory_db,
            hustle_id=hustle.id,
            target_count=10,
            locality="South Extension",
            testing_mode=False,
        )

        assert res["newly_staged_count"] == 2
        assert res["total_staged_count"] == 210
        assert res["staging_ceiling"] == STAGING_BUFFER_CEILING

        # Verify staged lead in DB
        staged_leads = in_memory_db.query(Lead).filter(Lead.status == "STAGED").all()
        assert len(staged_leads) == 210

        # Run discovery again when already at ceiling 210
        full_res = DiscoveryService.run_discovery_and_staging(
            db=in_memory_db,
            hustle_id=hustle.id,
            target_count=10,
            locality="South Extension",
            testing_mode=False,
        )
        assert full_res["status"] == "full"
        assert full_res["newly_staged_count"] == 0
        assert full_res["total_staged_count"] == 210


# ---------------------------------------------------------------------------
# 5. Dedicated API Endpoint Tests
# ---------------------------------------------------------------------------


def test_discover_api_endpoint(client: TestClient):
    """POST /api/autopilot/discover exposes standalone lead discovery."""
    mock_res = {
        "status": "succeeded",
        "run_id": 105,
        "newly_staged_count": 3,
        "total_staged_count": 15,
        "staging_ceiling": 210,
        "found_count": 8,
        "dropped_counts": {"has_official_domain": 3, "no_mobile_whatsapp": 2},
        "staged_leads": [
            {
                "id": 501,
                "name": "Dr. Smile Dental Clinic",
                "phone": "+919811122334",
                "locality": "Saket",
                "status": "STAGED",
            }
        ],
    }

    with patch(
        "app.controllers.pipeline_controller.PipelineController.discover_leads",
        return_value=mock_res,
    ) as mock_ctrl:
        res = client.post(
            "/api/autopilot/discover",
            json={"hustle_id": 1, "target_count": 3, "locality": "Saket"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["newly_staged_count"] == 3
        assert data["total_staged_count"] == 15
        assert data["staging_ceiling"] == 210
        assert len(data["staged_leads"]) == 1
        assert data["staged_leads"][0]["status"] == "STAGED"
        mock_ctrl.assert_called_once()
