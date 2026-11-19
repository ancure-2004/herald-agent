# Herald - Multi-Agent Operations Engine: Agent Project Guide (`AGENTS.md`)

## 1. Project Architecture Overview
Herald is an autonomous Multi-Agent Operations Engine combining an executive command center, automated client acquisition factory, live template demo engines, and native Model Context Protocol (MCP v2.0.0) agent coordination.

- **Backend (`backend/`)**:
  - Python 3.12+ / FastAPI / SQLAlchemy ORM / SQLite (`personal_os.db`) or PostgreSQL.
  - Layered architecture: `app/api/` (routers), `app/controllers/` (business logic), `app/services/` (pipeline, RAG, AI, messaging), `app/autopilot/` (waterfall discovery, verification, and recording).
  - MCP Server: `backend/mcp_server.py` exposing 11 native tools with single-flight DB lock (`runs` table).
- **Frontend (`frontend/`)**:
  - Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
  - Single-viewport fixed shell (`h-full w-full overflow-hidden`), high-density Obsidian Flight Deck theme.
  - Real-time Server-Sent Events (SSE) telemetry, Command Palette (`⌘K`), unified CRM context.
- **Engines (`engines/`)**:
  - `engines/dental-clinic-engine`: Next.js 3-design demo engine (`Modern`, `Premium`, `Warm`).
  - `engines/dental-batch-recorder`: Sequential 1-by-1 Playwright walkthrough recorder.
- **Unified Tests (`tests/`)**:
  - `tests/backend/`: Backend unit, integration, and service tests.
  - `tests/e2e/`: 4-tier independent opaque-box E2E test suite (72 scenarios).
  - `tests/ui_pass/`: UI accessibility, design token audits, and automated probe scripts.

---

## 2. Protected Safety Rules & Invariants (NEVER Violate)
1. **Daily Channel Limits (`backend/app/safety.py`)**: Outbox refuses to queue or dispatch messages exceeding daily caps for WhatsApp, Instagram, or Email.
2. **Do-Not-Contact Guard (`backend/app/safety.py`)**: Any incoming message with stop/opt-out intent immediately flips `do_not_contact = True` and purges pending queue items.
3. **Idempotent Delivery Keys**: Every outbox row is unique on `lead_id + channel + stage_or_step` to prevent duplicate transmissions.
4. **Single-Flight Run Locking**: Cross-process lock on `runs` table ensures only one discovery or build batch runs at a time, returning HTTP 409 Conflict to concurrent UI or MCP triggers.
5. **Data Immutability & Audit Trails**:
   - `leads` are archived (`is_archived = True`), never hard deleted.
   - `messages` and `runs` rows are append-only.
   - Every active lead requires a scheduled `next_action` and `next_action_due_at`.

---

## 3. Key Commands

### Unified Startup
```bash
# Start Backend (8000), Frontend (3000), and Demo Engine (3001)
./start.sh
```

### Backend & MCP
```bash
# Start FastAPI backend standalone
cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run MCP server
cd backend && .venv/bin/python mcp_server.py
```

### Frontend
```bash
# Start Next.js frontend standalone
cd frontend && npm run dev

# Typecheck frontend
cd frontend && npx tsc --noEmit
```

### Testing Suites
```bash
# Run backend test suite (from root or backend/)
backend/.venv/bin/pytest tests/backend/

# Run complete 4-tier opaque-box E2E suite (72 tests)
backend/.venv/bin/python tests/e2e/runner.py
```
