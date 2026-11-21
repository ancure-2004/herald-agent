from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.entities import Lead, LeadFact, Package
from app.safety import compute_fit_score


def create_lead_package_and_facts(
    db: Session,
    hustle_id: int,
    stage_id: int,
    slug: str,
    cand: Dict[str, Any],
    payload: Dict[str, Any],
    gate_report: Dict[str, Any],
    base_url: str,
    testing_mode: bool = False,
    test_run_id: Optional[int] = None,
    city: str = "Delhi NCR",
) -> Tuple[Lead, Package]:
    now = datetime.now(timezone.utc)
    base = base_url.rstrip("/")
    clean_name = cand["clean_name"]
    doc_name = cand.get("doc_name") or ""
    degrees = cand.get("degrees") or ""
    source_tier = cand.get("source_tier") or "Discovery Waterfall"

    lead_kwargs: Dict[str, Any] = {
        "hustle_id": hustle_id,
        "stage_id": stage_id,
        "slug": slug,
        "name": clean_name,
        "doctor_name": doc_name if doc_name != "Our Dental Team" else "",
        "locality": cand.get("locality") or city,
        "city": city,
        "address": cand.get("address") or f"{cand.get('locality') or city}, {city}",
        "primary_phone": cand.get("norm_phone") or "",
        "phones": [cand.get("norm_phone")] if cand.get("norm_phone") else [],
        "preferred_channel": "whatsapp",
        "next_action": "Record walkthrough video & approve WhatsApp pitch",
        "next_action_due_at": now + timedelta(hours=6),
        "custom_fields": {
            "degrees": degrees,
            "consultation_fee": payload["clinic"].get("consultationFee", "Contact the clinic for consultation fees"),
            "operating_hours": (cand.get("hours_obj") or {}).get("notes", "Call to confirm hours"),
            "discovery_source_tier": source_tier,
            "raw_maps_title": cand.get("title", clean_name),
        },
        "ai_fields": {
            "multi_doctor_or_implant_center": "implant" in str(cand.get("title", "")).lower() or "mds" in degrees.lower(),
            "primary_specialty": degrees,
            "discovery_tier": source_tier,
        },
        "what_changed_summary": f"Discovered via {source_tier}, verified no website, built 3 live designs (/demo/{slug}).",
        "deal_value_inr": 15000,
    }
    if hasattr(Lead, "is_test"):
        lead_kwargs["is_test"] = testing_mode
    if hasattr(Lead, "test_run_id"):
        lead_kwargs["test_run_id"] = test_run_id

    lead = Lead(**lead_kwargs)
    db.add(lead)
    db.flush()

    # Truthful LeadFacts
    facts: List[LeadFact] = []
    rating = cand.get("rating")
    reviews = cand.get("reviews")
    if rating is not None:
        facts.append(
            LeadFact(
                lead_id=lead.id,
                field="google_rating",
                value=f"{rating}★",
                source=source_tier,
                confidence=1.0 if "Google" in source_tier else 0.85,
                verified_by_two_sources=False,
            )
        )
    if reviews is not None:
        facts.append(
            LeadFact(
                lead_id=lead.id,
                field="review_count",
                value=f"{reviews} reviews",
                source=source_tier,
                confidence=1.0 if "Google" in source_tier else 0.85,
                verified_by_two_sources=False,
            )
        )

    verdict_source = (cand.get("verdict") or {}).source if isinstance(cand.get("verdict"), dict) else getattr(cand.get("verdict"), "source", source_tier)
    facts.append(
        LeadFact(
            lead_id=lead.id,
            field="website_check",
            value="Confirmed zero official domain",
            source=verdict_source,
            confidence=0.95,
            verified_by_two_sources=False,
        )
    )

    if doc_name and doc_name != "Our Dental Team":
        doc_src = cand.get("doc_source", "Title Extraction")
        two_sources = "Verified Search Snippet" in doc_src
        facts.append(
            LeadFact(
                lead_id=lead.id,
                field="doctor_name",
                value=f"{doc_name} ({degrees})" if degrees else doc_name,
                source=doc_src,
                confidence=0.95 if two_sources else 0.85,
                verified_by_two_sources=two_sources,
            )
        )

    hours_obj = cand.get("hours_obj") or {}
    if hours_obj.get("verified"):
        facts.append(
            LeadFact(
                lead_id=lead.id,
                field="operating_hours",
                value=hours_obj.get("notes", ""),
                source="Tier 1: Google Places API",
                confidence=1.0,
                verified_by_two_sources=False,
            )
        )

    for f in facts:
        db.add(f)

    fit, fit_reasons = compute_fit_score(
        facts,
        bool(doc_name and doc_name != "Our Dental Team"),
        True,
        False,
        lead.ai_fields,
    )
    lead.fit_score = min(100, max(0, int(fit)))
    lead.fit_reasons = fit_reasons

    # Quality score
    q_score = 65
    if doc_name and doc_name != "Our Dental Team":
        q_score += 15
    if hours_obj.get("verified"):
        q_score += 10
    if rating and float(str(rating).replace("★", "").strip() or 0) >= 4.5:
        q_score += 10

    pkg = Package(
        lead_id=lead.id,
        version=1,
        asset_links={
            "choice_page": f"{base}/demo/{slug}",
            "modern": f"{base}/modern/{slug}",
            "premium": f"{base}/premium/{slug}",
            "warm": f"{base}/warm/{slug}",
        },
        video_file_path=None,  # Not set until video actually exists on disk!
        video_size_mb=0.0,
        clinic_payload=payload,
        quality_score=q_score,
        self_check_passed=True,
        self_check_report=gate_report,
        status="video_pending",
    )
    db.add(pkg)
    db.flush()

    return lead, pkg
