# E2E Test Infrastructure Specification

## 1. Overview & Purpose
This document specifies the end-to-end (E2E) testing infrastructure for the **Personal OS + CRM Production Redesign & Backend Wiring** project (`projects/PersonalOS and CRM`).

The E2E test suite provides an independent, requirement-driven, opaque-box verification layer. It validates the product against user requirements defined in `ORIGINAL_REQUEST.md` (R1-R7) and `PROJECT.md` (Features 1-24), testing exclusively through public HTTP endpoints, API contracts, and integration interfaces as an end user would experience them.

### Guiding Principles
1. **Independent Opaque-Box Testing**: No testing of internal implementation details or private methods. All tests interact with public REST endpoints, SSE streams, and system payloads.
2. **Progressive Testability**: The test suite respects milestone progression (M1 through M6). Features implemented in the current milestone execute and assert full business logic; capabilities pending subsequent milestones are automatically detected and conditionally verified or gracefully skipped with explicit milestone tagging, ensuring the test runner always returns exit code 0.
3. **Deterministic Output Oracles**: Every test derives its expected output directly from documented requirements in `ORIGINAL_REQUEST.md` and `PROJECT.md § Interface Contracts`.
4. **Complete Isolation**: Every test initializes isolated database state via in-memory SQLite and dependency injection overrides, preventing order-dependence and test pollution. Tests also support remote/live server execution via `E2E_BASE_URL`.

---

## 2. 4-Tier Testing Methodology

The E2E test suite is organized into four complementary verification tiers:

```
e2e/
├── tier1_feature_coverage/        # Tier 1: Isolated Happy-Path Feature Coverage (>=5 tests/feature)
├── tier2_boundary_cases/          # Tier 2: Boundaries, Edge Conditions, & Error Handling (>=5 tests/feature)
├── tier3_cross_feature/           # Tier 3: Pairwise Cross-Feature Interactions
├── tier4_real_world/              # Tier 4: Complete Real-World User Workflows
├── conftest.py                    # Shared Pytest Fixtures, TestClient & Helper Utilities
└── runner.py                      # Standalone Executable Test Runner & Formatted Reporter
```

### Tier 1: Feature Coverage (Happy Path in Isolation)
- **Objective**: Verify that each core feature works as specified when given valid, standard inputs in isolation.
- **Requirement**: At least 5 test cases per feature area.
- **Coverage Areas**:
  1. **F1 & Health**: Platform health metadata, API versioning, Gemini model discipline constraints.
  2. **F5 & F6**: Lead management, 16 Delhi NCR dental clinics seed data, stage assignments.
  3. **F3 & F10**: WhatsApp message dispatch, delivery status tracking, automation mode toggles.
  4. **F7 & F11**: Manual reply logging, needs_followup clearing, 3-option AI reply suggestions.
  5. **F2, F8 & F9**: Call entity recording, 5-section AI structuring, pre-call prep brief generation.
  6. **F4, F12 & F13**: Structured terminal log querying, level/service filtering, lead discovery trigger.
  7. **F20, F21 & F22**: Cockpit 4-dashboard attention surfacing, <5s latency threshold, pipeline stage operations.

### Tier 2: Boundary & Corner Cases
- **Objective**: Verify robustness against edge conditions, limits, empty payloads, extreme sizes, zero values, and invalid requests.
- **Requirement**: At least 5 test cases per feature area.
- **Coverage Areas**:
  1. **Channel Restriction Boundaries**: Rejecting SMS, Email, and Instagram for dental clinics; empty/invalid channel values.
  2. **Messaging Boundaries**: Empty message text, extreme string lengths (10KB+), special characters / emojis / unicode, non-existent lead IDs, multi-line pasted replies.
  3. **Call Logging Boundaries**: Empty call transcripts, 0 or negative duration values, non-existent lead IDs, malformed outcomes, huge transcripts.
  4. **Terminal Log Boundaries**: Invalid service filters, invalid log level filters, non-existent lead filtering, negative sequence IDs, empty result sets.
  5. **Cockpit Attention Boundaries**: Empty queues, archived lead exclusion, do-not-contact lead exclusion, boundary timestamp calculations.

### Tier 3: Cross-Feature Combinations
- **Objective**: Verify pairwise interactions between distinct subsystem features and state synchronization across components.
- **Key Interactions**:
  1. *Manual Reply Logging -> Cockpit Attention*: Logging a manual reply updates lead status to `REPLIED`, clears `needs_followup`, and removes the lead from the follow-up dashboard.
  2. *Automation Toggle OFF -> wa.me URL Generation -> Manual Status*: Sending with automation OFF generates a URL-encoded `wa.me` link and records delivery status as `sent_manually`.
  3. *Automation Toggle ON -> Playwright Queue -> Terminal Log*: Sending with automation ON queues the message and emits an outreach terminal log.
  4. *Call Logging -> Prep Brief -> Cockpit Prep Queue*: Logging a raw call structures notes, updates the lead's prep brief, and surfaces the lead in the Call Prep attention dashboard.
  5. *Lead Discovery -> Terminal Logs -> Lead Registry*: Triggering discovery emits live discovery logs and populates new leads in the pipeline.
  6. *Channel Restriction Invariant -> Outbox Dispatch*: Enforcing WhatsApp-only prevents queuing unauthorized channel outreach for dental leads.
  7. *Lead Archive -> Pipeline & Attention Elimination*: Archiving a lead removes it from active pipeline stages and cockpit attention dashboards.

