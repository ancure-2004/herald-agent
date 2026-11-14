"""
Tests for Modular Autopilot Package
-----------------------------------
Verifies the new adapters, config resolution, outreach generation, and pipeline.
"""

from pathlib import Path

from app.autopilot.adapters.clinic_engine import ClinicEngineAdapter
from app.autopilot.adapters.outreach import (
    format_clinic_context,
    generate_whatsapp_pitch,
    get_clean_salutation,
)
from app.autopilot.adapters.recorder import BatchRecorderAdapter
from app.autopilot.config import (
    BATCH_JSON_PATH,
    DENTAL_ENGINE_DIR,
    DENTAL_RECORDER_DIR,
)
from app.autopilot.pipelines.dental_pipeline import DentalPipeline
from app.models import Hustle, Lead, Stage


def test_autopilot_config_resolution():
    assert DENTAL_ENGINE_DIR.exists(), f"{DENTAL_ENGINE_DIR} must exist"
    assert DENTAL_RECORDER_DIR.exists(), f"{DENTAL_RECORDER_DIR} must exist"
    assert (DENTAL_ENGINE_DIR / "package.json").exists()
    assert (DENTAL_RECORDER_DIR / "package.json").exists()
    assert BATCH_JSON_PATH.name == "batch.json"


def test_outreach_salutation_and_templates():
    # Salutation
    assert get_clean_salutation("Dr. Rajeev Verma") == "Dr. Rajeev Verma Ji"
    assert get_clean_salutation("Dr. Rajeev Verma Ji") == "Dr. Rajeev Verma Ji"
    assert get_clean_salutation("") == "Doctor Ji"
    assert get_clean_salutation("Lead Dental Surgeon") == "Doctor Ji"

    # Context & Generators
    sample_clinic = {
        "id": 4,
        "name": "Dentique Dental Care",
        "slug": "dentique-dental-care",
        "doc_name": "Dr. Rajeev Verma",
        "locality": "Sector 76",
        "phone": "+919811000000",
        "rating": 4.9,
        "review_count": 52,
        "recommended_template": "warm",
    }
    ctx = format_clinic_context(sample_clinic, base_url="http://localhost:3001")
    assert ctx["doc_salutation"] == "Dr. Rajeev Verma Ji"
    assert ctx["demo_url"] == "http://localhost:3001/warm/dentique-dental-care"

    # WhatsApp Pitch
    wa = generate_whatsapp_pitch(sample_clinic, base_url="http://localhost:3001")
    assert wa["channel"] == "WhatsApp"
    assert "Namaste Dr. Rajeev Verma Ji 🙏" in wa["text_hook"]
    assert "http://localhost:3001/warm/dentique-dental-care" in wa["video_caption"]


def test_batch_recorder_adapter(tmp_path):
    rec_adapter = BatchRecorderAdapter(recorder_dir=tmp_path)
    test_items = [
        {"name": "Clinic-1", "url": "http://localhost:3001/modern/c1"},
        {"name": "Clinic-2", "url": "http://localhost:3001/warm/c2"},
    ]
    written = rec_adapter.write_batch_json(test_items)
    assert Path(written).exists()

    read_back = rec_adapter.read_batch_json()
    assert len(read_back) == 2
    assert read_back[0]["name"] == "Clinic-1"


def test_clinic_engine_adapter(tmp_path):
    eng_adapter = ClinicEngineAdapter(engine_dir=tmp_path)
    sample_payload = {
        "clinic": {"name": "Test Clinic", "slug": "test-clinic"},
        "claims": {"claims": []},
        "services": {"services": []},
        "faqs": {"faqs": []},
        "templates": {
            "modern": {"theme": "modern"},
            "premium": {"theme": "premium"},
            "warm": {"theme": "warm"},
        },
    }
    written = eng_adapter.save_clinic_dossier("test-clinic", sample_payload)
    assert "clinic" in written
    assert "template_modern" in written
    assert (tmp_path / "data" / "clinics" / "test-clinic" / "clinic.json").exists()

    loaded = eng_adapter.load_clinic_dossier("test-clinic")
    assert loaded is not None
    assert loaded["clinic"]["name"] == "Test Clinic"
    assert "modern" in loaded["templates"]


def test_dental_pipeline_execution(tmp_path):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from app.db.session import Base
    from app.seed import seed_initial_data

    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db_session = TestingSessionLocal()
    seed_initial_data(db_session, include_demo_leads=False)
    hustle = db_session.query(Hustle).first()
    stage = db_session.query(Stage).filter(Stage.hustle_id == hustle.id).first()

    lead = Lead(
        hustle_id=hustle.id,
        stage_id=stage.id,
        slug="apex-family-dental-studio",
        name="Apex Family Dental Studio",
        locality="Gurgaon",
        address="Sector 14, Gurgaon, Delhi NCR",
        primary_phone="+919812345678",
        doctor_name="Dr. Rohit Mehra",
        fit_score=95,
        intent_score=50,
        deal_value_inr=15000,
        custom_fields={"rating": 4.9, "review_count": 38, "consultation_fee": 600},
    )
    db_session.add(lead)
    db_session.commit()

    eng_adapter = ClinicEngineAdapter(engine_dir=tmp_path / "engine")
    rec_adapter = BatchRecorderAdapter(recorder_dir=tmp_path / "recorder")
    pipeline = DentalPipeline(clinic_engine=eng_adapter, recorder=rec_adapter)

    result = pipeline.process_lead(
        db=db_session,
        lead_id=lead.id,
        base_url="http://localhost:3001",
        persist_dossier=True,
        auto_queue_recorder=False,  # don't require mock HTTP server
    )

    assert result["lead_id"] == lead.id
    assert result["slug"] == "apex-family-dental-studio"
    assert result["is_safe"] is True
    assert result["dossier_saved"] is True
    assert "whatsapp" in result["outreach"]
    assert "Dr. Rohit Mehra Ji" in result["outreach"]["whatsapp"]["text_hook"]
