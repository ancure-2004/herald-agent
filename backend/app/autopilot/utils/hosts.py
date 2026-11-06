from urllib.parse import urlparse

from app.autopilot.config import DIRECTORY_DOMAINS


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
