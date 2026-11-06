import re
from typing import List


def extract_locality(address: str, fallback_query: str = "", default_city: str = "Delhi NCR") -> str:
    """Extracts neighborhood name, strictly rejecting 6-digit postal pincodes."""
    parts = [p.strip() for p in address.split(",") if p.strip()]
    cleaned_parts: List[str] = []
    ignore_places = {
        "india",
        "delhi",
        "new delhi",
        "delhi ncr",
        "bengaluru",
        "bangalore",
        "karnataka",
        "haryana",
        "uttar pradesh",
    }
    if default_city:
        ignore_places.add(default_city.lower())

    for p in parts:
        if re.search(r"^\d{5,6}$", p):
            continue
        if p.lower() in ignore_places:
            continue
        cleaned_parts.append(p)

    if cleaned_parts:
        candidate = cleaned_parts[-1]
        m_sector = re.search(r"\bSector\s+\d+\s+([A-Za-z]+)", candidate, re.I)
        if m_sector:
            return m_sector.group(1).strip()
        return candidate

    m = re.search(
        r"\bin\s+([A-Za-z\s]+?)(?:\s+(?:delhi|bengaluru|bangalore|noida|gurugram)|\s*$)", fallback_query, re.I
    )
    if m:
        return m.group(1).strip()
    return default_city or "Delhi NCR"
