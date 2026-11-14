from typing import List, Protocol

from app.autopilot.discovery.localities import Locality
from app.autopilot.types import Candidate


class DiscoveryProvider(Protocol):
    name: str

    def search_candidates(
        self,
        query: str,
        locality: Locality,
        target_count: int = 10,
        **kwargs,
    ) -> List[Candidate]:
        """Discovers clinic candidates for the given query and locality."""
        ...
