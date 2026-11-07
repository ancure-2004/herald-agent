import logging
import time
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.autopilot.discovery.localities import Locality
from app.autopilot.log_tags import TAG_SCRAPE
from app.autopilot.search.cache import DbCache
from app.autopilot.settings import get_autopilot_settings
from app.autopilot.types import Candidate
from app.autopilot.utils.phone import normalize_indian_mobile

logger = logging.getLogger("personal_os.autopilot.discovery.overpass")


def build_overpass_query(bbox: tuple) -> str:
    south, west, north, east = bbox
    return (
        f"[out:json][timeout:5];\n"
        f"(\n"
        f"  nwr[amenity=dentist]({south},{west},{north},{east});\n"
        f"  nwr[healthcare=dentist]({south},{west},{north},{east});\n"
        f'  nwr[amenity=clinic]["healthcare:speciality"~"dent",i]({south},{west},{north},{east});\n'
        f");\n"
        f"out center tags;\n"
    )


def extract_osm_phone(tags: Dict[str, str]) -> str:
    for key in ("contact:mobile", "phone", "contact:phone", "mobile"):
        raw = tags.get(key, "")
        if raw:
            for part in raw.split(";"):
                norm = normalize_indian_mobile(part.strip())
                if norm:
                    return norm
    return ""


def extract_osm_address(tags: Dict[str, str], locality: Locality) -> str:
    parts = []
    for k in ("addr:housenumber", "addr:street", "addr:suburb", "addr:district", "addr:city", "addr:postcode"):
        if tags.get(k):
            parts.append(tags[k])
    if parts:
        return ", ".join(parts)
    return f"{locality.label}, {locality.city}"


def parse_osm_element(elem: Dict[str, Any], locality: Locality) -> Optional[Candidate]:
    tags = elem.get("tags") or {}
    name = tags.get("name", "").strip()
    if not name:
        return None

    lat = elem.get("lat") or (elem.get("center") or {}).get("lat")
    lon = elem.get("lon") or (elem.get("center") or {}).get("lon")
    phone = extract_osm_phone(tags)
    website = tags.get("website") or tags.get("contact:website") or tags.get("url") or ""
    hours = tags.get("opening_hours")
    address = extract_osm_address(tags, locality)

    return Candidate(
        name=name,
        address=address,
        phone=phone,
        website=website.strip(),
        lat=float(lat) if lat else None,
        lon=float(lon) if lon else None,
        rating=None,
        review_count=None,
        opening_hours={"verified": False, "notes": hours or "Call to confirm hours", "schedule": []},
        source_tier="OSM Overpass",
        place_id=f"osm-{elem.get('type')}-{elem.get('id')}",
        raw_data=elem,
    )


class OverpassProvider:
    name = "overpass"

    def __init__(self, endpoints: Optional[List[str]] = None):
        settings = get_autopilot_settings()
        self.endpoints = endpoints or settings.overpass_endpoints

    def search_candidates(
        self,
        query: str,
        locality: Locality,
        target_count: int = 10,
        db: Optional[Session] = None,
        testing_mode: bool = False,
        **kwargs,
    ) -> List[Candidate]:
        settings = get_autopilot_settings()
        cache_key = DbCache.make_key("overpass", {"bbox": locality.bbox, "locality": locality.label})

        if db is not None:
            cached_data = DbCache.get(db, cache_key, bypass=testing_mode)
            if cached_data is not None:
                logger.info("%s Overpass cache hit for %s", TAG_SCRAPE, locality.label)
                candidates: List[Candidate] = []
                for item in cached_data:
                    c = parse_osm_element(item, locality)
                    if c:
                        candidates.append(c)
                return candidates

        q = build_overpass_query(locality.bbox)
        t0 = time.time()
        elements = self._execute_overpass_query(q)
        latency_ms = (time.time() - t0) * 1000

        logger.info(
            "%s overpass %s %dms (%d elements)",
            TAG_SCRAPE,
            "MISS" if not testing_mode else "TEST",
            int(latency_ms),
            len(elements),
        )

        if db is not None and elements:
            ttl_sec = settings.overpass_cache_ttl_hours * 3600
            DbCache.set(db, cache_key, "overpass", elements, ttl_sec, bypass=testing_mode)

        candidates = []
        for elem in elements:
            c = parse_osm_element(elem, locality)
            if c:
                candidates.append(c)
        return candidates

    def _execute_overpass_query(self, query: str) -> List[Dict[str, Any]]:
        settings = get_autopilot_settings()
        headers = {"User-Agent": settings.contact_user_agent}

        # Strict short timeout (3.0s) and single attempt to prevent stalling
        for attempt in range(min(1, len(self.endpoints))):
            endpoint = self.endpoints[attempt % len(self.endpoints)]
            try:
                with httpx.Client(timeout=3.0) as client:
                    resp = client.post(endpoint, data={"data": query}, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data.get("elements", [])
                    if resp.status_code in (429, 504):
                        logger.warning("Overpass endpoint %s returned %d.", endpoint, resp.status_code)
            except Exception as e:
                logger.warning("Overpass attempt on %s failed: %s", endpoint, e)
        return []
