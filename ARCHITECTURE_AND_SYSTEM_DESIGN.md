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

- **Unit & Integration Tests**: 16/16 tests passing in `tests/`.
- **Linter & Formatter**: Clean pass on Ruff (`ruff check app/ tests/`).
- **Dependency Audit**: `pip-audit` verified with 0 known vulnerabilities.
- **OpenAPI Schema**: Exported to `docs/openapi.json` (145 KB, fully typed).
