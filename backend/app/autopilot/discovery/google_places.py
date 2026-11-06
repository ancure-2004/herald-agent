import json
import logging
import os
import urllib.request
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.autopilot.discovery.localities import Locality
from app.autopilot.log_tags import TAG_QUOTA
from app.autopilot.quota import QuotaGuard
from app.autopilot.types import Candidate

logger = logging.getLogger("personal_os.autopilot.discovery.google_places")


def google_places_search(
    query: str,
    api_key: str,
    max_results: int = 20,
    db: Optional[Session] = None,
) -> List[Dict[str, Any]]:
    """Legacy-compatible Google Places searchText function."""
    if not api_key:
        return []
    if db is not None:
        can_call = QuotaGuard.try_consume(db, "google", "places_search")
        if not can_call:
            logger.warning("%s Google Places search monthly quota exceeded, skipping call.", TAG_QUOTA)
            return []

    field_mask = ",".join(
        [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.rating",
            "places.userRatingCount",
            "places.websiteUri",
            "places.googleMapsUri",
        ]
    )
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": query, "maxResultCount": max_results}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": field_mask,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        out: List[Dict[str, Any]] = []
        for p in data.get("places", []):
            out.append(
                {
                    "place_id": p.get("id", ""),
                    "title": (p.get("displayName") or {}).get("text", ""),
                    "address": p.get("formattedAddress", ""),
                    "rating": p.get("rating"),
                    "ratingCount": p.get("userRatingCount"),
                    "website": p.get("websiteUri", ""),
                    "maps_url": p.get("googleMapsUri", ""),
                    "phoneNumber": "",
                    "source_tier": "Tier 1: Google Places API",
                }
            )
        return out


def google_place_details(
    place_id: str,
    api_key: str,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """Legacy-compatible Google Place Details endpoint."""
    if not place_id or not api_key:
        return {}
    if db is not None:
        can_call = QuotaGuard.try_consume(db, "google", "place_details")
        if not can_call:
            logger.warning("%s Google Place Details monthly quota exceeded, skipping call.", TAG_QUOTA)
            return {}

    req = urllib.request.Request(
        f"https://places.googleapis.com/v1/places/{place_id}",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "nationalPhoneNumber,regularOpeningHours",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.debug("Google place details fetch failed: %s", e)
        return {}


class GooglePlacesProvider:
    name = "google"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or os.getenv("GOOGLE_PLACES_API_KEY", "")).strip()

    def search_candidates(
        self,
        query: str,
        locality: Locality,
        target_count: int = 10,
        db: Optional[Session] = None,
        **kwargs,
    ) -> List[Candidate]:
        if not self.api_key:
            return []
        results_raw = google_places_search(
            query=query,
            api_key=self.api_key,
            max_results=min(20, target_count * 2),
            db=db,
        )
        candidates: List[Candidate] = []
        for r in results_raw:
            c = Candidate(
                name=r.get("title", ""),
                address=r.get("address", ""),
                phone=r.get("phoneNumber", ""),
                website=r.get("website", ""),
                rating=float(r["rating"]) if r.get("rating") is not None else None,
                review_count=int(r["ratingCount"]) if r.get("ratingCount") is not None else None,
                source_tier="Tier 1: Google Places API",
                place_id=r.get("place_id"),
                maps_url=r.get("maps_url"),
                raw_data=r,
            )
            candidates.append(c)
        return candidates
