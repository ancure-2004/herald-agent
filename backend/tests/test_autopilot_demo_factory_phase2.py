"""
Unit and Integration Tests for Autopilot Phase 2:
On-Demand Demo Factory (Build & Video Backend)

Covers:
1. FIFO Order & Batch Size Enforcement (oldest staged leads processed first, default 10, max 30).
2. Research Enrichment (doctor name extraction from title/facts, opening hours parsing).
3. Payload Construction (canonical clinic payload with Modern, Premium, Warm templates).
4. Quality Self-Check Gate (pass creates Package and advances to DEMO_READY; fail marks BUILD_FAILED without crashing batch).
5. State Transitions & Immediate Commits (STAGED -> DEMO_READY or BUILD_FAILED, package ready, video path recorded).
6. Zero staged leads handling.
7. Dedicated API Endpoints (POST /api/autopilot/build-batch and /api/v1/autopilot/build-batch, sync & async 202).
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.autopilot.build.factory_service import DemoFactoryService
from app.db.session import Base
from app.models.entities import Hustle, Lead, Package, Stage
from app.seed import seed_initial_data


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


def test_fifo_order_and_batch_size_enforcement(in_memory_db):
    """Oldest staged leads must be processed first (FIFO by Lead.id.asc()) respecting batch_size."""
    hustle = in_memory_db.query(Hustle).first()
    stage = in_memory_db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "discovered").first() or in_memory_db.query(Stage).first()

    # Pre-seed 5 staged leads with sequential IDs
    leads = []
    for i in range(1, 6):
        lead = Lead(
            hustle_id=hustle.id,
            stage_id=stage.id,
            status="STAGED",
            slug=f"fifo-clinic-{i}-saket",
            name=f"FIFO Clinic {i}",
            doctor_name=f"Dr. Doctor {i}",
            locality="Saket",
            city="Delhi NCR",
            address="Saket, Delhi NCR",
            primary_phone=f"+91981110000{i}",
            phones=[f"+91981110000{i}"],
            custom_fields={
                "raw_maps_title": f"FIFO Clinic {i}",
                "discovery_source_tier": "Google Places API",
                "rating": 4.8,
                "review_count": 25,
            },
        )
        in_memory_db.add(lead)
        leads.append(lead)
    in_memory_db.commit()

    # Verify initial staged count is 5
    staged_cnt = DemoFactoryService.get_staged_count(in_memory_db, hustle_id=hustle.id, testing_mode=True)
    assert staged_cnt == 5

    # Process first batch of size 3
    res1 = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=3,
        testing_mode=True,
    )

    assert res1["status"] == "succeeded"
    assert res1["batch_size"] == 3
    assert res1["built_count"] == 3
    assert res1["failed_count"] == 0
    assert res1["remaining_staged_count"] == 2

    # Verify that exactly the oldest 3 leads (IDs of leads[0], leads[1], leads[2]) were built
    built_ids_1 = [item["id"] for item in res1["built_leads"]]
    assert built_ids_1 == [leads[0].id, leads[1].id, leads[2].id]

    for lead_id in built_ids_1:
        l = in_memory_db.query(Lead).filter(Lead.id == lead_id).first()
        assert l.status == "DEMO_READY"
        assert l.next_action == "Outreach via WhatsApp"
        assert l.stage_id == 2  # package_ready stage

    # Verify that the remaining 2 leads are still STAGED
    rem_leads = in_memory_db.query(Lead).filter(Lead.status == "STAGED").order_by(Lead.id.asc()).all()
    assert len(rem_leads) == 2
    assert [l.id for l in rem_leads] == [leads[3].id, leads[4].id]

    # Process second batch to exhaust the queue
    res2 = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=3,
        testing_mode=True,
    )

    assert res2["built_count"] == 2
    assert res2["remaining_staged_count"] == 0
    built_ids_2 = [item["id"] for item in res2["built_leads"]]
    assert built_ids_2 == [leads[3].id, leads[4].id]

    for lead_id in built_ids_2:
        l = in_memory_db.query(Lead).filter(Lead.id == lead_id).first()
        assert l.status == "DEMO_READY"


def test_batch_size_clamping_constraints(in_memory_db):
    """Batch size must clamp to a maximum of 30 and minimum of 1."""
    hustle = in_memory_db.query(Hustle).first()

    # Calling with empty queue tests the clamping directly
    res_large = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=50,
        testing_mode=True,
    )
    assert res_large["batch_size"] == 30

    res_zero = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=0,
        testing_mode=True,
    )
    assert res_zero["batch_size"] == 1


def test_research_enrichment_and_doctor_extraction(in_memory_db):
    """If doctor_name is missing, extract truthful clinician from raw maps title and parse hours."""
    hustle = in_memory_db.query(Hustle).first()
    stage = in_memory_db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "discovered").first() or in_memory_db.query(Stage).first()

    staged_lead = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        status="STAGED",
        slug="kapoor-dental-clinic-noida",
        name="Kapoor Dental Clinic",
        doctor_name="",  # Missing doctor name
        locality="Sector 62 Noida",
        city="Noida",
        address="Sector 62 Noida, Uttar Pradesh",
        primary_phone="+919811234567",
        phones=["+919811234567"],
        custom_fields={
            "raw_maps_title": "Dr. Rohit Kapoor Dental Care & Implant Center",
            "degrees": "BDS, MDS",
            "discovery_source_tier": "Google Places API",
            "places_hours": {
                "periods": [
                    {
                        "open": {"day": 1, "hour": 10, "minute": 0},
                        "close": {"day": 1, "hour": 20, "minute": 0},
                    }
                ],
                "weekdayDescriptions": ["Monday to Saturday: 10:00 AM – 8:00 PM"],
            },
        },
    )
    in_memory_db.add(staged_lead)
    in_memory_db.commit()

    res = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=1,
        testing_mode=True,
    )

    assert res["built_count"] == 1
    updated_lead = in_memory_db.query(Lead).filter(Lead.id == staged_lead.id).first()
    assert updated_lead.doctor_name == "Dr. Rohit Kapoor"
    assert updated_lead.status == "DEMO_READY"

    pkg = in_memory_db.query(Package).filter(Package.lead_id == updated_lead.id).first()
    assert pkg is not None
    assert pkg.clinic_payload["clinic"]["doctor"]["name"] == "Dr. Rohit Kapoor"
    assert pkg.clinic_payload["clinic"]["hours"]["verified"] is True
    assert "Monday to Saturday" in pkg.clinic_payload["clinic"]["hours"]["notes"]


def test_package_creation_and_templates_scaffolded(in_memory_db):
    """Package must be created with 3 live templates and verified asset links."""
    hustle = in_memory_db.query(Hustle).first()
    stage = in_memory_db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "discovered").first() or in_memory_db.query(Stage).first()

    staged_lead = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        status="STAGED",
        slug="prime-dental-studio-gk",
        name="Prime Dental Studio",
        doctor_name="Dr. Priya Bansal",
        locality="Greater Kailash",
        city="Delhi NCR",
        address="Greater Kailash 1, New Delhi",
        primary_phone="+919876543210",
        phones=["+919876543210"],
        custom_fields={
            "raw_maps_title": "Prime Dental Studio",
            "degrees": "BDS",
            "rating": 4.9,
            "review_count": 82,
            "discovery_source_tier": "Google Places API",
        },
    )
    in_memory_db.add(staged_lead)
    in_memory_db.commit()

    res = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=1,
        testing_mode=True,
    )

    assert res["built_count"] == 1
    pkg = in_memory_db.query(Package).filter(Package.lead_id == staged_lead.id).first()
    assert pkg is not None
    assert pkg.status == "ready"
    assert pkg.self_check_passed is True
    assert pkg.quality_score >= 80

    # Verify all 4 asset links
    links = pkg.asset_links
    assert "/demo/prime-dental-studio-gk" in links["choice_page"]
    assert "/modern/prime-dental-studio-gk" in links["modern"]
    assert "/premium/prime-dental-studio-gk" in links["premium"]
    assert "/warm/prime-dental-studio-gk" in links["warm"]

    # Verify 3 templates in clinic_payload
    templates = pkg.clinic_payload.get("templates", {})
    assert "modern" in templates
    assert "premium" in templates
    assert "warm" in templates

    # Video file path must be recorded
    assert pkg.video_file_path is not None
    assert len(pkg.video_file_path) > 0


def test_quality_self_check_fail_handling_non_blocking(in_memory_db):
    """A lead failing the quality self-check gate must be marked BUILD_FAILED without crashing the batch."""
    hustle = in_memory_db.query(Hustle).first()
    stage = in_memory_db.query(Stage).filter(Stage.hustle_id == hustle.id, Stage.slug == "discovered").first() or in_memory_db.query(Stage).first()

    # Lead 1: Valid lead
    lead1 = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        status="STAGED",
        slug="valid-clinic-one-saket",
        name="Valid Clinic One",
        doctor_name="Dr. Ananya Roy",
        locality="Saket",
        city="Delhi NCR",
        address="Saket, New Delhi",
        primary_phone="+919811111111",
        custom_fields={"discovery_source_tier": "Google Places API"},
    )

    # Lead 2: Invalid lead (6-digit pincode in locality violates no_pincode_locality gate rule)
    lead2 = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        status="STAGED",
        slug="invalid-clinic-pincode-saket",
        name="Invalid Clinic Pincode",
        doctor_name="Dr. Test Doctor",
        locality="110017",  # Fails no_pincode_locality rule!
        city="Delhi NCR",
        address="110017",
        primary_phone="+919822222222",
        custom_fields={"discovery_source_tier": "Google Places API"},
    )

    # Lead 3: Valid lead
    lead3 = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        status="STAGED",
        slug="valid-clinic-three-hauz-khas",
        name="Valid Clinic Three",
        doctor_name="Dr. Vikram Seth",
        locality="Hauz Khas",
        city="Delhi NCR",
        address="Hauz Khas, New Delhi",
        primary_phone="+919833333333",
        custom_fields={"discovery_source_tier": "Google Places API"},
    )

    in_memory_db.add_all([lead1, lead2, lead3])
    in_memory_db.commit()

    # Process all 3 in a single batch
    res = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=3,
        testing_mode=True,
    )

    # Batch should succeed with 2 built, 1 failed, without crashing
    assert res["status"] == "succeeded"
    assert res["built_count"] == 2
    assert res["failed_count"] == 1
    assert res["remaining_staged_count"] == 0

    # Lead 1: DEMO_READY
    l1 = in_memory_db.query(Lead).filter(Lead.id == lead1.id).first()
    assert l1.status == "DEMO_READY"

    # Lead 2: BUILD_FAILED with build_error in custom_fields
    l2 = in_memory_db.query(Lead).filter(Lead.id == lead2.id).first()
    assert l2.status == "BUILD_FAILED"
    assert "build_error" in (l2.custom_fields or {})
    assert l2.custom_fields["build_error"]["no_pincode_locality"] is False

    # Lead 3: DEMO_READY
    l3 = in_memory_db.query(Lead).filter(Lead.id == lead3.id).first()
    assert l3.status == "DEMO_READY"

    # Verify structured failure list
    failed_items = res["failed_leads"]
    assert len(failed_items) == 1
    assert failed_items[0]["id"] == lead2.id
    assert failed_items[0]["status"] == "BUILD_FAILED"


def test_zero_staged_leads_returns_gracefully(in_memory_db):
    """Empty staged queue returns gracefully with zero counts."""
    hustle = in_memory_db.query(Hustle).first()

    res = DemoFactoryService.build_batch(
        db=in_memory_db,
        hustle_id=hustle.id,
        batch_size=10,
        testing_mode=True,
    )

    assert res["status"] == "succeeded"
    assert res["built_count"] == 0
    assert res["failed_count"] == 0
    assert res["remaining_staged_count"] == 0
    assert res["built_leads"] == []
    assert res["failed_leads"] == []


def test_build_batch_api_endpoint_synchronous(client: TestClient):
    """POST /api/autopilot/build-batch executes synchronous batch demo building."""
    mock_res = {
        "status": "succeeded",
        "batch_size": 2,
        "built_count": 2,
        "failed_count": 0,
        "remaining_staged_count": 5,
        "built_leads": [
            {
                "id": 101,
                "slug": "clinic-one",
                "name": "Clinic One",
                "status": "DEMO_READY",
            },
            {
                "id": 102,
                "slug": "clinic-two",
                "name": "Clinic Two",
                "status": "DEMO_READY",
            },
        ],
        "failed_leads": [],
    }

    with patch(
        "app.controllers.pipeline_controller.PipelineController.build_batch",
        return_value=mock_res,
    ):
        # Test /api/autopilot/build-batch
        res1 = client.post(
            "/api/autopilot/build-batch",
            json={"hustle_id": 1, "batch_size": 2, "testing_mode": True},
        )
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["built_count"] == 2
        assert data1["remaining_staged_count"] == 5
        assert len(data1["built_leads"]) == 2

        # Test /api/v1/autopilot/build-batch
        res2 = client.post(
            "/api/v1/autopilot/build-batch",
            json={"hustle_id": 1, "batch_size": 2, "testing_mode": True},
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["built_count"] == 2


def test_build_batch_api_endpoint_async(client: TestClient):
    """POST /api/autopilot/build-batch with async_mode=True returns 202 ACCEPTED."""
    mock_res = {
        "status": "running",
        "async": True,
        "message": "Autopilot demo factory batch build started in background thread",
    }

    with patch(
        "app.controllers.pipeline_controller.PipelineController.build_batch",
        return_value=mock_res,
    ):
        res = client.post(
            "/api/autopilot/build-batch",
            json={"hustle_id": 1, "batch_size": 10, "async_mode": True},
        )
        assert res.status_code == 202
        data = res.json()
        assert data["async"] is True
        assert data["status"] == "running"
