# Herald - Backend API

Production-grade, modular, layered FastAPI backend for Herald multi-agent operations engine.

---

## Architecture Summary

```
backend/
├── app/
│   ├── main.py              # create_app() factory, lifespan, middleware, routers
│   ├── core/                # config (pydantic-settings), logging, security, exceptions
│   ├── api/
│   │   ├── deps.py          # Shared FastAPI dependencies (DB, Settings, User)
│   │   └── v1/
│   │       ├── router.py    # Aggregated v1 router
│   │       └── routes/      # Isolated HTTP route handlers
│   ├── controllers/         # Transport coordinators (input validation -> service -> response)
│   ├── services/            # Pure business logic, safety rules, score calculators
│   ├── repositories/        # Database queries and persistence abstractions
│   ├── models/              # SQLAlchemy database entities
│   ├── schemas/             # Pydantic request/response schemas (extra="forbid")
│   ├── middleware/          # Security headers, Request-ID, body size limit, slowapi
│   ├── db/                  # Engine, SessionLocal, Base
│   └── utils/               # Normalizers, invariants, safety checks
├── docs/
│   ├── ARCHITECTURE.md      # Detailed layer diagrams and data flows
│   ├── API.md               # Complete endpoint catalog and query parameters
│   ├── openapi.json         # Full OpenAPI 3.1 specification schema
│   ├── ENVIRONMENT.md       # Environment variables reference
│   ├── SECURITY.md          # Security hardening and secret rotation notice
│   ├── DEVELOPMENT.md       # Developer guide and contribution workflows
│   └── CHANGELOG.md         # Refactoring details and upgrade notes
├── tests/                   # Pytest test suite (16 tests, 100% passing)
├── .env.example             # Documented template for environment variables
├── Makefile                 # Standard automation targets (run, dev, test, lint, format)
└── pyproject.toml           # Tooling configuration (Ruff, MyPy, Pytest)
```

---

## Quickstart

### 1. Run the Backend Server
```bash
make dev
# or
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Verify Health
```bash
curl http://localhost:8000/api/health
# or
curl http://localhost:8000/api/v1/health
```

### 3. Run Tests
```bash
make test
```

### 4. Code Quality & Security Checks
```bash
make lint
make format
make audit
```

For full documentation, visit the [docs directory](docs/ARCHITECTURE.md).
