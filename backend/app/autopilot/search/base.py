from typing import Any, Dict, List, Protocol


class SearchUnavailable(Exception):
    """Raised when web search is unavailable or rate limited. Never treat as empty results."""

    pass


class WebSearchProvider(Protocol):
    name: str

    def search(
        self,
        query: str,
        max_results: int = 8,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """Performs web search and returns list of results (title, link/href, snippet/body)."""
        ...
