"""
Dental Hustle End-to-End Pipeline
---------------------------------
Orchestrates the full lifecycle:
Lead Intake -> Clinic Dossier Persistence -> Engine Validation -> Recorder Queue -> Outreach Message Generation
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import Lead, Package, Stage

from ..adapters import (
    default_clinic_engine,
    default_recorder,
    generate_email_pitch,
    generate_instagram_pitch,
    generate_whatsapp_pitch,
)
from ..orchestrator import (
    build_canonical_clinic_payload,
    clean_clinic_name,
    extract_locality,
    generate_clean_slug,
    parse_places_opening_hours,
    run_self_check_gate,
    verify_live_demo_links,
)

logger = logging.getLogger("personal_os.autopilot.dental_pipeline")


class DentalPipeline:
    """End-to-end orchestration pipeline for Dental Clinic website client delivery."""

    def __init__(
        self,
        clinic_engine=default_clinic_engine,
        recorder=default_recorder,
    ):
        self.clinic_engine = clinic_engine
        self.recorder = recorder

    def process_lead(
        self,
        db: Session,
        lead_id: int,
        base_url: str = "http://localhost:3001",
        persist_dossier: bool = True,
        auto_queue_recorder: bool = True,
    ) -> Dict[str, Any]:
        """Processes an individual Lead through validation, dossier creation, and outreach."""
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise ValueError(f"Lead #{lead_id} not found")

        c_name = clean_clinic_name(lead.name)
        meta = getattr(lead, "custom_fields", {}) or getattr(lead, "crm_metadata", {}) or {}
        slug = getattr(lead, "slug", "") or meta.get("slug") or generate_clean_slug(c_name)
        locality = getattr(lead, "locality", "") or meta.get("locality") or extract_locality(getattr(lead, "address", "") or "")
        hours = parse_places_opening_hours(None)
        fee = int(meta.get("consultation_fee") or 500)
        rating = meta.get("rating") or getattr(lead, "rating", 4.9) or 4.9
        review_count = meta.get("review_count") or getattr(lead, "review_count", 42) or 42

        payload = build_canonical_clinic_payload(
            slug=slug,
            clinic_name=c_name,
            doctor_name=getattr(lead, "doctor_name", "") or "",
            qualifications=meta.get("qualifications", ""),
            locality=locality,
            address=getattr(lead, "address", "") or locality,
            phone_raw_str=getattr(lead, "primary_phone", "") or "+919811000000",
            rating=str(rating),
            review_count=str(review_count),
            consultation_fee=f"₹{fee}",
            opening_hours=hours,
        )

        # 1. Self check safety gate
        is_safe, violations = run_self_check_gate(payload)

        # 2. Persist dossier into Next.js engine
        written_files = {}
        if persist_dossier and is_safe:
            written_files = self.clinic_engine.save_clinic_dossier(slug, payload)

        # 3. Verify live routes
        links_ok, link_details = verify_live_demo_links(slug, base_url)

        # 4. Generate outreach messages
        clinic_info = {
            "id": lead.id,
            "name": c_name,
            "slug": slug,
            "doc_name": getattr(lead, "doctor_name", ""),
            "locality": locality,
            "phone": getattr(lead, "primary_phone", ""),
            "rating": rating,
            "review_count": review_count,
        }
        outreach = {
            "whatsapp": generate_whatsapp_pitch(clinic_info, base_url),
            "instagram": generate_instagram_pitch(clinic_info, base_url),
            "email": generate_email_pitch(clinic_info, base_url),
        }

        # 5. Queue in batch.json if verified
        recorder_queued = False
        if auto_queue_recorder and links_ok:
            batch_items = self.recorder.read_batch_json()
            item_name = f"Clinic-{lead.id}-{slug}"
            item_url = f"{base_url.rstrip('/')}/modern/{slug}"
            if not any(item.get("name") == item_name for item in batch_items):
                batch_items.append({"name": item_name, "url": item_url})
                self.recorder.write_batch_json(batch_items)
                recorder_queued = True

        return {
            "lead_id": lead.id,
            "slug": slug,
            "is_safe": is_safe,
            "violations": violations,
            "links_verified": links_ok,
            "link_details": link_details,
            "dossier_saved": bool(written_files),
            "written_files": list(written_files.keys()),
            "recorder_queued": recorder_queued,
            "outreach": outreach,
        }


# Default singleton instance
default_dental_pipeline = DentalPipeline()
