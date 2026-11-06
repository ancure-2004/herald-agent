from typing import Optional, Tuple

from app.autopilot.utils.phone import extract_last_10_digits, normalize_indian_mobile


def check_phone_is_valid_indian_mobile(raw_phone: str) -> Tuple[bool, Optional[str], str]:
    """
    Validates phone number for Indian WhatsApp outreach.
    Returns (is_valid, normalized_phone, ten_digit).
    """
    norm = normalize_indian_mobile(raw_phone)
    if not norm:
        return False, None, ""
    ten_digit = extract_last_10_digits(norm)
    return True, norm, ten_digit
