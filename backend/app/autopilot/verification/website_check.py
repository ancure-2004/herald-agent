import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.autopilot.search.base import SearchUnavailable, WebSearchProvider
from app.autopilot.types import Candidate, WebsiteVerdict
from app.autopilot.utils.hosts import is_directory_domain, registered_host
from app.autopilot.utils.text import clean_clinic_name

logger = logging.getLogger("personal_os.autopilot.verification.website")


def _has_entity_evidence(
    host: str,
    title: str,
    snippet: str,
    url: str,
    clean_name: str,
    locality: str,
    last10_phone: str,
) -> Tuple[bool, str]:
    blob = f"{url} {title} {snippet}".lower()

    # 1. Phone digits present in url/title/snippet
    if last10_phone and last10_phone in blob:
        return True, f"Phone match ({last10_phone}) in search result"

    # 2. Distinctive clinic-name token in host or title AND locality in title or snippet
    name_clean = re.sub(r"[^a-z0-9\s]", " ", clean_name.lower())
    ignore_tokens = {
        "dental",
        "clinic",
        "care",
        "centre",
        "center",
        "studio",
        "the",
        "and",
        "dr",
        "delhi",
        "noida",
        "gurugram",
        "bengaluru",
        "india",
        "hospital",
    }
    distinctive_tokens = [w for w in name_clean.split() if len(w) >= 3 and w not in ignore_tokens]

    name_in_host_or_title = any(token in host or token in title.lower() for token in distinctive_tokens)

    loc_clean = re.sub(r"[^a-z0-9\s]", " ", locality.lower()).strip()
    loc_tokens = [w for w in loc_clean.split() if len(w) >= 3 and w not in ("delhi", "ncr", "nagar", "vihar", "sector")]
    loc_in_title_or_snippet = any(lt in f"{title} {snippet}".lower() for lt in loc_tokens) if loc_tokens else True

    if name_in_host_or_title and loc_in_title_or_snippet:
        return True, f"Distinctive clinic tokens {distinctive_tokens} and locality matched"

    return False, "No entity evidence for official website"


def check_candidate_website(
    candidate: Candidate,
    search_provider: Optional[WebSearchProvider],
    locality_label: str,
    last10_phone: str = "",
    db: Optional[Session] = None,
    testing_mode: bool = False,
) -> Tuple[WebsiteVerdict, List[Dict[str, Any]]]:
    """
    Evaluates clinic website status in strict order:
      1. Google websiteUri / Maps field
      2. OSM website tag
      3. Search queries (Q1 and optional Q2) via search_provider
    Returns (WebsiteVerdict, organic_search_results).
    """
    clean_name = clean_clinic_name(candidate.name)

    # 1. Google Maps website field
    if candidate.website and not ("OSM" in candidate.source_tier or "Overpass" in candidate.source_tier):
        host = registered_host(candidate.website)
        if host and not is_directory_domain(host):
            return WebsiteVerdict(
                status="HAS_SITE",
                domain=host,
                evidence=[f"Maps field websiteUri: {candidate.website}"],
                source="maps_field",
            ), []

    # 2. OSM website tag
    if candidate.website and ("OSM" in candidate.source_tier or "Overpass" in candidate.source_tier):
        host = registered_host(candidate.website)
        if host and not is_directory_domain(host):
            return WebsiteVerdict(
                status="HAS_SITE",
                domain=host,
                evidence=[f"OSM website tag: {candidate.website}"],
                source="osm_tag",
            ), []

    # 3. Web Search check
    if not search_provider:
        # If no search provider provided, cannot verify via search
        return WebsiteVerdict(status="NO_SITE", evidence=["No search provider configured"], source="search"), []

    all_organic: List[Dict[str, Any]] = []

    try:
        q1 = f'"{clean_name}" {locality_label} dental'
        results_q1 = search_provider.search(
            query=q1,
            max_results=8,
            db=db,
            bypass_cache=testing_mode,
        )
        all_organic.extend(results_q1)

        for item in results_q1:
            url = item.get("link") or item.get("href") or ""
            host = registered_host(url)
            if not host or is_directory_domain(host):
                continue
            has_ev, ev_reason = _has_entity_evidence(
                host=host,
                title=item.get("title", ""),
                snippet=item.get("snippet") or item.get("body", ""),
                url=url,
                clean_name=clean_name,
                locality=locality_label,
                last10_phone=last10_phone,
            )
            if has_ev:
                return WebsiteVerdict(
                    status="HAS_SITE",
                    domain=host,
                    evidence=[f"Q1 hit: {url} ({ev_reason})"],
                    source="search",
                ), all_organic

        # If Q1 inconclusive and phone available, run Q2
        if last10_phone:
            q2 = f'"{last10_phone}"'
            results_q2 = search_provider.search(
                query=q2,
                max_results=8,
                db=db,
                bypass_cache=testing_mode,
            )
            all_organic.extend(results_q2)

            for item in results_q2:
                url = item.get("link") or item.get("href") or ""
                host = registered_host(url)
                if not host or is_directory_domain(host):
                    continue
                has_ev, ev_reason = _has_entity_evidence(
                    host=host,
                    title=item.get("title", ""),
                    snippet=item.get("snippet") or item.get("body", ""),
                    url=url,
                    clean_name=clean_name,
                    locality=locality_label,
                    last10_phone=last10_phone,
                )
                if has_ev:
                    return WebsiteVerdict(
                        status="HAS_SITE",
                        domain=host,
                        evidence=[f"Q2 hit: {url} ({ev_reason})"],
                        source="search",
                    ), all_organic

        return WebsiteVerdict(
            status="NO_SITE", evidence=["No active non-directory website found in search results"], source="search"
        ), all_organic

    except SearchUnavailable as e:
        logger.warning("Website check search unavailable for '%s': %s", clean_name, e)
        return WebsiteVerdict(status="UNVERIFIED", evidence=[str(e)], source="search"), all_organic
    except Exception as e:
        logger.error("Unexpected error in website check for '%s': %s", clean_name, e)
        return WebsiteVerdict(status="UNVERIFIED", evidence=[f"Error: {e}"], source="search"), all_organic
