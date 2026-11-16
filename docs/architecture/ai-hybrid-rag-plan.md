# PersonalOS & CRM - Hybrid Agentic RAG & AI Architecture Plan

**Date:** 2026-11-16
**Branch:** `fix/ai-features` (from `main`)
**Hardware Constraint:** 8 GB RAM Ubuntu laptop (strict lazy-load & idle-unload policy for any local ML model).

---

## 1. Problem Statement

1. **Silent Hardcoded Fallbacks:** In `backend/app/services/ai_service.py`, when `GEMINI_API_KEY` / `GROQ_API_KEY` are missing or a call times out (3.5s-4.0s), the backend silently returns hardcoded deterministic strings for AI Reply Suggestions and AI Call Suggestions.
2. **Unnecessary API Credit Burn:** While AI Reply Suggestions were updated to trigger on button click, AI Call Suggestions still need strict on-demand triggering (never auto-calling on opening a lead/call view).
3. **Missing Real Knowledge & Action Pipeline:** "Ask & Do AI" needs a real Hybrid RAG + Agentic Tool-Calling pipeline to know projects, numbers, leads, call history, and message threads, and to execute CRM actions.
4. **Dual-Mode Auth Requirement:**
   - **Public / Resume Mode:** Users can enter their own free-tier API key (**Gemini** or **Groq** BYOK) in Settings, optimized to stay within free-tier quotas.
   - **Personal Mode (Zero API Cost):** Runs locally using the authenticated `agy` CLI (`local_cli` bridge) without needing a paid API key.

---

## 2. Final Product Vision

1. **Ask & Do AI (Hybrid RAG + Agentic Tools):**
   - Answers questions across all CRM data (projects, lead counts, client details, past calls, message threads) with grounded citations.
   - Executes real CRM actions via typed tools (`search_leads`, `query_crm_stats`, `move_lead_stage`, `log_call`, `draft_or_send_message` with explicit UI confirmation before sending external messages).
2. **AI Reply Suggestions (On-Demand):**
   - Triggered only on clicking the AI Reply button.
   - Reads the real conversation thread + latest inbound message + lead profile to generate tailored reply options.
3. **AI Call Suggestions (On-Demand):**
   - Triggered only on clicking the AI Call Suggestions button (never auto-fetched when opening a lead/call view; cached per lead until a new call is logged).
   - Reads all past call logs for the client to suggest next talking points, or generates a tailored first-call discovery script when no prior calls exist.
4. **Transparent Error Handling:**
   - Zero hardcoded fake AI responses. If no provider is configured or the provider fails, return a structured error (`ai_not_configured` / `ai_provider_error`) so the UI prompts to configure AI in Settings.

---

## 3. Core Architectural Decisions

### A. Unified `LLMProvider` Abstraction
All AI features share one backend provider interface supporting:
- **`local_cli` (Personal Mode):**
  - Backend runs RAG + context assembly in Python, then pipes the compact prompt via `stdin` to:
    `agy --model gemini-3.8-flash-low --effort low --disable-slash-commands --dangerously-skip-permissions --output-format json --json-schema <schema> --print=-`
    with `cwd="/tmp"` and isolated `HOME=~/.personalos-agy-sandbox` so `agy` does not load global skills, plugins, or MCP servers.
  - Drops input tokens from ~65k to ~8-10k and latency from >35s to ~2.5s-4s without needing re-login.
  - `test_connection()` executes a 0-token, <1s fast CLI verification via `agy --version` without invoking the LLM.
  - Short-lived subprocess exits immediately after returning JSON (zero persistent RAM overhead).
- **`gemini` (Public BYOK Mode):** Direct REST call to `gemini-2.5-flash` using the user's configured key.
- **`groq` (Public BYOK Mode):** Direct REST call to Groq (`llama-3.3-70b-versatile`) using the user's configured key.
- **`auto`:** Uses configured BYOK key if present; otherwise uses `local_cli` if `agy` is available locally; otherwise returns `ai_not_configured`.

### B. Hybrid Agentic RAG Pipeline (Not Pure Vector, Not `LIKE` Hacks)
1. **Incremental Chunking & Metadata:**
   - Index leads, call logs, message threads, and project summaries into a `rag_chunks` table with metadata (`lead_id`, `hustle_id`, `stage`, `doc_type`, `updated_at`).
2. **Dual-Index Retrieval + Reciprocal Rank Fusion (RRF):**
   - **Sparse / Lexical:** SQLite **FTS5 (BM25)** for exact names, phone numbers, clinic titles, and keywords.
   - **Dense / Semantic:** Cosine similarity over stored vector embeddings with metadata pre-filtering.
   - **RRF Merge:** Combine BM25 and Vector rankings using `score = sum(1 / (60 + rank))` to build a compact top-K context.
3. **Structured Agentic Tools:**
   - Exact aggregations, counts, and mutations are handled by deterministic DB tools (`query_crm_stats`, `search_leads`, `move_lead_stage`, `log_call`, `draft_or_send_message`) rather than guessing from text chunks.

