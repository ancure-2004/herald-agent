from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Candidate:
    name: str
    address: str = ""
    locality: str = ""
    phone: str = ""
    website: str = ""
    lat: Optional[float] = None
    lon: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    opening_hours: Optional[Any] = None
    source_tier: str = "Unknown"
    place_id: Optional[str] = None
    maps_url: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebsiteVerdict:
    status: str  # "NO_SITE" | "HAS_SITE" | "UNVERIFIED"
    domain: Optional[str] = None
    evidence: List[str] = field(default_factory=list)
    source: str = "search"  # "maps_field" | "osm_tag" | "search"


@dataclass
class VerifiedCandidate:
    candidate: Candidate
    clean_name: str
    locality: str
    norm_phone: str
    ten_digit: str
    verdict: WebsiteVerdict
    address: str = ""
    full_clean_name: str = ""
    short_clean_name: str = ""
    organic_results: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ResearchedCandidate:
    verified: VerifiedCandidate
    doc_name: str
    degrees: str
    doc_source: str
    hours_obj: Dict[str, Any]
    rating: Optional[float] = None
    reviews: Optional[int] = None


@dataclass
class RunOptions:
    hustle_id: int = 1
    target_count: int = 3
    base_url: str = "http://localhost:3001"
    testing_mode: bool = False
    locality: Optional[str] = None
    stop_after: Optional[str] = None  # "discovery" | "verification" | "research" | "build" | "record"
    async_mode: bool = False


@dataclass
class Provenance:
    provider: str
    calls: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    failures: int = 0
    avg_latency_ms: float = 0.0
    sources: List[str] = field(default_factory=list)


@dataclass
class StageResult:
    stage_name: str
    status: str
    count_processed: int = 0
    count_passed: int = 0
    count_dropped: int = 0
    payload: List[Dict[str, Any]] = field(default_factory=list)
    duration_seconds: float = 0.0


@dataclass
class RunResult:
    run_id: int
    found: int
    passed: int
    dropped: Dict[str, Any]
    structured: Dict[str, Any]
    batch_sync: Dict[str, Any]
    recording_report: Dict[str, Any]
    trace_logs: List[str]
    provenance: Dict[str, Any] = field(default_factory=dict)
