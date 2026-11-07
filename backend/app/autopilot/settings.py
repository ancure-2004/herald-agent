import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class AutopilotSettings:
    """Typed runtime settings for the Autopilot pipeline."""

    discovery_providers: List[str] = field(
        default_factory=lambda: [
            p.strip() for p in os.getenv("DISCOVERY_PROVIDERS", "google,local_pool").split(",") if p.strip()
        ]
    )
    search_min_interval_seconds: float = float(os.getenv("SEARCH_MIN_INTERVAL_SECONDS", "4.0"))
    search_cache_ttl_days: int = int(os.getenv("SEARCH_CACHE_TTL_DAYS", "30"))
    overpass_endpoints: List[str] = field(
        default_factory=lambda: [
            ep.strip()
            for ep in os.getenv(
                "OVERPASS_ENDPOINTS",
                "https://overpass-api.de/api/interpreter,https://lz4.overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter",
            ).split(",")
            if ep.strip()
        ]
    )
    overpass_cache_ttl_hours: int = int(os.getenv("OVERPASS_CACHE_TTL_HOURS", "24"))
    google_max_pages_per_query: int = int(os.getenv("GOOGLE_MAX_PAGES_PER_QUERY", "1"))
    google_monthly_soft_limit_text_search: int = int(os.getenv("GOOGLE_MONTHLY_SOFT_LIMIT_TEXT_SEARCH", "900"))
    google_monthly_soft_limit_details: int = int(os.getenv("GOOGLE_MONTHLY_SOFT_LIMIT_DETAILS", "900"))
    website_check_on_unverified: str = os.getenv("WEBSITE_CHECK_ON_UNVERIFIED", "hold")  # "hold" | "allow_flagged"
    test_mode_max_target: int = int(os.getenv("TEST_MODE_MAX_TARGET", "10"))
    recorder_timeout_per_clinic_seconds: int = int(os.getenv("RECORDER_TIMEOUT_PER_CLINIC_SECONDS", "180"))
    contact_user_agent: str = os.getenv("CONTACT_USER_AGENT", "PersonalOS-Autopilot/2.0 (contact: info@example.com)")
    google_places_api_key: str = field(
        default_factory=lambda: (
            os.getenv("GOOGLE_PLACES_API_KEY")
            or getattr(
                __import__("app.core.config", fromlist=["get_settings"]).get_settings(), "GOOGLE_PLACES_API_KEY", ""
            )
            or ""
        ).strip()
    )


def get_autopilot_settings() -> AutopilotSettings:
    return AutopilotSettings()
