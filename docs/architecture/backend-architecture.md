# Backend Architecture - Personal OS & CRM

## Overview

The backend is built with **FastAPI** and **SQLAlchemy**, engineered around a strict **layered, unidirectional architecture**. The design cleanly decouples transport (HTTP/FastAPI), orchestration (controllers), business rules (services), and persistence (repositories and models).

---

## Architectural Layers

```
              ┌─────────────────────────────────────────────────────────┐
              │                   HTTP Client / Frontend                │
              └────────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Middleware Pipeline                                  │
│  RequestIdMiddleware ──► SecurityHeaders ──► RequestSizeLimit ──► TrustedHost ──► CORS │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            API Routing Layer (app/api/v1/routes/)                      │
│      /health  │  /hustles  │  /leads  │  /messages  │  /tracking  │  /pipeline  │  ... │
│         (Only URL routing, HTTP methods, Pydantic validation, and status codes)        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Controllers Layer (app/controllers/)                      │
│             (Takes validated input, invokes services, shapes responses)                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Services Layer (app/services/)                           │
│        (All business logic, invariant enforcement, scoring, and SSE streaming)         │
└─────────────────────────────┬──────────────────────────┬───────────────────────────────┘
                              │                          │
                              ▼                          ▼
┌────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
│   Repositories (app/repositories/)     │    │       Utilities & Safety Engines         │
│  (DB queries, filters, joins, flushes) │    │  (app/utils/safety.py, event_bus, etc.)  │
└─────────────────────────────┬──────────┘    └──────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Models / Database Layer                                  │
│                 SQLAlchemy ORM Entities (app/models/entities.py)                       │
│                        PostgreSQL (Neon) / SQLite Engine                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Unidirectional Dependency Rules

Dependencies flow in strictly **one direction**:
1. `routes` import from `controllers`, `schemas`, and `deps`.
2. `controllers` import from `services`, `schemas`, and `models` (for typing only).
3. `services` import from `repositories`, `models`, `schemas`, and `utils`.
4. `repositories` import from `models` and `db.session`.
5. `models` and `schemas` have zero upward dependencies.

Circular imports are eliminated.

---

## Dependency Injection (DI)

FastAPI's `Depends` system provides clean dependency injection throughout the lifecycle:
- `get_db`: Yields scoped SQLAlchemy database sessions (`SessionLocal`). Sessions automatically close upon request completion.
- `get_settings`: Yields cached application configuration parsed via `pydantic-settings`.
- `get_current_user`: Provides a typed placeholder for upcoming authentication layers.

---

## Error Handling & Global Interceptors

Instead of scattered `try/except` blocks in individual route handlers, error handling is centralized in `app/core/exceptions.py`:
- `AppException`: Base exception with `message`, `status_code`, `error_code`, and `details`.
- `NotFoundError` (HTTP 404): Raised when a hustle, lead, or commitment does not exist.
- `ConflictError` (HTTP 409): Raised on slug collisions or idempotency key double-sends.
- `InvariantViolationError` / `UnprocessableEntityError` (HTTP 422): Raised when business invariants are violated (e.g. active lead missing next action).
- `MethodNotAllowedError` (HTTP 405): Raised when attempting to delete leads or edit messages.

All exceptions format into a uniform JSON response with request correlation IDs:
```json
{
  "error": {
    "code": "INVARIANT_VIOLATION",
    "message": "Every active lead must have a next_action and next_action_due_at.",
    "details": {},
    "request_id": "req-98fbc12a34de"
  },
  "detail": "Every active lead must have a next_action and next_action_due_at."
}
```

---

## Live Event Streaming & Terminal Logs

- **SSE Stream (`/api/events/stream`)**: Pushes real-time server-sent events for lead creation, task completion, outbox sends, and hot-lead views.
- **Terminal Ring Buffer (`app/services/event_bus.py`)**: Stores the last 250 structured execution logs for real-time observability in the CRM Cockpit.
