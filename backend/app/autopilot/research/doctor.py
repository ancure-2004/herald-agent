import re
from typing import Any, Dict, List, Tuple

from app.autopilot.research.entity_match import verify_search_entity_match


def extract_doctor_and_degrees(
    clinic_title: str,
    organic_results: List[Dict[str, Any]],
    lead_phone: str = "",
    locality: str = "",
) -> Tuple[str, str, str]:
    """
    Extracts truthful doctor name and degrees.
    1. Extracts doctor name from Google Maps title if present.
    2. Validates any search result using entity matching before extracting facts.
    3. Never invents BDS or MDS degrees unless explicitly present in source.
    4. If unknown, returns ('Our Dental Team', '', '').
    """
    # 1. Check title for multiple doctors e.g. 'Dr. Sakshi Jainer and Dr. Vishal Sharma'
    m_multi = re.search(
        r"(Dr\.?\s+[A-Za-z]+(?:\s+[A-Za-z]+)?(?:\s+(?:and|&)\s+Dr\.?\s+[A-Za-z]+(?:\s+[A-Za-z]+)?)+)",
        clinic_title,
        re.I,
    )
    if m_multi:
        doc_str = m_multi.group(1).strip()
        degrees = "MDS" if "mds" in clinic_title.lower() else ("BDS" if "bds" in clinic_title.lower() else "")
        return doc_str, degrees, "Google Maps Title"

    # 2. Check title for single doctor e.g. 'Dr. Ankita's Dental Care'
    m_single = re.search(r"\b(Dr\.?\s+[A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?)", clinic_title)
    if m_single:
        cand = m_single.group(1).strip()
        if not any(w in cand.lower() for w in ["dental", "clinic", "care", "implant", "ortho"]):
            degrees = "MDS" if "mds" in clinic_title.lower() else ("BDS" if "bds" in clinic_title.lower() else "")
            return cand, degrees, "Google Maps Title"

    # 3. Check search results with entity verification
    for item in organic_results:
        url = item.get("link") or item.get("href") or ""
        title = item.get("title", "")
        snip = item.get("snippet") or item.get("body", "")
        matched, reason = verify_search_entity_match(clinic_title, locality, lead_phone, url, title, snip)
        if not matched:
            continue
        blob = f"{title} {snip}"
        m_doc = re.search(r"\b(Dr\.?\s+[A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?)", blob)
        if m_doc:
            cand = m_doc.group(1).strip()
            if not any(w in cand.lower() for w in ["dental", "clinic", "care", "implant", "ortho"]):
                degrees = "MDS" if "mds" in blob.lower() else ("BDS" if "bds" in blob.lower() else "")
                return cand, degrees, f"Verified Search Snippet: {reason}"

    return "Our Dental Team", "", "Neutral Default"
