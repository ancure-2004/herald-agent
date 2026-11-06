import logging
import re
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.autopilot.discovery.localities import Locality
from app.autopilot.log_tags import TAG_DROP, TAG_OK
from app.autopilot.search.base import WebSearchProvider
from app.autopilot.settings import get_autopilot_settings
from app.autopilot.types import Candidate, VerifiedCandidate
from app.autopilot.utils.address import extract_locality
from app.autopilot.utils.text import clean_clinic_name
from app.autopilot.verification.filters import is_hospital_or_chain
from app.autopilot.verification.phone_check import check_phone_is_valid_indian_mobile
from app.autopilot.verification.website_check import check_candidate_website

logger = logging.getLogger("personal_os.autopilot.verification.verifier")


def verify_single_candidate(
    candidate: Candidate,
    locality: Locality,
    seen_phones: set,
    seen_names: set,
    search_provider: Optional[WebSearchProvider],
    db: Optional[Session] = None,
    testing_mode: bool = False,
) -> Tuple[Optional[VerifiedCandidate], Optional[Dict[str, Any]]]:
    """
    Verifies a candidate against DB deduplication, hospital stopwords, mobile phone, and website existence.
    Returns (VerifiedCandidate, None) on success, or (None, drop_info_dict) on rejection.
    """
    settings = get_autopilot_settings()
    title = candidate.name.strip()
    clean_name = clean_clinic_name(title)
    full_clean = re.sub(r"[^a-z0-9]", "", title.lower())
    short_clean = re.sub(r"[^a-z0-9]", "", re.split(r"[-|:]", title)[0].lower())

    # 1. DB dedupe by name
    is_name_in_db = (full_clean and full_clean in seen_names) or (len(short_clean) >= 6 and short_clean in seen_names)
    if is_name_in_db:
        if not testing_mode:
            logger.info("%s '%s' -> Already exists in CRM database", TAG_DROP, title)
            return None, {
                "name": title,
                "reason": "already_in_db",
                "detail": "Clinic name already exists in CRM database",
            }
        else:
            logger.info("TESTING MODE: '%s' exists in DB -> allowing live test re-verification", title)

    # 2. Hospital / Chain filter
    is_chain, chain_reason = is_hospital_or_chain(title)
    if is_chain:
        logger.info("%s '%s' -> %s", TAG_DROP, title, chain_reason)
        return None, {"name": title, "reason": "hospital_or_chain", "detail": chain_reason}

    # 3. Valid Indian mobile check
    is_valid_phone, norm_phone, ten_digit = check_phone_is_valid_indian_mobile(candidate.phone)
    if not is_valid_phone or not norm_phone:
        logger.info(
            "%s '%s' -> Invalid or missing Indian mobile WhatsApp number (%s)", TAG_DROP, title, candidate.phone
        )
        return None, {
            "name": title,
            "reason": "no_mobile_whatsapp",
            "detail": f"Invalid/landline phone: {candidate.phone or 'none'}",
        }

    # 4. Phone DB dedupe
    if ten_digit in seen_phones:
        if not testing_mode:
            logger.info("%s '%s' -> Phone %s already in CRM database", TAG_DROP, title, norm_phone)
            return None, {
                "name": title,
                "phone": norm_phone,
                "reason": "already_in_db",
                "detail": f"Phone {norm_phone} already in CRM",
            }
        else:
            logger.info("TESTING MODE: '%s' phone %s in DB -> allowing live test re-verification", title, norm_phone)

    # 5. Website check
    locality_name = extract_locality(candidate.address, default_city=locality.city)
    verdict, organic = check_candidate_website(
        candidate=candidate,
        search_provider=search_provider,
        locality_label=locality_name,
        last10_phone=ten_digit,
        db=db,
        testing_mode=testing_mode,
    )

    if verdict.status == "HAS_SITE":
        logger.info("%s '%s' -> Has existing website: %s", TAG_DROP, title, verdict.domain)
        return None, {
            "name": title,
            "phone": norm_phone,
            "reason": "has_official_domain",
            "detail": f"Active site: {verdict.domain}",
        }

    if verdict.status == "UNVERIFIED":
        if settings.website_check_on_unverified == "hold":
            logger.warning("%s '%s' -> Website check unverified (holding candidate)", TAG_DROP, title)
            return None, {
                "name": title,
                "phone": norm_phone,
                "reason": "website_check_unverified",
                "detail": f"Search unavailable: {'; '.join(verdict.evidence)}. Retry suggested when search returns.",
            }

    # Passed!
    logger.info("%s '%s' passed verification (No website, valid mobile %s)", TAG_OK, clean_name, norm_phone)
    verified = VerifiedCandidate(
        candidate=candidate,
        clean_name=clean_name,
        locality=locality_name,
        norm_phone=norm_phone,
        ten_digit=ten_digit,
        verdict=verdict,
        address=candidate.address,
        full_clean_name=full_clean,
        short_clean_name=short_clean,
        organic_results=organic,
    )
    return verified, None
