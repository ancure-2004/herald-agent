import json
import logging
import time
import urllib.error
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
            "places.nationalPhoneNumber",
            "places.internationalPhoneNumber",
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
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                out: List[Dict[str, Any]] = []
                for p in data.get("places", []):
                    phone = p.get("nationalPhoneNumber") or p.get("internationalPhoneNumber") or ""
                    out.append(
                        {
                            "place_id": p.get("id", ""),
                            "title": (p.get("displayName") or {}).get("text", ""),
                            "address": p.get("formattedAddress", ""),
                            "rating": p.get("rating"),
                            "ratingCount": p.get("userRatingCount"),
                            "website": p.get("websiteUri", ""),
                            "maps_url": p.get("googleMapsUri", ""),
                            "phoneNumber": phone,
                            "source_tier": "Tier 1: Google Places API",
                        }
                    )
                return out
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 0:
                logger.warning("Google Places API rate limited (HTTP 429). Retrying in 3 seconds...")
                time.sleep(3)
                continue
            logger.error("Google Places search HTTP error %s: %s", getattr(e, "code", None), e)
            return []
        except Exception as e:
            logger.error("Google Places search failed: %s", e)
            return []
    return []


def google_place_details(
    place_id: str,
    api_key: str,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """Legacy-compatible Google Place Details endpoint with retry on 429."""
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
            "X-Goog-FieldMask": "nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,websiteUri",
        },
        method="GET",
    )
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 0:
                logger.warning("Google Place Details rate limited (HTTP 429). Retrying in 3 seconds...")
                time.sleep(3)
                continue
            logger.debug("Google place details fetch failed: %s", e)
            return {}
        except Exception as e:
            logger.debug("Google place details fetch failed: %s", e)
            return {}
    return {}


class GooglePlacesProvider:
    name = "google"

    def __init__(self, api_key: Optional[str] = None):
        if api_key:
            self.api_key = api_key.strip()
        else:
            from app.autopilot.settings import get_autopilot_settings

            self.api_key = get_autopilot_settings().google_places_api_key

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
        if db is not None:
            can_call = QuotaGuard.try_consume(db, "google_places", "text_search")
            if not can_call:
                logger.warning("%s Google Places search monthly quota exceeded, skipping call.", TAG_QUOTA)
                return []
        results_raw = google_places_search(
            query=query,
            api_key=self.api_key,
            max_results=20,
            db=None,
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
