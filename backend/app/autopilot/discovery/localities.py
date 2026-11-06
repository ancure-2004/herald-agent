import logging
import time
import urllib.parse
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import httpx

from app.autopilot.settings import get_autopilot_settings

logger = logging.getLogger("personal_os.autopilot.localities")


@dataclass(frozen=True)
class Locality:
    label: str
    city: str
    state: str
    bbox: Tuple[float, float, float, float]  # (south, west, north, east)


# Preset localities keyed by the EXACT strings the frontend sends
LOCALITY_PRESETS: Dict[str, Locality] = {
    "Delhi NCR / Noida": Locality(
        label="Delhi NCR / Noida",
        city="Noida",
        state="Uttar Pradesh",
        bbox=(28.48, 77.28, 28.65, 77.44),
    ),
    "South Delhi / Saket": Locality(
        label="South Delhi / Saket",
        city="South Delhi",
        state="Delhi",
        bbox=(28.49, 77.18, 28.56, 77.25),
    ),
    "Gurugram / Cyber Hub": Locality(
        label="Gurugram / Cyber Hub",
        city="Gurugram",
        state="Haryana",
        bbox=(28.45, 77.05, 28.52, 77.12),
    ),
    "West Delhi / Rajouri Garden": Locality(
        label="West Delhi / Rajouri Garden",
        city="West Delhi",
        state="Delhi",
        bbox=(28.62, 77.10, 28.67, 77.16),
    ),
    "Bengaluru / Indiranagar": Locality(
        label="Bengaluru / Indiranagar",
        city="Bengaluru",
        state="Karnataka",
        bbox=(12.95, 77.62, 13.00, 77.66),
    ),
}

# In-memory permanent cache for resolved free-text localities
_NOMINATIM_CACHE: Dict[str, Locality] = {}
_LAST_NOMINATIM_CALL_TS: float = 0.0


def resolve_locality(raw_input: Optional[str]) -> Locality:
    """
    Resolves a locality label to a Locality object with city, state and bounding box.
    First checks exact presets; falls back to Nominatim OSM geocoding with caching and rate limit.
    """
    global _LAST_NOMINATIM_CALL_TS
    if not raw_input or not raw_input.strip():
        # Default fallback
        return LOCALITY_PRESETS["South Delhi / Saket"]

    norm_key = raw_input.strip()
    if norm_key in LOCALITY_PRESETS:
        return LOCALITY_PRESETS[norm_key]

    # Check case-insensitive preset match
    for k, v in LOCALITY_PRESETS.items():
        if k.lower() == norm_key.lower():
            return v

    if norm_key in _NOMINATIM_CACHE:
        return _NOMINATIM_CACHE[norm_key]

    # Rate limit Nominatim (max 1 req/s)
    now = time.time()
    elapsed = now - _LAST_NOMINATIM_CALL_TS
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)
    _LAST_NOMINATIM_CALL_TS = time.time()

    settings = get_autopilot_settings()
    encoded = urllib.parse.quote(norm_key)
    url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1"

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers={"User-Agent": settings.contact_user_agent})
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list) and len(data) > 0:
                    item = data[0]
                    bb = item.get("boundingbox", [])
                    if len(bb) == 4:
                        # Nominatim returns [south, north, west, east]
                        south, north, west, east = (
                            float(bb[0]),
                            float(bb[1]),
                            float(bb[2]),
                            float(bb[3]),
                        )
                        disp_name = item.get("display_name", "")
                        city_part = norm_key.split("/")[0].split(",")[0].strip()
                        loc = Locality(
                            label=norm_key,
                            city=city_part,
                            state=disp_name.split(",")[-2].strip() if "," in disp_name else "Delhi",
                            bbox=(south, west, north, east),
                        )
                        _NOMINATIM_CACHE[norm_key] = loc
                        return loc
    except Exception as e:
        logger.warning("Nominatim resolution failed for '%s': %s", norm_key, e)

    # Safe fallback
    fallback = Locality(
        label=norm_key,
        city=norm_key.split("/")[0].split(",")[0].strip(),
        state="Delhi",
        bbox=(28.40, 76.80, 28.90, 77.40),
    )
    _NOMINATIM_CACHE[norm_key] = fallback
    return fallback
