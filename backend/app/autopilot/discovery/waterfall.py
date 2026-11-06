import logging
import re
from typing import Dict, Iterator, List, Optional, Set

from sqlalchemy.orm import Session

from app.autopilot.discovery.base import DiscoveryProvider
from app.autopilot.discovery.google_places import GooglePlacesProvider
from app.autopilot.discovery.local_pool import LocalPoolProvider
from app.autopilot.discovery.localities import Locality
from app.autopilot.discovery.overpass import OverpassProvider
from app.autopilot.log_tags import TAG_SCRAPE
from app.autopilot.settings import get_autopilot_settings
from app.autopilot.types import Candidate
from app.autopilot.utils.phone import extract_last_10_digits
from app.autopilot.utils.text import clean_clinic_name

logger = logging.getLogger("personal_os.autopilot.waterfall")


class CandidateStream:
    """
    Lazy stream of Candidate items across ordered discovery providers.
    Queries the next provider only when the current provider is exhausted.
    Dedupes across providers by (phone last 10 digits) then normalized name + locality.
    """

    def __init__(
        self,
        query: str,
        locality: Locality,
        providers: Optional[List[DiscoveryProvider]] = None,
        target_count: int = 10,
        db: Optional[Session] = None,
        testing_mode: bool = False,
    ):
        self.query = query
        self.locality = locality
        self.target_count = target_count
        self.db = db
        self.testing_mode = testing_mode

        if providers is not None:
            self.providers = providers
        else:
            self.providers = self._init_default_providers()

        self.seen_phones: Set[str] = set()
        self.seen_names: Set[str] = set()
        self.providers_used: List[str] = []

    def _init_default_providers(self) -> List[DiscoveryProvider]:
        settings = get_autopilot_settings()
        order = settings.discovery_providers
        prov_map: Dict[str, DiscoveryProvider] = {
            "google": GooglePlacesProvider(),
            "overpass": OverpassProvider(),
            "local_pool": LocalPoolProvider(),
        }
        res: List[DiscoveryProvider] = []
        for name in order:
            clean_name = name.strip().lower()
            if clean_name in prov_map:
                res.append(prov_map[clean_name])
        return res

    def __iter__(self) -> Iterator[Candidate]:
        for provider in self.providers:
            # Skip local_pool in testing mode
            if self.testing_mode and provider.name == "local_pool":
                continue

            logger.info("%s Querying discovery provider '%s' for '%s'", TAG_SCRAPE, provider.name, self.locality.label)
            if provider.name not in self.providers_used:
                self.providers_used.append(provider.name)

            try:
                candidates = provider.search_candidates(
                    query=self.query,
                    locality=self.locality,
                    target_count=self.target_count,
                    db=self.db,
                    testing_mode=self.testing_mode,
                )
            except Exception as e:
                logger.warning("Provider '%s' failed: %s", provider.name, e)
                continue

            for cand in candidates:
                # Dedupe across providers
                clean = clean_clinic_name(cand.name)
                norm_name = re.sub(r"[^a-z0-9]", "", clean.lower()) + ":" + self.locality.city.lower()
                ten_digit = extract_last_10_digits(cand.phone)

                if ten_digit and ten_digit in self.seen_phones:
                    continue
                if norm_name in self.seen_names:
                    continue

                if ten_digit:
                    self.seen_phones.add(ten_digit)
                self.seen_names.add(norm_name)

                yield cand
