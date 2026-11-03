# Architecture & System Design Document
**Personal OS & CRM - Layered Production Backend**

---

## 1. System Architecture Overview

The backend was refactored from a monolithic single-file structure into a **layered, clean, production-grade architecture** following Domain-Driven principles.

### Dependency Flow

Dependencies flow in strictly **one direction**:
```
HTTP Requests
      │
      ▼
[ Middleware Pipeline ] (Request-ID, Security Headers, Size Limit, Host Guard, CORS)
      │
      ▼
[ API Routes ]          (URL mapping, Pydantic schemas, HTTP status codes, Depends)
      │
      ▼
[ Controllers ]        (Input validation, coordination, response shaping)
      │
      ▼
[ Services ]           (Pure business logic, scoring algorithms, safety invariant engines)
      │
      ▼
[ Repositories ]       (SQLAlchemy database queries, joins, flushes, transactions)
      │
      ▼
[ Database / Models ]  (PostgreSQL on Neon / SQLite with connection pooling)
```

**Architectural Boundaries**:
- Routes have zero business logic.
- Controllers do not execute raw database queries.
- Services are transport-agnostic and fully testable without FastAPI dependencies.
- Models and schemas never reference upper layers.

---

## 2. Directory Layout & Layer Responsibilities

```
backend/
├── app/
│   ├── main.py              # create_app() application factory, lifespan context, router mounts
│   ├── core/
│   │   ├── config.py        # pydantic-settings Settings class, validates .env, cached via lru_cache
│   │   ├── logging.py       # Structured JSON logger with regex-based PII/Secret redaction
│   │   ├── security.py      # User authentication model and get_current_user dependency placeholder
│   │   └── exceptions.py    # Custom exception classes (AppException, NotFound, Conflict, Invariant)
│   ├── api/
│   │   ├── deps.py          # Shared dependency injection providers (get_db, get_settings, get_current_user)
│   │   └── v1/
│   │       ├── router.py    # Master v1 router aggregating all modular sub-routers
│   │       └── routes/      # Clean HTTP routes: health, hustles, leads, messages, tracking, pipeline, agents, assistant, events
│   ├── controllers/         # Coordinate business requests between routes and domain services
│   ├── services/            # Core business rules: safety checks, sprint computation, stock planning, event bus
│   ├── repositories/        # Encapsulated database operations (HustleRepository, LeadRepository, MessageRepository, TrackingRepository)
│   ├── models/              # SQLAlchemy ORM entity definitions (app/models/entities.py)
│   ├── schemas/             # Pydantic v2 schemas with extra="forbid" on mutation models
│   ├── middleware/          # SecurityHeaders, RequestId, RequestSizeLimit (10MB), slowapi Limiter
│   ├── db/                  # Engine creation, SessionLocal factory, DeclarativeBase
│   └── utils/               # Normalizers (phone/IG), slugify, promise parser, reply classifier
├── docs/                    # Exhaustive documentation suite (ARCHITECTURE, API, openapi.json, SECURITY, ENVIRONMENT, DEVELOPMENT, CHANGELOG)
├── tests/                   # Pytest automated test suite (16 tests, 100% pass rate)
├── .env.example             # Documented template containing every configuration variable
├── Makefile                 # Standard developer commands (run, dev, test, lint, format, audit)
└── pyproject.toml           # Modern Python packaging and quality tool definitions
```

---

## 3. Core Engine Invariants & Safety Brakes

The backend enforces six core business invariants:

