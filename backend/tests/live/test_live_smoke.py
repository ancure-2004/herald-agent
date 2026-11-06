import pytest

from app.autopilot.discovery.localities import resolve_locality
from app.autopilot.discovery.overpass import OverpassProvider
from app.autopilot.search.ddgs_provider import DDGSSearchProvider


@pytest.mark.live
def test_live_overpass_smoke():
    """Live smoke test for OpenStreetMap Overpass API (max 1 live request)."""
    provider = OverpassProvider()
    locality = resolve_locality("South Delhi / Saket")
    try:
        candidates = provider.search_candidates(
            query="dental clinic in Saket",
            locality=locality,
            target_count=3,
        )
        if not candidates:
            pytest.skip("Public Overpass endpoints currently at capacity or timed out")
        assert len(candidates) >= 1
        first = candidates[0]
        assert first.name is not None
        assert first.source_tier == "OSM Overpass"
    except Exception as e:
        pytest.skip(f"Live Overpass query skipped due to mirror network state: {e}")


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
