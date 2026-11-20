# Herald — Full-App Performance & Resilience Execution Plan

**Branch:** `perf/full-app-optimization`  
**Scope:** End-to-end backend, API/streaming, frontend data-layer, and UI rendering optimization.  
**Rule:** Execute phase-by-phase. Verify tests/builds and commit at each phase checkpoint before advancing.

---

## Phase 1: Database, Indexing, Caching & Pagination

### Goals
Eliminate SQLite lock contention, full-table scans, N+1 queries, and unbounded list payloads.

### Target Files
- `backend/app/db/session.py`, `backend/app/database.py`, `backend/app/db/schema_migrations.py`
- `backend/app/models/entities.py`, `backend/app/models.py`
- `backend/app/repositories/lead_repo.py`, `message_repo.py`, `hustle_repo.py`, `package_repo.py`, `tracking_repo.py`
- `backend/app/services/cache_manager.py` (new)
- `backend/app/services/lead_service.py`, `message_service.py`, `cockpit_service.py`
- `backend/app/core/config.py`

### Execution Checklist
- [ ] **DB Connection Pooling & SQLite WAL Tuning:**
  - Configure `PRAGMA journal_mode=WAL;`, `PRAGMA synchronous=NORMAL;`, `PRAGMA busy_timeout=5000;`, `PRAGMA cache_size=-64000;`, `PRAGMA temp_store=MEMORY;` on engine connect.
  - Tune SQLAlchemy pool (`pool_size`, `max_overflow`, `pool_pre_ping=True`) for non-SQLite/pooled modes and `NullPool`/`StaticPool` appropriately for SQLite async/sync access.
- [ ] **B-Tree Indexes (`O(log N)` lookups):**
  - Add composite and single-column B-Tree indexes in `entities.py` / `schema_migrations.py` on hot filter/sort columns: `leads(stage, updated_at)`, `leads(created_at)`, `leads(city, niche)`, `messages(lead_id, created_at)`, `calls(lead_id, scheduled_at)`, `discovery_runs(created_at)`.
- [ ] **O(1) Lookup Index & N+1 Elimination:**
  - Replace per-row lazy/looped queries in `lead_service.py`, `message_service.py`, and `cockpit_service.py` with `selectinload` / `joinedload` or batched `IN (...)` queries mapped into `O(1)` `dict[id, entity]` lookup tables.
- [ ] **Repository / Service / `CacheManager` Pattern:**
  - Implement `backend/app/services/cache_manager.py` supporting:
    1. Local Redis (`redis://localhost:6379`)
    2. Cloud Redis via `REDIS_URL` env var
    3. Automatic in-memory LRU fallback (`cachetools` / `OrderedDict` with TTL) when Redis is unavailable.
  - Wire `CacheManager` into read-heavy services with explicit invalidation on write/mutation.
- [ ] **Cursor / Offset Pagination:**
  - Add `limit` + `cursor` (or `offset`) pagination to lead, discovery, message, and run-matrix endpoints; return `{ items, next_cursor, total }`.

### Commit Checkpoint
- `perf(db): add WAL tuning, B-tree indexes, N+1 fixes, CacheManager, and pagination`

---

## Phase 2: Backend Resilience, Concurrency, Streaming & Telemetry

### Goals
Prevent cascading hangs from external APIs, serialize Playwright safely, parallelize independent I/O, and add compression + observability.

### Target Files
- `backend/app/main.py`
- `backend/app/middleware/` (new `exception_handler.py`, `timing.py`, `etag.py`)
- `backend/app/services/ai_service.py`, `assistant_service.py`
- `backend/app/autopilot/discovery/`, `backend/app/autopilot/recording/`
- `backend/app/services/sse_publisher.py`, `backend/app/controllers/events_controller.py`

### Execution Checklist
- [ ] **Global FastAPI Exception Middleware:**
  - Catch unhandled exceptions and `HTTPException`s into a uniform JSON envelope: `{ "error": { "code", "message", "request_id", "details" } }`.
- [ ] **External API Timeouts:**
  - Enforce explicit `httpx.Timeout` / SDK timeouts on all Gemini, Google Places, and Practo calls with bounded retries/backoff.
- [ ] **Parallel I/O & Playwright Concurrency Lock:**
  - Use `asyncio.gather(..., return_exceptions=True)` for independent discovery/enrichment I/O.
  - Enforce a strict `asyncio.Semaphore(1)` around Playwright browser launch/recording in `backend/app/autopilot/recording/` to prevent OOM/CPU thrashing.
- [ ] **Background Job Queue (`202 Accepted`):**
  - Offload heavy demo builds, batch discovery, and recordings to background tasks returning `202 Accepted` with a `job_id` status endpoint/SSE stream.
- [ ] **SSE Token-by-Token AI Streaming:**
  - Stream Gemini/Copilot responses token-by-token over SSE in `assistant_service.py` / `ai_service.py`.
