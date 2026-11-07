import json
import logging
from typing import Any, Dict, List

from app.autopilot.config import PROJECT_ROOT
from app.autopilot.discovery.localities import Locality
from app.autopilot.types import Candidate

logger = logging.getLogger("personal_os.autopilot.discovery.local_pool")


def playwright_maps_fallback_pool(query: str = "") -> List[Dict[str, Any]]:
    """Loads scraped map batches from 1_map_finder directory and candidates_pool.json."""
    out: List[Dict[str, Any]] = []
    map_finder_dir = PROJECT_ROOT / "Side hustle (Building Website)" / "lead-scraper" / "1_map_finder"
    batch_files = [
        map_finder_dir / "verified_batch_1.json",
        map_finder_dir / "verified_batch_2.json",
        map_finder_dir / "verified_batch_3.json",
        PROJECT_ROOT.parent / "candidates_pool.json",
    ]
    for bf in batch_files:
        if not bf.exists():
            continue
        try:
            items = json.loads(bf.read_text(encoding="utf-8"))
            if isinstance(items, list):
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    out.append(
                        {
                            "place_id": item.get("place_id", ""),
                            "title": item.get("name") or item.get("title") or "",
                            "address": item.get("address")
                            or f"{item.get('locality') or item.get('area', 'Delhi NCR')}, Delhi NCR",
                            "locality": item.get("locality") or item.get("area") or "",
                            "phoneNumber": item.get("phone") or item.get("phoneNumber") or "",
                            "rating": item.get("rating"),
                            "ratingCount": item.get("review_count") or item.get("reviews"),
                            "website": item.get("website", ""),
                            "source_tier": "Tier 4: Playwright Maps & Verified Pool",
                        }
                    )
        except Exception as e:
            logger.debug("Error reading fallback pool file %s: %s", bf, e)
    return out


def is_candidate_in_locality(item: Dict[str, Any], locality_label: str) -> bool:
    """Checks if a local pool candidate matches the requested locality."""
    if not locality_label:
        return True
    item_loc = (item.get("locality") or item.get("area") or "").strip().lower()
    item_addr = (item.get("address") or "").strip().lower()
    t_label = locality_label.strip().lower()

    if t_label in item_loc or item_loc in t_label:
        return True

    noise = {"delhi", "ncr", "india"}
    tokens = [tok for tok in t_label.replace(",", " ").split() if tok not in noise]
    if tokens and all(tok in item_loc or tok in item_addr for tok in tokens):
        return True
    return False


def load_fallback_candidates_pool() -> List[Dict[str, Any]]:
    return playwright_maps_fallback_pool("dental clinic in Delhi NCR")


class LocalPoolProvider:
    name = "local_pool"
    _pool_scanned: bool = False

    def __init__(self):
        self.scanned = False

    @classmethod
    def reset_pool_status(cls) -> None:
        cls._pool_scanned = False

    def search_candidates(
        self,
        query: str,
        locality: Locality,
        target_count: int = 10,
        testing_mode: bool = False,
        locality_specified: bool = False,
        **kwargs,
    ) -> List[Candidate]:
        # Filter candidates by locality if specified
        if locality_specified:
            target_label = locality.label if locality else ""
            raw_items = [
                item
                for item in playwright_maps_fallback_pool(query)
                if is_candidate_in_locality(item, target_label)
            ]
        else:
            # If pool was already scanned in this run, avoid re-evaluating the same 216 candidates on all 100 presets
            if self.scanned or LocalPoolProvider._pool_scanned:
                logger.debug("Local pool already scanned in this run, skipping re-scan.")
                return []
            raw_items = playwright_maps_fallback_pool(query)
            self.scanned = True
            LocalPoolProvider._pool_scanned = True

        candidates: List[Candidate] = []
        for item in raw_items:
            c_loc = item.get("locality") or item.get("area") or (locality.label if locality else "")
            c = Candidate(
                name=item.get("title", ""),
                address=item.get("address", ""),
                locality=c_loc,
                phone=item.get("phoneNumber", ""),
                website=item.get("website", ""),
                rating=float(item["rating"]) if item.get("rating") is not None else None,
                review_count=int(item["ratingCount"]) if item.get("ratingCount") is not None else None,
                source_tier=item.get("source_tier", "Tier 4: Playwright Maps & Verified Pool"),
                place_id=item.get("place_id"),
                raw_data=item,
            )
            candidates.append(c)
        return candidates