### C. 8 GB RAM Safeguard (Lazy-Load & Idle-Unload Embedding Policy)
- **Local Embedding Model (`fastembed` ONNX `BAAI/bge-small-en-v1.5`, ~33 MB):**
  - **NEVER** load at FastAPI startup.
  - **Lazy load** only when semantic indexing or vector search is actually invoked.
  - **Auto-unload** (`del model` + `gc.collect()`) after a short idle TTL (e.g., 60 seconds) or immediately after batch re-indexing finishes, keeping steady-state backend RAM minimal.
- **Cloud / Low-RAM Fallback:**
  - If a Gemini API key is configured and `fastembed` is disabled/unavailable, use Gemini `text-embedding-004`.
  - If neither is available (e.g., Groq-only on a small free cloud instance), gracefully run FTS5 (BM25) + structured DB tools without crashing.

---

## 4. Phase-Wise Implementation Plan

> **Rule:** Implement **one phase at a time**, verify with tests & build checks, commit, and report back to Firstmate before starting the next phase.

### Phase 1: Provider Abstraction, Settings & Zero-Fallback Cleanup
- **Goal:** Establish the unified `LLMProvider` layer (`local_cli`, `gemini`, `groq`, `auto`), remove all silent hardcoded fallbacks, and wire Settings UI/API.
- **Tasks:**
  1. Create `fix/ai-features` branch from `main`.
  2. Refactor `backend/app/services/ai_service.py` into clean provider adapters (`local_cli` via `agy --print` stdin, `gemini`, `groq`) and verify exact `agy --print --output-format json` envelope parsing locally.
  3. Remove all hardcoded deterministic fallback strings from AI endpoints; return structured HTTP 503 (`ai_not_configured` / `ai_provider_error`).
  4. Add backend Settings endpoints for AI provider selection, masked BYOK key storage, and `POST /ai/test` connection check.
  5. Update frontend Settings Center with AI Provider selector (`auto`, `local_cli`, `gemini`, `groq`), masked API key inputs, and Test Connection button.
- **Exit Criteria:** `pytest` verifies zero-fallback behavior and provider routing; `agy --print` smoke test passes; frontend TypeScript & `npm run build` pass.

### Phase 2: On-Demand AI Reply & AI Call Suggestions
- **Goal:** Make both suggestion features 100% real-AI-backed and strictly on-demand to protect free-tier credits.
- **Tasks:**
  1. Update AI Reply Suggestions to pass full recent message thread + latest inbound reply + lead profile to `LLMProvider` (preserve button-only trigger).
  2. Update AI Call Suggestions to fetch all past call logs for the lead (or generate a tailored first-call script if none exist) via `LLMProvider`.
  3. Update frontend Call/Lead UI so AI Call Suggestions **only** trigger on explicit button click (never auto-fetch on page/lead open; cache last brief until a new call is logged) and show a clear "Configure AI in Settings" prompt on `ai_not_configured`.
- **Exit Criteria:** Backend tests + frontend build pass; verified no auto-API calls on opening call/lead views.

### Phase 3: Hybrid RAG Indexing & Retrieval (8 GB RAM Safe)
- **Goal:** Build the incremental Hybrid RAG index (SQLite FTS5 + Lazy/Idle-Unload Vector Embeddings + RRF).
- **Tasks:**
  1. Add `rag_chunks` table + SQLite `FTS5` virtual table and incremental indexing hooks on lead, call log, and message create/update.
  2. Implement `EmbeddingService` with `fastembed` (`BAAI/bge-small-en-v1.5`) **lazy-load + 60s idle-unload (`gc.collect()`)**, plus Gemini `text-embedding-004` fallback and FTS5-only graceful fallback.
  3. Implement `HybridRetriever` running FTS5 (BM25) + Vector cosine similarity + metadata pre-filtering + **Reciprocal Rank Fusion (RRF)** (`k=60`).
  4. Add an explicit re-index / backfill endpoint or CLI command for existing CRM records (which unloads the model right after finishing).
- **Exit Criteria:** Unit/integration tests verify incremental indexing, RRF ranking, metadata filtering, and model unload after TTL/batch; RAM stays clean at idle.

### Phase 4: Ask & Do Agentic Pipeline & UI
- **Goal:** Wire Ask & Do AI to Hybrid RAG + typed v1 agentic tools with grounded citations and send confirmation.
- **Tasks:**
  1. Implement typed v1 tools: `search_leads`, `query_crm_stats`, `move_lead_stage`, `log_call`, and `draft_or_send_message` (returning a confirmation payload for external sends).
  2. Wire the Ask & Do endpoint to run the Hybrid RAG retriever + tool-calling loop via `LLMProvider`, returning answer + source citations + executed/pending tool actions.
  3. Update Ask & Do frontend UI to render citations, action badges (e.g., stage moved, call logged), and an explicit Confirm/Cancel prompt before sending external messages.
- **Exit Criteria:** End-to-end tests verify RAG Q&A with citations, `move_lead_stage`, `log_call`, and confirmation-gated `send_message`; frontend build passes.
