# Development Guide - Personal OS & CRM

## Local Setup

### 1. Requirements
- Python 3.11+ (Python 3.14 compatible)
- SQLite (local development) or PostgreSQL 15+ (production)

### 2. Virtual Environment Setup
```bash
cd "projects/PersonalOS and CRM/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your local settings if needed
```

---

## Make Commands

| Command | Action |
| :--- | :--- |
| `make dev` | Start development server with live reload on `http://0.0.0.0:8000` |
| `make run` | Start standard Uvicorn server |
| `make test` | Run complete Pytest test suite |
| `make lint` | Run Ruff linter checks |
| `make format` | Automatically reformat code with Ruff |
| `make typecheck` | Run MyPy static type analysis |
| `make audit` | Scan installed dependencies for security advisories |
| `make clean` | Remove `.pytest_cache`, `.ruff_cache`, and `__pycache__` directories |

---

## Adding a New Endpoint

To add a new endpoint, follow the layered architecture:

1. **Schema** (`app/schemas/`): Define Pydantic request and response models with `extra="forbid"`.
2. **Repository** (`app/repositories/`): Implement database queries using SQLAlchemy.
3. **Service** (`app/services/`): Implement business rules, invariants, and calculations.
4. **Controller** (`app/controllers/`): Take validated inputs, call the service, shape response.
5. **Route** (`app/api/v1/routes/`): Wire URL, HTTP method, status codes, and `Depends`.
6. **Tests** (`tests/`): Add integration tests using `TestClient`.
