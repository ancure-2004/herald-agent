# Autopilot Lead Pipeline

The Autopilot lead generation pipeline discovers dental clinics, checks for missing or poor web presence, researches doctor and clinic facts, generates 3-template Next.js website payloads, audits content claims for strict truthfulness, records Playwright video walkthroughs, and provisions verified leads into CRM.

The entire pipeline operates at **zero API cost**, using OpenStreetMap Overpass for discovery and DuckDuckGo for web search, with Google Places kept behind a monthly quota guard.

---

## 1. Module Map

The autopilot codebase is structured into single-responsibility modules under `app/autopilot/`:

```
app/autopilot/
├── config/
│   ├── paths.py              # Directory paths (engines, data, scrapers)
│   ├── directory_domains.py  # Known directory/listing/social domains
│   ├── hospital_chains.py    # Large hospital & corporate chain blocklist
│   ├── claims_policy.py      # Allowed claim sources and validation policies
│   └── service_catalog.py    # Dental clinical service catalog definitions
├── settings.py               # Typed AutopilotSettings from environment
├── types.py                  # Dataclasses: Candidate, VerifiedCandidate, ResearchedCandidate,
│                             # WebsiteVerdict, RunOptions, RunResult, StageResult, Provenance
├── log_tags.py               # Standard log tags ([SCRAPE], [FOUND], [PROBE], etc.)
├── utils/
│   ├── text.py               # clean_clinic_name, short_clinic_name, generate_clean_slug
│   ├── address.py            # extract_locality, address normalization
│   ├── phone.py              # Indian phone parsing & canonical 10-digit normalization
│   ├── hosts.py              # registered_host, is_directory_domain
│   └── http.py               # Shared httpx client with timeouts, retry, and User-Agent
├── discovery/
│   ├── base.py               # DiscoveryProvider protocol
│   ├── localities.py         # Locality dataclass, presets, and Nominatim geocoder
│   ├── google_places.py      # Quota-guarded Google Places text search & details
│   ├── overpass.py           # OSM Overpass provider with mirror rotation
│   ├── local_pool.py         # Local offline JSON scraper dataset pool
│   └── waterfall.py          # Lazy CandidateStream waterfall across providers
├── search/
│   ├── base.py               # WebSearchProvider protocol & SearchUnavailable exception
│   ├── ddgs_provider.py      # DuckDuckGo search with global lock, throttle, & circuit breaker
│   ├── cache.py              # SQLite/PostgreSQL DbCache for search queries
│   └── throttle.py           # Jittered rate limiter and global search lock
├── verification/
│   ├── identity.py           # Lead deduplication by phone and name+locality
│   ├── filters.py            # Chain / hospital exclusion filters
│   ├── phone_check.py        # Phone number validation
│   ├── website_check.py      # 3-step verdict: maps -> osm -> ddgs (NO_SITE, HAS_SITE, UNVERIFIED)
│   └── verifier.py           # Verification stage orchestrator
├── research/
│   ├── entity_match.py       # Doctor and clinic entity matching
│   ├── doctor.py             # Doctor profile and qualification extractor
│   └── hours.py              # Operating hours parser
├── build/
│   ├── templates.py          # Template configurations (Modern, Premium, Warm)
│   ├── payload.py            # Clinic, claims, services, and FAQs JSON builders
│   ├── self_check.py         # Strict content integrity validator (rejects fabrications)
│   └── lead_factory.py       # CRM Lead, LeadFacts, and Package DB entity factory
├── recording/
│   ├── naming.py             # Canonical MP4 and preview link naming
│   ├── link_verifier.py      # HTTP probe for live demo URLs
│   └── walkthrough.py        # Playwright batch video recording subprocess caller
├── runs/
│   ├── context.py            # RunContext with cancel token, counters, and event emitter
│   ├── job_manager.py        # Single-flight lock and active run registry
│   ├── stages.py             # Stage execution functions (discovery -> recording)
│   └── runner.py             # Thin top-level execute_autopilot_run coordinator
├── quota.py                  # QuotaGuard with api_usage DB tracking
├── orchestrator.py           # Deprecated backward-compatibility shim
├── adapters/                 # Outreach and batch adapters
└── pipelines/                # Pipeline definitions
```