- [ ] **Compression, ETag & Telemetry:**
  - Enable `GZipMiddleware` (and Brotli if available).
  - Add `ETag` / `If-None-Match` `304 Not Modified` support for cacheable GET endpoints.
  - Add `X-Response-Time-Ms` header middleware and a `>100ms` slow-query/slow-endpoint warning logger.

### Commit Checkpoint
- `perf(api): add global error envelope, timeouts, Playwright semaphore, 202 jobs, SSE streaming, GZip/ETag, and timing`

---

## Phase 3: Frontend Data Layer, Resilience & Optimistic UI

### Goals
Eliminate duplicate network calls, surface clear offline/error states instead of blank `--`, and make mutations feel instant.

### Target Files
- `frontend/src/lib/apiClient.ts` (new or consolidated)
- `frontend/src/context/CRMContext.tsx`
- `frontend/src/components/ui/Toast.tsx`, `frontend/src/components/layout/Header.tsx`
- `frontend/src/features/board/KanbanBoardView.tsx`, `frontend/src/features/table/LeadsTableView.tsx`
- `frontend/src/features/cockpit/discovery/DiscoveryTab.tsx`, `frontend/src/features/cockpit/outreach/OutreachTab.tsx`

### Execution Checklist
- [ ] **Centralized `apiClient.ts` Interceptor:**
  - Single fetch wrapper with base URL, request-ID propagation, timeout handling, and structured error parsing.
- [ ] **Input Pre-Validation:**
  - Validate form/mutation payloads client-side before dispatching network requests.
- [ ] **In-Flight Request Deduplication:**
  - Deduplicate concurrent identical `GET` requests by cache key so multiple components mounting together share one promise.
- [ ] **SWR / ETag Client Cache:**
  - Cache responses with `ETag` revalidation (`If-None-Match`) and stale-while-revalidate semantics.
- [ ] **Structured Error Toasts & Backend Offline Banner:**
  - Parse backend `{ error: { code, message } }` into actionable `Toast` notifications.
  - Render a persistent, non-intrusive **Backend Offline** banner when health/API checks fail instead of silent `--` placeholders.
- [ ] **Network-Aware & Tab-Visibility Polling Backoff:**
  - Pause or back off polling when `document.visibilityState === 'hidden'` or `navigator.connection.effectiveType` is `2g`/`3g`.
- [ ] **Optimistic UI Updates with Rollback:**
  - Apply immediate state updates for Kanban stage moves, lead edits, and batch actions; roll back cleanly with an error toast if the API fails.

### Commit Checkpoint
- `perf(frontend-data): add apiClient, dedup, SWR/ETag cache, offline banner, visibility backoff, and optimistic UI`

---

## Phase 4: Frontend Rendering, Virtualization & Bundle Optimization

### Goals
Keep UI interactions at 60fps with 500+ leads, eliminate layout shift, and shrink initial JS/asset payloads.

### Target Files
- `frontend/next.config.ts` / `next.config.mjs`
- `frontend/package.json`
- `frontend/src/features/table/LeadsTableView.tsx`, `frontend/src/features/cockpit/discovery/LeadDataTable.tsx`
- `frontend/src/features/modals/CommandPaletteModal.tsx`, `frontend/src/features/settings/SettingsModal.tsx`, `frontend/src/features/cockpit/demo-factory/MultiDevicePreviewDrawer.tsx`
- `frontend/src/components/ui/Skeleton.tsx` (new)

### Execution Checklist
- [ ] **Skeleton Loading Screens:**
  - Replace generic spinners/blank states with layout-matched skeleton loaders for tables, Kanban columns, and drawers.
- [ ] **List Virtualization (500+ Rows at 60fps):**
  - Virtualize `LeadsTableView.tsx` and `LeadDataTable.tsx` (e.g., `@tanstack/react-virtual`) so only visible rows are mounted in the DOM.
- [ ] **React Re-Render Prevention:**
  - Memoize heavy row/card components (`React.memo`), stabilize callbacks (`useCallback`), and split context selectors so unrelated state changes don't re-render the entire board/table.
- [ ] **`next/dynamic` Lazy Loading:**
  - Dynamically import heavy modals/drawers (`CommandPaletteModal`, `SettingsModal`, `MultiDevicePreviewDrawer`, `AssistantDrawer`) with `ssr: false` where appropriate.
- [ ] **WebP/AVIF & Immutable Cache-Control/CDN Headers:**
  - Configure `images: { formats: ['image/avif', 'image/webp'] }` and immutable `Cache-Control` headers for static assets in `next.config`.
- [ ] **Unused Dependency Pruning:**
  - Audit `frontend/package.json` and `backend/requirements.txt` (or `pyproject.toml`) to remove unused packages and verify `npm run build` bundle size.

### Commit Checkpoint
- `perf(ui): add skeletons, table virtualization, memoization, next/dynamic, image/cache headers, and dep pruning`
