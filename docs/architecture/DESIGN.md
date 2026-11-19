# System Architecture & Design: Herald - Multi-Agent Operations Engine

> **Everything, handled automatically.**

## 1. Executive Summary

**Herald** is an executive-grade Multi-Agent Operations Engine and autonomous agency cockpit engineered for solo founders and high-velocity service operators. Originally conceived as a specialized CRM for service agency acquisition, Herald has evolved into a multi-hustle command center featuring autonomous prospect discovery, live template demo factories, automated walkthrough video generation, multi-channel outreach guardrails, hybrid RAG copilot assistance, and Model Context Protocol (MCP v2.0.0) agent interoperability.

---

## 2. System Architecture

Herald is built on a decoupled, asynchronous client-server architecture with an external agent protocol:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       External AI Agents (Cursor, Claude, AGY)              │
│                                           │                                 │
│                                           ▼                                 │
│                          Model Context Protocol (MCP v2.0.0)                │
│                                    (backend/mcp_server.py)                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Direct Session Local / DB Lock)
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                                FastAPI Backend                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Controllers & API Routers (Leads, Hustles, Messages, Calls, Autopilot)  │ │
│ └────────────────────────────────────┬────────────────────────────────────┘ │
│                                      │                                      │
│ ┌────────────────────────────────────▼────────────────────────────────────┐ │
│ │ Services Layer                                                          │ │
│ │ • PipelineService: Cross-Process RunLog DB Locking & Orchestration      │ │
│ │ • DiscoveryService: Waterfall Scrapers (Google, Overpass, Local)        │ │
│ │ • DemoFactoryService: 3-Template Scaffolder + 1-by-1 Walkthrough Engine │ │
│ │ • OutreachService: Safe/Dry-Mode Dispatchers (WhatsApp, Instagram, Mail)│ │
│ │ • RAGService: Hybrid Semantic + Lexical Context Vector Retrieval        │ │
│ │ • AgentTools: Unified Copilot Action Suite (Draft, Log, Transition)    │ │
│ └────────────────────────────────────┬────────────────────────────────────┘ │
│                                      │                                      │
│ ┌────────────────────────────────────▼────────────────────────────────────┐ │
│ │ Storage & State: SQLite / PostgreSQL (SQLAlchemy ORM)                   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ (REST API + SSE Live Stream)
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                        Next.js Frontend (Single Viewport)                   │
│ • Executive Command Dashboard & Kanban Deal Pipeline                       │
│ • Discovery Console (Real-time Filter Funnel & Telemetry Terminal)          │
│ • Demo Factory Console (1-by-1 Sequential Video Preview & Matrix)           │
│ • Outreach Console (Safe/Dry-Mode Controls & Dispatchers)                  │
│ • Ask & Do Unified Copilot Drawer (Hybrid RAG + Action Execution)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Subsystems

### 3.1 Autonomous Discovery & Waterfall Engine
- **Multi-Provider Waterfall**: Traverses prioritized locality presets using Google Places API (with monthly QuotaGuard soft limits), OpenStreetMap Overpass API, and cached local pools.
- **Verification Engine**: Validates prospects against strict verification invariants (no official website, active mobile contact, verified practitioner).
- **Cross-Process RunLog DB Lock**: Guarantees single-flight execution across both UI triggers (`/api/autopilot/discover`, `/api/autopilot/trigger-refill`) and MCP tool invocations (`run_discovery`). If any process is active, subsequent requests receive HTTP 409 Conflict.
- **Real-Time Funnel Telemetry**: Visualizes stage yields (Raw Scanned → Unique No Website → Mobile Verified → Staged) with real-time SSE stream events.

### 3.2 Demo Factory & Sequential Walkthrough Recorder
- **Multi-Template Scaffolding**: Builds and validates 3 production-grade client website designs (`Modern`, `Premium`, `Warm`).
- **Sequential 1-by-1 Recorder**: Playwright + FFmpeg engine records high-definition mobile walkthrough videos sequentially, preventing GPU/CPU resource contention and audio-video drift.
- **Ephemeral & Device Previews**: Multi-device preview drawer with responsive device shells (Mobile, Tablet, Desktop) and live HTTP link validation.

### 3.3 Outreach Hub & Safe/Dry-Mode Dispatch
- **Database-Persisted Dry/Safe Mode**: Outreach mode is stored in the database (`Hustle.safe_mode`), preventing accidental real-world message dispatch across server restarts.
- **Strict Compliance Invariants**:
  - Daily channel rate limits (WhatsApp, Instagram, Email).
  - Unconditional Do-Not-Contact (`do_not_contact = True`) immediate enforcement upon stop/opt-out keywords.
  - Idempotent delivery keys (`lead_id + channel + stage_or_step`) to prevent duplicate transmissions.

### 3.4 Hybrid RAG & "Ask & Do" Agentic Copilot
- **Hybrid Retrieval**: Combines semantic embedding search with lexical BM25/keyword indexing over company knowledge, scripts, clinic facts, and CRM records.
- **Action Execution**: Directly bridges conversational reasoning to actionable CRM workflows (drafting verified outreach, logging call summaries, transitioning pipeline stages).

### 3.5 Model Context Protocol (MCP v2.0.0)
- Exposes 11 native tools for external agentic interaction (Claude Desktop, Cursor, AGY):
  - `add_lead`, `bulk_add_leads`, `list_leads`, `get_lead_dossier`, `move_lead_stage`, `get_lead_activity`.
  - `send_message`, `log_call`.
  - `run_discovery`, `run_demo_factory`, `run_batch_outreach`.
- Built-in cross-process locking and explicit safety checks (`confirmed=True` required for live external sends).

---

## 4. UI/UX Design System: "Obsidian Flight Deck"

The visual language follows an uncompromising, high-density control-room philosophy:
- **Canvas**: Obsidian Dark Background (`#0B0C10`), elevated panels (`#0F1117`), structured cards (`#141721`), and hairline translucent borders (`rgba(255, 255, 255, 0.08)`).
- **Accents**: Electric Indigo (`#6366F1`) for focus and primary actions, Amber Gold (`#F59E0B`) for urgency and overdue actions, Emerald (`#10B981`) for telemetry health and active streams.
- **Typography**: Plus Jakarta Sans for human interfaces; JetBrains Mono for metrics, currency, timestamps, and terminal telemetry.
- **Rhythm**: Single-viewport shell (`h-full w-full overflow-hidden`), fixed top header and floating side dock, with internal scroll containment on tables, modal bodies, and drawers. Zero horizontal scroll across all breakpoints (390px to 1440px+).
