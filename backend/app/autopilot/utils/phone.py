import re
from typing import Optional, Tuple


def extract_last_10_digits(phone_str: str) -> str:
    """Extracts last 10 digits from any phone representation."""
    digits = re.sub(r"\D", "", phone_str or "")
    return digits[-10:] if len(digits) >= 10 else ""


def normalize_indian_mobile(raw_phone: str) -> Optional[str]:
    """
    Normalizes Indian mobile number to +91XXXXXXXXXX format.
    Strictly requires a 10-digit Indian mobile number starting with 6, 7, 8, or 9.
    Rejects all landlines (e.g. 011, 0120, 0124, 022, 033, 080) and non-mobile numbers.
    Returns None if not a valid 10-digit Indian mobile.
    """
    digits = re.sub(r"\D", "", raw_phone or "")
    if digits.startswith("0091"):
        digits = digits[4:]
    elif digits.startswith("91") and len(digits) > 10:
        digits = digits[2:]

    if digits.startswith("0"):
        digits = digits[1:]

    # Landline exclusion: Bengaluru (080) and Ahmedabad (079) with 8-digit PSTN (starts with 2-6)
    if digits.startswith("80") and len(digits) == 10 and digits[2] in "23456":
        return None
    if digits.startswith("79") and len(digits) == 10 and digits[2] in "23456":
        return None

    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    return None


def is_valid_indian_mobile(raw_phone: str) -> bool:
    """Returns True if the phone is a valid Indian mobile number."""
    return normalize_indian_mobile(raw_phone) is not None


def check_phone_is_valid_indian_mobile(raw_phone: str) -> Tuple[bool, Optional[str], str]:
    """
    Validates phone number for Indian WhatsApp outreach.
    Returns (is_valid, normalized_phone, ten_digit).
    """
    norm = normalize_indian_mobile(raw_phone)
    if not norm:
        return False, None, ""
    ten_digit = norm[-10:]
    return True, norm, ten_digit
