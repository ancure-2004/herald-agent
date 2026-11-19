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


class GoogleQuotaExhausted(Exception):
    """Raised when Google Places returns HTTP 429 / RESOURCE_EXHAUSTED after retry."""

    pass


def google_places_search(
    query: str,
    api_key: str,
    max_results: int = 20,
    db: Optional[Session] = None,
) -> List[Dict[str, Any]]:
    """Legacy-compatible Google Places searchText function with raw DbCache."""
    if not api_key:
        return []

    cache_key = None
    if db is not None:
        from app.autopilot.search.cache import DbCache

        cache_key = DbCache.make_key("google_places_raw", {"query": query.strip().lower()})
        cached = DbCache.get(db, cache_key)
        if cached is not None:
            logger.info("Google Places raw results cache hit for '%s' (0 API calls)", query)
            return cached

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
    max_attempts = 3
    for attempt in range(max_attempts):
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
                if db is not None and cache_key is not None:
                    from app.autopilot.search.cache import DbCache

                    DbCache.set(db, cache_key, out, provider="google_places_raw", ttl_hours=168)
                return out
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_attempts - 1:
                delay = min(2 ** (attempt + 1), 8)
                logger.warning(
                    "Google Places API rate limited (HTTP 429). Retrying in %ds (attempt %d/%d)...",
                    delay,
                    attempt + 1,
                    max_attempts,
                )
                time.sleep(delay)
                continue
            if e.code == 429:
                logger.error("Google Places API rate limited (HTTP 429) after %d attempts. Quota exhausted.", max_attempts)
                GooglePlacesProvider.quota_exhausted = True
                raise GoogleQuotaExhausted(f"Google Places API rate limited (HTTP 429): {e}")
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
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_attempts - 1:
                delay = min(2 ** (attempt + 1), 8)
                logger.warning(
                    "Google Place Details rate limited (HTTP 429). Retrying in %ds (attempt %d/%d)...",
                    delay,
                    attempt + 1,
                    max_attempts,
                )
                time.sleep(delay)
                continue
            if e.code == 429:
                logger.error("Google Place Details rate limited (HTTP 429) after %d attempts. Quota exhausted.", max_attempts)
                GooglePlacesProvider.quota_exhausted = True
                raise GoogleQuotaExhausted(f"Google Place Details rate limited (HTTP 429): {e}")
            logger.debug("Google place details fetch failed: %s", e)
            return {}
        except Exception as e:
            logger.debug("Google place details fetch failed: %s", e)
            return {}
    return {}


class GooglePlacesProvider:
    name = "google"
    quota_exhausted: bool = False

    def __init__(self, api_key: Optional[str] = None):
        if api_key:
            self.api_key = api_key.strip()
        else:
            from app.autopilot.settings import get_autopilot_settings

            self.api_key = get_autopilot_settings().google_places_api_key
        self.quota_exhausted = GooglePlacesProvider.quota_exhausted

    @classmethod
    def reset_quota_status(cls) -> None:
        cls.quota_exhausted = False

    def _raw_to_candidates(self, results_raw: List[Dict[str, Any]], locality: Locality) -> List[Candidate]:
        candidates: List[Candidate] = []
        for r in results_raw:
            c = Candidate(
                name=r.get("title", ""),
                address=r.get("address", ""),
                locality=r.get("locality") or (locality.label if locality else ""),
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
        if self.quota_exhausted or GooglePlacesProvider.quota_exhausted:
            logger.info("Google Places provider quota is marked exhausted, skipping call.")
            return []

        # Check raw DbCache first: 0 API calls, NO QuotaGuard consumed!
        cache_key = None
        if db is not None:
            from app.autopilot.search.cache import DbCache

            cache_key = DbCache.make_key("google_places_raw", {"query": query.strip().lower()})
            cached_raw = DbCache.get(db, cache_key)
            if cached_raw is not None:
                logger.info("Google Places raw results cache hit for '%s' (0 API calls)", query)
                return self._raw_to_candidates(cached_raw, locality)

        # Consume monthly quota only if live call will proceed
        if db is not None:
            can_call = QuotaGuard.try_consume(db, "google_places", "text_search")
            if not can_call:
                logger.warning("%s Google Places search monthly quota exceeded, skipping call.", TAG_QUOTA)
                return []

        try:
            results_raw = google_places_search(
                query=query,
                api_key=self.api_key,
                max_results=20,
                db=db,
            )
        except GoogleQuotaExhausted:
            self.quota_exhausted = True
            GooglePlacesProvider.quota_exhausted = True
            raise

        if db is not None and cache_key is not None and results_raw:
            from app.autopilot.search.cache import DbCache

            DbCache.set(db, cache_key, results_raw, provider="google_places_raw", ttl_hours=168)

        return self._raw_to_candidates(results_raw, locality)
