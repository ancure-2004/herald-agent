import re
from typing import List


def clean_clinic_name(raw_title: str) -> str:
    """Strips SEO, panel, and location suffixes from Maps titles."""
    name = raw_title.split("|")[0].strip()
    name = re.split(r"\s+-\s+", name)[0].strip()
    name = re.split(r"-\s*Dr\.?\s+", name, flags=re.I)[0].strip()
    name = re.split(r"\.\s*Dr\.", name, flags=re.I)[0].strip()
    name = re.sub(
        r"\s*\([^)]*(?:under\s+cghs|cghs|dghes|mcd|panel|govt|near\s+|opp\.?|behind\s+|sector|delhi|noida|gurgaon|gurugram|ncr|branch|formerly)[^)]*\)\s*$",
        "",
        name,
        flags=re.I,
    ).strip()
    name = re.sub(
        r"\s+(?:Best Dentist|Dental Clinic near me|Tooth pain).*$",
        "",
        name,
        flags=re.I,
    ).strip()
    return name.rstrip(".,- ")


def short_clinic_name(clean_name: str, max_len: int = 20) -> str:
    """Cuts clinic name cleanly on word boundaries (<= max_len chars)."""
    words = clean_name.split()
    result: List[str] = []
    current_len = 0
    for w in words:
        add_len = len(w) if not result else len(w) + 1
        if current_len + add_len <= max_len:
            result.append(w)
            current_len += add_len
        else:
            break
    return " ".join(result) if result else clean_name[:max_len].strip()


def generate_clean_slug(clean_name: str, max_len: int = 45) -> str:
    """Generates a clean URL slug cutting strictly on word boundaries, never mid-word."""
    s = clean_name.lower().replace("'s", "s")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    if len(s) > max_len:
        parts = s.split("-")
        res: List[str] = []
        cur = 0
        for p in parts:
            add = len(p) if not res else len(p) + 1
            if cur + add <= max_len:
                res.append(p)
                cur += add
            else:
                break
        s = "-".join(res)
    return s.strip("-")
