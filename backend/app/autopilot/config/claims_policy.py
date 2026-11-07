from typing import Any, Callable, Dict, List, Set

ALWAYS_BANNED_CLAIMS: List[str] = [
    "100%",
    "guarantee",
    "guaranteed",
    "permanent cure",
    "permanent fix",
    "painless",
    "zero discomfort",
    "1.618",
    "golden ratio",
    "best dentist",
    "best dental clinic",
    "no. 1 dental",
    "lead specialist",
    "lead dental surgeon & clinical director",
    "experienced clinical practice",
    "registered dental clinician",
]

BANNED_UNLESS_SOURCED_CLAIMS: Dict[str, Callable[[Any], bool]] = {
    "zirconia": lambda sourced: any("zirconia" in str(s).lower() for s in sourced),
    "titanium": lambda sourced: any("titanium" in str(s).lower() for s in sourced),
    "vacuum autoclave": lambda sourced: any("vacuum autoclave" in str(s).lower() for s in sourced),
    "class-b": lambda sourced: any("class-b" in str(s).lower() for s in sourced),
    "hospital-grade": lambda sourced: any("hospital-grade" in str(s).lower() for s in sourced),
}

ALLOWED_CLAIM_SOURCES: Set[str] = {
    "Google Business Profile",
    "Tier 1: Google Places API",
    "Google Places API",
    "Google Maps Title",
    "Verified Search Snippet",
    "Standard Clinical Procedure",
}

FORBIDDEN_MEDICAL_CLAIMS: List[str] = ALWAYS_BANNED_CLAIMS
