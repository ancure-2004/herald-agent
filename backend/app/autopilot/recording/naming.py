from typing import Any


def recording_name(lead: Any) -> str:
    """Canonical recording name format used across batch.json, recorder, and disk lookup."""
    slug = getattr(lead, "slug", "")
    lead_id = getattr(lead, "id", "")
    return f"Clinic-{lead_id}-{slug}"
