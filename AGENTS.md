# Personal OS & CRM - Agent Project Guide (`AGENTS.md`)

## 1. Architecture Overview
- **Backend (`backend/`)**: Python + FastAPI + SQLAlchemy ORM + Postgres/SQLite queue worker.
- **Frontend (`frontend/`)**: Next.js (App Router) + TypeScript + Tailwind CSS + keyboard-first CRM UI.
- **Connected Engines (`../`)**:
  - `../dental-clinic-engine`: Next.js 3-design dental demo engine (`Modern`, `Premium`, `Warm`).
  - `../Side hustle (Building Website)/lead-scraper`: Serper + Brave + Instagram discovery and research pipeline.
  - `../Side hustle (Building Website)/dental-batch-recorder`: Playwright + FFmpeg walkthrough video recorder.
  - `../Side hustle (Building Website)/dispatch-cockpit`: Multi-channel outreach senders (WhatsApp, Instagram, Email).

## 2. Protected Safety Rules & Invariants (NEVER Violate)
The following files and invariants are protected and require explicit user approval and passing tests before modification:
1. **Daily Channel Limits (`backend/app/safety.py`)**: The outbox MUST refuse to queue or send any message that exceeds a hustle's `daily_limit` for that channel.
2. **Do-Not-Contact Guard (`backend/app/safety.py`)**: A `do_not_contact` check MUST run before every send, and any incoming message matching stop/unsubscribe intent MUST immediately flip `do_not_contact = True` and cancel pending outbox items.
3. **No-Double-Send Idempotency (`backend/app/models.py` & `safety.py`)**: Every outbox message has a `unique_key` constraint (`lead_id + channel + stage_or_step`). Retries MUST never send duplicate messages.
4. **Excel-Replacement Invariants**:
   - Every active lead (`is_archived == False` and stage not Won/Lost) MUST have a non-empty `next_action` and `next_action_due_at`.
   - Completing a task on an active lead MUST require setting the next action and due date.
   - `messages` rows are append-only (never edited or deleted).
   - `leads` rows are archived (`is_archived = True`), never deleted.
   - Normalized phone numbers and Instagram handles are unique across leads to block duplicates.

## 3. Test & Run Commands
- **Run Backend Tests**:
  ```bash
  cd backend && .venv/bin/pytest -v
  ```
- **Start FastAPI Backend**:
  ```bash
  cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Start Next.js Frontend**:
  ```bash
  cd frontend && npm run dev
  ```
- **Typecheck Frontend**:
  ```bash
  cd frontend && npx tsc --noEmit
  ```