---

## 2. Stage Execution Diagram

```
[Start Run]
    │
    ▼
[Stage 1: Discovery (Waterfall)]
    ├── Google Places (Quota-Guarded) ──► If exhausted / over quota
    ├── OSM Overpass (Free) ────────────► If exhausted
    └── Local Pool (Offline JSON) ──────► (Disabled in testing_mode)
    │
    ▼
[Stage 2: Verification]
    ├── DB Deduplication (Phone last-10 & Name+Locality)
    ├── Hospital / Chain Filter (e.g. Clove, Apollo)
    ├── Phone Validation (Indian mobile format)
    └── Website Check (DDGS with circuit breaker)
         ├── Maps/OSM URL ──► HAS_SITE (Skip DDGS)
         ├── Directory only ──► NO_SITE (Lead candidate!)
         └── Circuit open/error ──► UNVERIFIED ("hold" drops candidate)
    │
    ▼
[Stage 3: Research]
    ├── Doctor Name & Experience Extraction
    ├── Honest Consultation Fee (Real fee or omit; never fabrications)
    └── Timings / Hours Extraction
    │
    ▼
[Stage 4: Build]
    ├── Multi-template JSON payload generation
    ├── Self-Check Gate (Rejects fabricated 4.9/50+ or unverified claims)
    └── Lead DB Entity Factory (CRM Lead + LeadFacts + Packages)
    │
    ▼
[Stage 5: Live Recording]
    ├── Engine demo HTTP link verification
    └── Playwright video walkthrough recorder (Subprocess with timeout)
    │
    ▼
[Stage 6: Batch Sync & Outreach Ready]
    └── Sync verified video links to batch JSON and CRM packages
```

---

## 3. Testing Mode Semantics

When `testing_mode=True` is passed to `run_autopilot_discovery`:

1. **Zero Cache Reads or Writes**:
   - Both `search_cache` and `overpass_cache` are bypassed (`bypass=True`).
   - No cached queries are read; no new responses are saved to the cache.
2. **Local Pool Disabled**:
   - `local_pool` discovery is automatically excluded from the waterfall.
3. **No Cached Videos**:
   - The video recorder ignores existing MP4s and re-records fresh.
4. **Target Clamp**:
   - `target` is clamped to `TEST_MODE_MAX_TARGET` (default: 3) to prevent runaway runs.
5. **Database Isolation (`is_test=True`)**:
   - Created `Lead` records are tagged `is_test = True` with a unique `test_run_id`.
   - Normal CRM queries and dashboards exclude test leads by filtering `is_test == False`.
6. **Cleanup API**:
   - `POST /api/v1/pipeline/test-runs/cleanup` purges test leads, packages, lead facts, and logs for a specific `test_run_id` or all test runs older than a retention window.

---

## 4. Free-Tier Budget & Quota Guard

The pipeline enforces zero paid API usage:

| Service | Role | Cost | Quota Guard Policy |
| :--- | :--- | :--- | :--- |
| **OSM Overpass** | Discovery | FREE | Rotates across public mirrors on 429/504; 24h DB cache |
| **DuckDuckGo (`ddgs`)** | Web Search | FREE | 4s throttle + jitter, 1 in flight, circuit breaker after 3 failures |
| **Nominatim** | Geocoding | FREE | Max 1 req/sec with custom User-Agent; cached permanently |
| **Google Places** | Discovery | Pay-as-you-go | Soft limit: 900 text searches / 900 details per month |

### What happens when Google Places quota is hit?
1. `QuotaGuard.try_consume("google_places", "text_search")` returns `False`.
2. A `[QUOTA]` log tag is emitted: `"[QUOTA] Monthly soft limit reached for google_places:text_search. Skipping Google provider."`
3. The waterfall immediately advances to the next provider (**OSM Overpass**), ensuring zero disruption and zero surprise billing.
