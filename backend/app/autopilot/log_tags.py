"""
Log tags and formatting helper for Autopilot terminal & trace logs.
Enforces standard tags so frontend filters and colors work properly.
"""

TAG_SCRAPE = "[SCRAPE]"
TAG_FOUND = "[FOUND]"
TAG_PROBE = "[PROBE]"
TAG_OK = "[OK]"
TAG_BUILD = "[BUILD]"
TAG_AUDIT = "[AUDIT]"
TAG_VIDEO = "[VIDEO]"
TAG_MP4 = "[MP4]"
TAG_ERROR = "[ERROR]"
TAG_FAIL = "[FAIL]"
TAG_DROP = "[DROP]"
TAG_QUOTA = "[QUOTA]"
TAG_TEST = "[TEST]"


def format_tagged_log(tag: str, message: str) -> str:
    """Formats a message with a recognized bracketed tag prefix."""
    clean_tag = tag if tag.startswith("[") and tag.endswith("]") else f"[{tag}]"
    return f"{clean_tag} {message.strip()}"
