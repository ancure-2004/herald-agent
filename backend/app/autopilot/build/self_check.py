import json
import re
from typing import Any, Dict, List, Optional, Tuple

from app.autopilot.config import (
    ALLOWED_CLAIM_SOURCES,
    ALWAYS_BANNED_CLAIMS,
    BANNED_UNLESS_SOURCED_CLAIMS,
)


def run_self_check_gate(
    payload: Dict[str, Any],
    verified_sources: Optional[List[str]] = None,
) -> Tuple[bool, Dict[str, Any]]:
    """
    Step 6 Self-Check Gate:
    Enforces truthfulness, clean names, non-pincode area/locality/address,
    allowed claim sources, valid slugs, and zero unverified/banned claims.
    """
    raw_json = json.dumps(payload)
    lowered = raw_json.lower()
    sources = verified_sources or []

    clinic = payload.get("clinic", {})
    clinic_name = clinic.get("clinicName", "")
    slug = clinic.get("slug", "")
    locality = clinic.get("locality", "")
    area = clinic.get("area", "")
    address = clinic.get("address", "")
    doc = clinic.get("doctor", {})
    doc_name = doc.get("name", "")

    # 1. Placeholders
    no_placeholders = "needs_client_input" not in lowered and "lorem ipsum" not in lowered

    # 2. Clean clinic name
    clean_name_ok = "|" not in clinic_name and not re.search(
        r"\bDr\.\s+[A-Za-z]+\s+(?:and|&)\s+Dr\.", clinic_name
    )

    # 3. Pincode check on locality, area, and address
    no_pincode = (
        not re.search(r"^\d{6}$", locality.strip())
        and not re.search(r"^\d{6}$", area.split(",")[0].strip())
        and not re.search(r"\bin\s+\d{6}\b", lowered)
        and not re.search(r"^\d{6},\s*", area.lower())
        and not re.search(r"^\d{6}$", address.strip())
    )

    # 4. Valid slug
    valid_slug = (
        not slug.startswith("e2e-")
        and not slug.startswith("test-")
        and not slug.endswith("-")
        and not re.search(r"-[a-z]$", slug)
    )

    # 5. Doctor truthfulness
    no_lead_doc = not bool(re.search(r"\bLead\b", doc_name, re.I))

    # 6. Always banned claims
    no_always_banned = not any(claim in lowered for claim in ALWAYS_BANNED_CLAIMS)

    # 7. Banned unless sourced
    no_unsourced = True
    unsourced_violations: List[str] = []
    for term, validator in BANNED_UNLESS_SOURCED_CLAIMS.items():
        if term in lowered:
            if not validator(sources):
                no_unsourced = False
                unsourced_violations.append(term)

    # 8. Allowed claim sources
    claims = payload.get("claims", {}).get("claims", [])
    valid_sources = True
    invalid_claim_sources: List[str] = []
    for c in claims:
        src = c.get("source", "")
        if src not in ALLOWED_CLAIM_SOURCES and not any(src.startswith(allowed) for allowed in ALLOWED_CLAIM_SOURCES):
            valid_sources = False
            invalid_claim_sources.append(src)

    # 9. Gate check: No unsourced ratings/reviews and no fabricated "4.9"
    has_fabricated_49 = False
    if "4.9" in lowered:
        # 4.9 is only valid if verified in sources or explicitly set in clinic.rating
        if not any("4.9" in str(s) for s in sources) and str(clinic.get("rating", "")) != "4.9":
            has_fabricated_49 = True

    rating_unsourced = False
    for c in claims:
        cid = c.get("id", "")
        if cid in ("claim-rating", "claim-reviews"):
            c_src = c.get("source", "")
            if not c_src or c_src not in ALLOWED_CLAIM_SOURCES:
                rating_unsourced = True

    rating_valid = (not has_fabricated_49) and (not rating_unsourced)

    # 10. Hours consistency
    hours = clinic.get("hours", {})
    consistent_hours = True
    if "by appointment" in hours.get("notes", "").lower():
        sun = next((s for s in hours.get("schedule", []) if s.get("day") == "Sunday"), None)
        if sun and not sun.get("isClosed") and sun.get("open"):
            consistent_hours = False

    # 11. Completeness
    has_phone_and_map = bool(clinic.get("phone")) and bool(clinic.get("mapEmbedUrl"))
    has_six_services = len(payload.get("services", {}).get("services", [])) == 6
    has_six_faqs = len(payload.get("faqs", {}).get("faqs", [])) == 6

    passed = all([
        no_placeholders,
        clean_name_ok,
        no_pincode,
        valid_slug,
        no_lead_doc,
        no_always_banned,
        no_unsourced,
        valid_sources,
        rating_valid,
        consistent_hours,
        has_phone_and_map,
        has_six_services,
        has_six_faqs,
    ])

    report = {
        "no_placeholders": no_placeholders,
        "clean_clinic_name": clean_name_ok,
        "no_pincode_locality": no_pincode,
        "valid_slug": valid_slug,
        "no_lead_doctor": no_lead_doc,
        "no_banned_medical_claims": no_always_banned,
        "no_unsourced_specialty_claims": no_unsourced,
        "valid_claim_sources": valid_sources,
        "rating_valid": rating_valid,
        "consistent_hours": consistent_hours,
        "phone_and_map_present": has_phone_and_map,
        "six_services_and_faqs": has_six_services and has_six_faqs,
        "unsourced_violations": unsourced_violations,
        "invalid_claim_sources": invalid_claim_sources,
    }
    return passed, report
