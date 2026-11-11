from typing import Any


def recording_name(lead: Any) -> str:
    """Canonical recording name format used across batch.json, recorder, and disk lookup."""
    slug = getattr(lead, "slug", "")
    return f"Clinic-{slug}"
