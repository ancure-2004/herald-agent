import pytest

from app.autopilot.search.ddgs_provider import DDGSSearchProvider


@pytest.mark.live
def test_live_ddgs_smoke():
    """Live smoke test for DuckDuckGo Search API via ddgs package (max 1 live request)."""
    search_provider = DDGSSearchProvider()
    results = search_provider.search(
        query="dental clinic in Saket Delhi",
        max_results=3,
        bypass_cache=True,
    )
    assert isinstance(results, list)
    assert len(results) >= 1
    assert "link" in results[0] or "href" in results[0] or "url" in results[0]
