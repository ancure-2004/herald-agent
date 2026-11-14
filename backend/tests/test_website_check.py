from app.autopilot.search.base import SearchUnavailable, WebSearchProvider
from app.autopilot.types import Candidate
from app.autopilot.verification.website_check import check_candidate_website


class FakeSearchProvider(WebSearchProvider):
    def __init__(self, canned_results=None, should_fail=False):
        self.canned_results = canned_results or []
        self.should_fail = should_fail
        self.queries_called = []

    def search(self, query: str, max_results: int = 8, **kwargs):
        self.queries_called.append(query)
        if self.should_fail:
            raise SearchUnavailable("Simulated search network failure")
        return self.canned_results


def test_website_check_maps_field_has_site():
    candidate = Candidate(
        name="Apex Dental",
        locality="Saket",
        phone="+919811122233",
        website="https://apexdentalcare.in",
    )
    search_mock = FakeSearchProvider()
    verdict, _ = check_candidate_website(candidate, search_provider=search_mock, locality_label="Saket")
    assert verdict.status == "HAS_SITE"
    assert verdict.source == "maps_field"
    assert verdict.domain == "apexdentalcare.in"
    assert len(search_mock.queries_called) == 0


def test_website_check_osm_tag_has_site():
    candidate = Candidate(
        name="Apex Dental",
        locality="Saket",
        phone="+919811122233",
        website="https://apexdentalcare.org",
        source_tier="OSM Overpass",
    )
    search_mock = FakeSearchProvider()
    verdict, _ = check_candidate_website(candidate, search_provider=search_mock, locality_label="Saket")
    assert verdict.status == "HAS_SITE"
    assert verdict.source == "osm_tag"
    assert len(search_mock.queries_called) == 0


def test_website_check_directory_only_yields_no_site():
    candidate = Candidate(
        name="Gupta Dental Care",
        locality="Rohini",
        phone="+919811199999",
        website=None,
    )
    # Search returns only directory links (practo, justdial)
    search_mock = FakeSearchProvider(
        canned_results=[
            {
                "href": "https://www.practo.com/delhi/clinic/gupta-dental-care-rohini",
                "title": "Gupta Dental Care - Practo",
                "body": "Dentist in Rohini",
            },
            {
                "href": "https://www.justdial.com/Delhi/Gupta-Dental-Care",
                "title": "Gupta Dental Care - Justdial",
                "body": "Top dentists in Rohini",
            },
        ]
    )
    verdict, _ = check_candidate_website(
        candidate, search_provider=search_mock, locality_label="Rohini", last10_phone="9811199999"
    )
    assert verdict.status == "NO_SITE"
    assert verdict.source == "search"


def test_website_check_own_site_with_phone_evidence():
    candidate = Candidate(
        name="Gupta Dental Care",
        locality="Rohini",
        phone="+919811199999",
        website=None,
    )
    # Search returns a clinic site with phone digits in snippet
    search_mock = FakeSearchProvider(
        canned_results=[
            {
                "href": "https://guptadentalrohini.com/about",
                "title": "Welcome to Gupta Dental Clinic",
                "body": "Call us at 9811199999 for gentle dental care in Rohini",
            }
        ]
    )
    verdict, _ = check_candidate_website(
        candidate, search_provider=search_mock, locality_label="Rohini", last10_phone="9811199999"
    )
    assert verdict.status == "HAS_SITE"
    assert verdict.domain == "guptadentalrohini.com"
    assert any("Phone match" in e for e in verdict.evidence)


def test_website_check_unrelated_news_site_ignored():
    candidate = Candidate(
        name="Gupta Dental Care",
        locality="Rohini",
        phone="+919811199999",
        website=None,
    )
    search_mock = FakeSearchProvider(
        canned_results=[
            {
                "href": "https://timesofindia.indiatimes.com/city/delhi/health-news",
                "title": "Dental camps organized in Delhi",
                "body": "Various health camps held across the capital.",
            }
        ]
    )
    verdict, _ = check_candidate_website(
        candidate, search_provider=search_mock, locality_label="Rohini", last10_phone="9811199999"
    )
    # The news site does not count as clinic's own site
    assert verdict.status == "NO_SITE"


def test_website_check_search_unavailable_yields_unverified():
    candidate = Candidate(
        name="Sharma Dental Clinic",
        locality="Noida",
        phone="+919876543210",
        website=None,
    )
    failing_search = FakeSearchProvider(should_fail=True)
    verdict, _ = check_candidate_website(
        candidate, search_provider=failing_search, locality_label="Noida", last10_phone="9876543210"
    )
    assert verdict.status == "UNVERIFIED"
    assert any("Simulated search network failure" in e or "unavailable" in e.lower() for e in verdict.evidence)