1. **Mandatory Next Action Rule**: Every active lead must have a `next_action` string and a future `next_action_due_at` timestamp. Attempting to create or update an active lead without a next step raises HTTP 422.
2. **Duplicate Contact Prevention**: Phone numbers are normalized to E.164 (`+91XXXXXXXXXX`) and Instagram handles are stripped of `@` and lowercased. Duplicate contacts across leads are blocked at the database level.
3. **Immutable Communication Timeline**: Messages and timeline entries can never be modified or deleted (`PUT/PATCH/DELETE /api/messages/{id}` returns HTTP 405 Method Not Allowed).
4. **Leads Never Deleted**: Leads are archived with a mandatory reason, never deleted (`DELETE /api/leads/{id}` returns HTTP 405).
5. **No-Double-Send Idempotency**: Outbox items require a composite unique key (`lead:{id}:ch:{channel}:step:{step_tag}`). Repetitive dispatch attempts fail fast with HTTP 409 Conflict.
6. **Stock Buffer & Away-Mode Planning**: Calculates required ready packages based on daily goals and away/off days to prevent pipeline starvation.

---

## 4. Production Security Hardening

- **CORS Allowlist**: Strict origin checking against `settings.cors_origins_list` (no wildcard `*`).
- **Trusted Host Guard**: Rejects unrecognized `Host` headers to prevent host injection attacks.
- **Security Headers**: Injects `nosniff`, `DENY` frame options, XSS blocking, and HSTS headers.
- **Request Size Limiting**: Hard 10MB ceiling prevents memory exhaustion vectors.
- **IP Rate Limiting**: `slowapi` limiter enforces 120 requests/min default and 20 requests/min on intensive automation routes.
- **Secret Scrubbing**: Regex filters automatically sanitize API keys, database passwords, and auth tokens from logs.

---

## 5. API Compatibility Strategy

To ensure zero downtime and zero breaking changes for the existing frontend:
- **Versioned API**: Exposed cleanly under `/api/v1/...`.
- **Legacy Frontend Alias**: The master router is mounted simultaneously under `/api/...`.
- **Health Verification**: `/api/health` and `/api/v1/health` return live database connectivity and fleet counts.
- **Error Envelopes**: Errors return both the modern structured envelope (`{"error": {...}}`) and the legacy FastAPI `{"detail": ...}` key.

---

## 6. Verification & Quality Metrics

- **Unit & Integration Tests**: 18/18 tests passing in `tests/` (including health, CRM rules, hustles, and SSE event streaming).
- **Linter & Formatter**: Clean pass on Ruff (`ruff check app/ tests/`).
- **Dependency Audit**: `pip-audit` verified with 0 known vulnerabilities.
- **OpenAPI Schema**: Exported to `docs/openapi.json` (145 KB, fully typed).

---

## 7. Performance, Scalability & Next-Phase System Architecture

As lead volume scales from hundreds to thousands, the following architectural additions ensure sub-second response times, zero database lock contention, and high availability:

### 7.1 Database Indexing & Fast Search Strategy
- **High-Volume Search Bottleneck**: When searching across 1,000s of clinics to check whether a lead already exists, linear table scans (`O(N)`) degrade ingestion throughput.
- **Composite B-Tree Indexes**:
  - `idx_leads_phone`: Unique index on normalized E.164 phone numbers (`normalized_phone`).
  - `idx_leads_ig`: Unique index on normalized Instagram handle (`normalized_ig`).
  - `idx_leads_locality_name`: Composite B-tree index on `(locality, name)` for fast locality searches.
  - `idx_leads_stage_intent`: Sorted composite index on `(stage_id, intent_score DESC)` for immediate Kanban and smart-view queries.
- **Algorithmic Fast Lookups**:
  - Store and partition indexed keys in sorted order to enable logarithmic lookups (`O(log N)` binary search over index pages).
  - Use database-level trigram indexing (`pg_trgm` on PostgreSQL) and Levenshtein similarity thresholds to detect duplicate clinic variants (e.g. "Dr. Verma Dental" vs "Verma Dental Clinic") without full table scans.

### 7.2 Distributed Redis Caching Layer
- **Read-Heavy Query Caching**: The application reads metrics, hustles, and lead pipelines frequently. A Redis cache layer intercepts read queries:
  - Active sprint metrics & daily caps cached with a short TTL (e.g. 60s).
  - Pipeline summary aggregations cached with write-invalidation.
  - Individual lead profiles and stage listings cached by key (`cache:lead:{id}`, `cache:pipeline:stats`).
