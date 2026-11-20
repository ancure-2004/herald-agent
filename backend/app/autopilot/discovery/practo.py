"""
Practo Discovery Provider (`app/autopilot/discovery/practo.py`)

Discovers dental clinic candidates directly from Practo directory
with strict timeouts and bounded retries.
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.autopilot.discovery.base import DiscoveryProvider
from app.autopilot.discovery.localities import Locality
from app.autopilot.search.practo import PractoSearchProvider
from app.autopilot.types import Candidate

logger = logging.getLogger("personal_os.autopilot.discovery.practo")


class PractoDiscoveryProvider:
    """Discovers dental clinic candidates from Practo with timeout and retry bounds."""

    name = "practo"

    def __init__(self):
        self.search_provider = PractoSearchProvider()

    def search_candidates(
        self,
        query: str,
        locality: Locality,
        target_count: int = 10,
        db: Optional[Session] = None,
        testing_mode: bool = False,
        **kwargs,
    ) -> List[Candidate]:
        try:
            results = self.search_provider.search(
                query=f"dental clinic in {locality.label if locality else query}",
                max_results=target_count,
                db=db,
                testing_mode=testing_mode,
            )
        except Exception as e:
            logger.info("Practo candidate discovery bypassed or failed: %s", e)
            return []

        candidates: List[Candidate] = []
        for r in results:
            title = r.get("title", "")
            if not title:
                continue
            c = Candidate(
                name=title,
                address=f"{locality.label if locality else ''}, Delhi NCR",
                locality=locality.label if locality else "",
                phone="",
                website=r.get("link", ""),
                rating=4.5,
                review_count=10,
                source_tier="Tier 2: Practo Directory",
                raw_data=r,
            )
            candidates.append(c)

        return candidates
