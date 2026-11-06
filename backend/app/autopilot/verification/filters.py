from typing import Tuple

from app.autopilot.config import HOSPITAL_CHAIN_STOPWORDS


def is_hospital_or_chain(clinic_name: str) -> Tuple[bool, str]:
    """Checks whether the clinic matches excluded hospital chains or multi-specialty stopwords."""
    lowered = clinic_name.lower()
    for stop in HOSPITAL_CHAIN_STOPWORDS:
        if stop in lowered:
            return True, f"Hospital/Chain stopword: '{stop}'"
    return False, ""