### Tier 4: Real-World Application Scenarios
- **Objective**: End-to-end multi-step user workflows simulating daily dental clinic outreach operations.
- **Required Workflows**:
  1. **Workflow 1: Full Dental Clinic Outreach Cycle**: Lead discovery -> Qualification -> WhatsApp pitch dispatch -> Inbound reply -> AI suggestions -> Manual reply logging -> Stage advancement to Won.
  2. **Workflow 2: Raw Call to Brief to Next WhatsApp Outreach**: Lead intake -> Phone call completed -> Raw call transcript logged -> 5-section AI structuring -> Call prep brief generation -> Outgoing WhatsApp reply crafted with brief context.
  3. **Workflow 3: Lead Discovery Refill to Live Terminal Stream**: Triggering autopilot discovery -> Streaming/polling terminal logs filtered by `discovery` service -> Verifying newly created leads in the database.
  4. **Workflow 4: Cockpit Attention Triage Loop**: Triage across all 4 attention dashboards (Follow-up Required, Unreplied Messages, Today's Actions, Call Prep) -> Taking action on urgent items -> Re-evaluating dashboard queues within the <5s latency threshold.
  5. **Workflow 5: Automation Fallback & Manual wa.me Dispatch**: Lead with automation disabled -> Attempt dispatch -> Verify generated prefilled `wa.me` link -> Confirm manual send -> Audit trail verification in message history and terminal logs.

---

## 3. Test Runner & Execution Guide

### Prerequisites
- Python 3.12+ (Python 3.14 recommended, located at `backend/.venv/bin/python`)
- Dependencies installed in `backend/.venv`: `pytest`, `fastapi`, `httpx`, `sqlalchemy`, `pydantic`

### Execution Commands

#### 1. Standalone Executable Test Runner (Recommended)
From project root (`projects/PersonalOS and CRM`):
```bash
backend/.venv/bin/python e2e/runner.py
```
Or with verbose output:
```bash
backend/.venv/bin/python e2e/runner.py -v
```

#### 2. Native Pytest Command
Run the complete E2E test suite:
```bash
backend/.venv/bin/pytest -v e2e/
```

Run specific tiers:
```bash
# Tier 1 only
backend/.venv/bin/pytest -v e2e/tier1_feature_coverage/

# Tier 2 only
backend/.venv/bin/pytest -v e2e/tier2_boundary_cases/

# Tier 3 only
backend/.venv/bin/pytest -v e2e/tier3_cross_feature/

# Tier 4 only
backend/.venv/bin/pytest -v e2e/tier4_real_world/
```

#### 3. Targeting a Live Running Server
To run the E2E suite against an active FastAPI server (e.g. running on `http://localhost:8000`):
```bash
E2E_BASE_URL="http://localhost:8000" backend/.venv/bin/python e2e/runner.py
```

### Exit Codes
- `0`: All tests passed (or gracefully skipped pending milestone capabilities).
- `1`: One or more test assertions failed or an unhandled exception occurred.

---

## 4. Capability Detection & Progressive Testability Strategy

To enable continuous verification during milestone implementation, the test suite implements **Capability Detection**:
1. When a test targets an endpoint specified in `PROJECT.md § Interface Contracts` (e.g. `POST /api/leads/{id}/messages/send` or `POST /api/leads/{id}/calls`), the test client sends the request.
2. If the endpoint returns `404 Not Found` (indicating the route is pending Milestone 2 implementation), the test gracefully skips with an explanatory message:
   `pytest.skip("Endpoint <PATH> pending Milestone 2 implementation")`
3. If the endpoint returns an active response (`200 OK`, `422 Unprocessable Entity`, etc.), the test executes full assertions against the contract schema.
4. As milestones land, skipped tests automatically convert to actively executing and asserting tests without test code changes.
5. In addition, existing live routes (e.g. `/api/leads/{id}/messages`, `/api/autopilot/cockpit-state`, `/api/terminal/logs`, `/api/health`) are tested immediately to verify live functionality.

---

## 5. Coverage Mapping Matrix

| Requirement | Feature Description | Tier 1 Tests | Tier 2 Tests | Tier 3 Tests | Tier 4 Tests |
|-------------|---------------------|--------------|--------------|--------------|--------------|
| **R1** | Model Discipline & Health | `test_health_and_model_discipline.py` | `test_boundary_channels.py` | Pairwise | Workflow 4 |
| **R2** | WhatsApp Outreach & Automation | `test_messaging_and_dispatch.py`, `test_manual_reply_and_suggestions.py` | `test_boundary_messaging.py` | Pairwise 2, 3, 6 | Workflow 1, 5 |
| **R3** | Calls Management & Prep Brief | `test_calls_and_briefs.py` | `test_boundary_calls.py` | Pairwise 4 | Workflow 2 |
| **R4** | UI Split & Pipeline Stages | `test_cockpit_and_pipeline.py` | `test_boundary_cockpit.py` | Pairwise 7 | Workflow 1 |
| **R5** | Cockpit Attention Dashboards | `test_cockpit_and_pipeline.py` | `test_boundary_cockpit.py` | Pairwise 1, 7 | Workflow 4 |
| **R6** | Live Terminal Logs & Discovery | `test_terminal_logs_and_discovery.py` | `test_boundary_terminal_logs.py` | Pairwise 3, 5 | Workflow 3 |
| **R7** | Seed Data & Dental Invariants | `test_leads_and_channels.py` | `test_boundary_channels.py` | Pairwise 6 | Workflow 1 |
