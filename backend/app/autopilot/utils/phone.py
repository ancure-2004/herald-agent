import re
from typing import Optional


def extract_last_10_digits(phone_str: str) -> str:
    """Extracts last 10 digits from any phone representation."""
    digits = re.sub(r"\D", "", phone_str or "")
    return digits[-10:] if len(digits) >= 10 else ""


def normalize_indian_mobile(raw_phone: str) -> Optional[str]:
    """
    Normalizes Indian mobile number to +91XXXXXXXXXX format.
    Returns None if not a valid 10-digit Indian mobile (starting with 6, 7, 8, or 9).
    """
    digits = re.sub(r"\D", "", raw_phone or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    return None


def is_valid_indian_mobile(raw_phone: str) -> bool:
    """Returns True if the phone is a valid Indian mobile number."""
    return normalize_indian_mobile(raw_phone) is not None
