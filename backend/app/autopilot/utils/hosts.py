from typing import Optional, Tuple
from urllib.parse import urlparse

from app.autopilot.config import ALLOWED_DISCOVERY_DOMAINS, DIRECTORY_DOMAINS


def registered_host(url_or_host: str) -> str:
    """
    Extracts the normalized registered hostname, lowercased, with leading 'www.' stripped.
    Uses removeprefix('www.') rather than lstrip('www.') to prevent truncating domains like walmart.com.
    """
    raw = (url_or_host or "").strip()
    if not raw:
        return ""
    if "://" in raw or raw.startswith("//"):
        parsed = urlparse(raw)
        host = parsed.netloc
    else:
        # Might be just host or host/path
        host = raw.split("/")[0].split("?")[0].split("#")[0]

    # Strip port if present
    if ":" in host:
        host = host.split(":")[0]

    clean = host.lower()
    return clean.removeprefix("www.")


def is_directory_domain(host_or_url: str) -> bool:
    """Checks whether the domain is a known directory, social network, aggregator or platform."""
    host = registered_host(host_or_url)
    if not host:
        return False
    return any(host == d or host.endswith("." + d) for d in DIRECTORY_DOMAINS)


def is_allowed_discovery_website(url_or_host: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Fast website filter for discovery candidates.
    Returns (is_allowed, registered_hostname).
    Allowed:
      - Empty or None (clinic has zero website)
      - Social / aggregator / linktree / business.site links
        ("instagram.com", "facebook.com", "linktr.ee", "wa.me", "google.com", "business.site")
      - Known medical directory listings (practo.com, justdial.com, etc.)
    Rejected:
      - Any independent custom domain website (e.g. clinic.com, drsharma.in).
    """
    raw = (url_or_host or "").strip()
    if not raw:
        return True, None

    host = registered_host(raw)
    if not host:
        return True, None

    # Check allowed social/aggregator/linktree whitelist
    for allowed in ALLOWED_DISCOVERY_DOMAINS:
        if host == allowed or host.endswith("." + allowed):
            return True, host

    # Check directory domains (e.g. practo, justdial)
    if is_directory_domain(host):
        return True, host

    # Independent custom domain website -> reject immediately
    return False, host