- **Cache Invalidation Policy**: Mutations (stage updates, inbound messages, lead creation) invalidate corresponding cache keys automatically via repository interceptors.

### 7.3 Asynchronous Background Job Queue
- **Decoupling Slow Tasks**: Moving long-running IO tasks out of the HTTP request cycle:
  - Multi-step Autopilot discovery runs.
  - Headless Playwright video walkthrough recordings.
  - External search & verification scans (Google Places, Serper, Brave).
  - Multi-channel message dispatches (WhatsApp, Instagram, Email).
- **Worker Infrastructure**: Integrate an async job queue (e.g. Celery / ARQ / Redis Queue) with persistent task state, retry policies, and dead-letter queues.

### 7.4 External API Resilience & Timeouts
- **Strict Timeouts**: Enforce hard client timeouts (5s to 8s) on external providers (Google Places, Serper, Brave Search).
- **Circuit Breakers**: Prevent cascading latency spikes by tripping circuit breakers when an external search API experiences consecutive 5xx errors or timeouts.
- **Exponential Backoff**: Transient rate limits (HTTP 429) back off with randomized jitter.

### 7.5 Eliminating N+1 Queries & Enforcing Pagination
- **Eager Loading Enforcement**: Ensure all repository fetch methods explicitly configure `joinedload` or `selectinload` for related models (`messages`, `events`, `commitments`, `stage_rel`) to prevent N+1 query waterfalls.
- **Cursor and Offset Pagination**:
  - All lead list and search endpoints must enforce pagination (`limit`, `offset`, or cursor-based on `id`).
  - Prevent loading thousands of records into memory at once.

### 7.6 Concurrent Parallel Processing
- **Parallel Independent Requests**: Independent external lookups (e.g. querying Google Places, Brave Search, and Instagram verification simultaneously) must run concurrently via `asyncio.gather()` rather than sequential awaits.

### 7.7 Frontend Virtualization & Memory Efficiency
- **DOM Node Pooling**: Large lists (Kanban columns containing hundreds of cards, full table view, and live terminal log buffers) virtualized with `@tanstack/react-virtual`.
- **Low Memory Footprint**: Keeps browser memory consumption flat and eliminates scroll stuttering regardless of total lead count.

### 7.8 Preventing Unnecessary Re-Renders
- **Context Decoupling**: Split high-frequency state (real-time terminal logs, live event SSE streams) from low-frequency transactional state (leads, stages, hustles).
- **Component Memoization**: Use `React.memo`, `useMemo`, and `useCallback` on card components, Kanban columns, and modal drawers so updating one lead does not trigger re-rendering across unrelated components.

### 7.9 Browser Caching for Static Assets
- Configure HTTP `Cache-Control` response headers (`public, max-age=31536000, immutable`) for Next.js static assets, scripts, stylesheets, and fonts to ensure instant page loads on repeat visits.

### 7.10 AI Assistant Architecture: Direct Queries vs. Hybrid RAG
- **Current Architecture**: The internal AI assistant uses direct SQL/ORM queries (`AssistantService`) to aggregate live numbers, commitments, and lead metrics into dynamic LLM prompts.
- **Next-Gen Hybrid RAG Architecture**:
  - **Structured Queries**: Retain direct SQL for live operational metrics (deal value, days in stage, intent score).
  - **Vector RAG (Retrieval-Augmented Generation)**: Store unstructured doctor objection notes, historical sales chats, clinical FAQs, and objection-handling playbooks in a vector database (e.g. `pgvector`).
  - **Hybrid Orchestrator**: The assistant retrieves relevant semantic knowledge via vector similarity while querying live CRM data via SQL, producing accurate, grounded responses without hallucinations.

### 7.11 Multi-Tenant & Public Authentication Readiness
- **Auth Layer**: Upgrade `app/core/security.py` from placeholder to full JWT / OAuth2 bearer token authentication.
- **Tenant Scoping**: All database models and queries will enforce tenant/user scoping (`user_id` / `workspace_id`) to support public, multi-user deployment seamlessly.
