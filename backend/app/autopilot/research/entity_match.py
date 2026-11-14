import re
from typing import Tuple


def verify_search_entity_match(
    lead_name: str,
    locality: str,
    lead_phone: str,
    result_url: str,
    result_title: str,
    result_snippet: str,
) -> Tuple[bool, str]:
    """
    Enforces entity matching: search-derived facts are accepted only if
    phone matches or full locality + clinic tokens match. Discards conflicting localities.
    """
    blob = f"{result_url} {result_title} {result_snippet}".lower()
    if lead_phone:
        ten_digit = re.sub(r"\D", "", lead_phone)[-10:]
        if ten_digit and ten_digit in blob:
            return True, f"Direct phone match ({ten_digit})"

    norm_loc = locality.lower().strip()
    loc_clean = re.sub(r"[^a-z0-9\s]", " ", norm_loc).strip()
    loc_match = False
    if loc_clean and loc_clean not in ("delhi", "new delhi", "delhi ncr", "india"):
        loc_words = [w for w in loc_clean.split() if w not in ("nagar", "vihar", "enclave", "sector", "block", "phase")]
        if loc_clean in blob:
            loc_match = True
        elif loc_words and all(w in blob for w in loc_words):
            loc_match = True

    name_clean = re.sub(r"[^a-z0-9\s]", " ", lead_name.lower())
    ignore_words = {"dental", "clinic", "care", "centre", "center", "studio", "and", "the", "delhi", "new", "dr"}
    name_tokens = [w for w in name_clean.split() if len(w) >= 3 and w not in ignore_words]
    name_matches = [w for w in name_tokens if w in blob]

    if loc_match and len(name_matches) >= 1:
        return True, f"Locality matched ('{loc_clean}') and clinic tokens matched: {name_matches}"

    return False, f"Entity match failed: loc_match={loc_match}, name_matches={name_matches}"
