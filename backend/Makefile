.PHONY: help install run dev test lint format typecheck audit clean validate-clinics record-batch dev-engine

PYTHON := .venv/bin/python
UVICORN := .venv/bin/uvicorn
PYTEST := .venv/bin/pytest
RUFF := .venv/bin/ruff
MYPY := .venv/bin/mypy
PIP_AUDIT := .venv/bin/pip-audit

help:
	@echo "Available commands:"
	@echo "  make run              - Start FastAPI backend with uvicorn (port 8000)"
	@echo "  make dev              - Start FastAPI backend with hot reload"
	@echo "  make test             - Run test suite with pytest"
	@echo "  make lint             - Run ruff linter"
	@echo "  make format           - Auto-format code with ruff"
	@echo "  make typecheck        - Run static type checking with mypy"
	@echo "  make audit            - Scan installed packages for vulnerabilities"
	@echo "  make validate-clinics - Run Dental Clinic Engine TypeScript schema validator"
	@echo "  make record-batch     - Run Playwright batch recorder"
	@echo "  make dev-engine       - Start Dental Clinic Engine on port 3001"
	@echo "  make clean            - Clean python caches and temporary files"

run:
	$(UVICORN) app.main:app --host 0.0.0.0 --port 8000

dev:
	$(UVICORN) app.main:app --host 0.0.0.0 --port 8000 --reload

test:
	$(PYTEST) -v

lint:
	$(RUFF) check app/ tests/

format:
	$(RUFF) format app/ tests/
	$(RUFF) check --fix app/ tests/

typecheck:
	$(MYPY) app/

audit:
	$(PIP_AUDIT)

validate-clinics:
	cd ../engines/dental-clinic-engine && npm run validate

record-batch:
	cd ../engines/dental-batch-recorder && npm run record

dev-engine:
	cd ../engines/dental-clinic-engine && npm run dev -- -p 3001

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
