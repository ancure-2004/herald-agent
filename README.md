# Herald - Multi-Agent Operations Engine

> **Everything, handled automatically.**  
> Streamline client discovery, demo asset generation, safe multi-channel outreach, and deal execution with native Model Context Protocol (MCP v2.0.0) support.

---

## Overview

**Herald** is an open-source, keyboard-first Multi-Agent Operations Engine built to eliminate operational drag for solo founders, creators, and agency builders.

Combining an executive command center with an autonomous acquisition factory, Herald handles the entire outbound lifecycle:
1. **Discovers & Verifies Prospects**: Multi-provider waterfall (Google Places, Overpass OSM, local cache) with strict no-website and active-phone validation.
2. **Scaffolds Live Interactive Collateral**: Generates 3-design Next.js websites and records high-definition walkthrough videos.
3. **Guards Outbound Communications**: Multi-channel outreach (WhatsApp, Instagram, Email) with database-persisted Dry/Safe Mode, daily channel quotas, and automated opt-out compliance.
4. **Empowers AI Agent Coordination**: Native Model Context Protocol (MCP v2.0.0) server exposing 11 tools to AI assistants (Claude, Cursor, AGY) alongside an in-app Hybrid RAG "Ask & Do" copilot.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       External AI Agents (Cursor, Claude, AGY)              │
│                                           │                                 │
│                                           ▼                                 │
│                          Model Context Protocol (MCP v2.0.0)                │
│                                    (backend/mcp_server.py)                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Direct DB Lock / Session Local)
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

## Key Features

### 1. Autopilot Discovery & Waterfall Scraper
- **Multi-Source Ingestion**: Waterfall progression across Google Places API (with soft-limit QuotaGuard protection) and OpenStreetMap Overpass API.
- **Strict Qualification Rules**: Drops prospects that already have active official domains or lack verified direct contact channels.
- **Cross-Process DB Locking**: The `runs` table acts as a single-flight mutex across CLI scripts, background workers, and MCP server requests. Active runs block concurrent triggers with HTTP 409 Conflict.
- **Live SSE Telemetry**: Real-time log streaming and interactive 4-stage funnel visualization (Raw Scanned → No Website → Mobile Verified → Staged).

### 2. Demo Factory & 1-by-1 Video Recorder
- **Multi-Template Scaffolding**: Automatically builds and audits 3 responsive demo website themes (`Modern`, `Premium`, `Warm`).
- **Sequential Walkthrough Recorder**: Playwright + FFmpeg engine captures HD walkthrough videos sequentially (1-by-1) to eliminate resource contention and video glitches.
- **Multi-Device Drawer**: Instant interactive preview across Mobile, Tablet, and Desktop viewport shells.

### 3. Outreach Hub with Persisted Safe Mode
- **Database-Persisted Dry/Safe Mode**: Outreach mode is stored in the database (`Hustle.safe_mode`). Safe mode prevents accidental live sends even if the server restarts.
- **Strict Compliance Invariants**:
  - Daily channel rate limits for WhatsApp, Instagram, and Email.
  - Automatic `do_not_contact` activation and outbox purge upon detecting stop/unsubscribe intent.
  - Idempotent delivery keys (`lead_id + channel + stage`) preventing duplicate messages.

### 4. Model Context Protocol (MCP v2.0.0) & AI Copilot
- **11 Native MCP Tools**: Connect your favorite AI agent to query dossiers, draft outreach, record calls, and trigger autopilot pipelines:
  - `add_lead`, `bulk_add_leads`, `list_leads`, `get_lead_dossier`, `move_lead_stage`, `get_lead_activity`
  - `send_message`, `log_call`
  - `run_discovery`, `run_demo_factory`, `run_batch_outreach`
- **Hybrid RAG "Ask & Do" Copilot**: Combines vector semantic search and BM25 lexical indexing over sales playbooks, objection notes, and lead facts.

### 5. "Obsidian Flight Deck" UI/UX
- **Keyboard-First Navigation**: Global command palette (`⌘K`), quick-action hotkeys, and table focus navigation.
- **Zero Document Scroll**: Single-viewport fixed shell (`h-full w-full overflow-hidden`) with internal scroll containment.
- **High-Density Information Architecture**: Optimized contrast, JetBrains Mono telemetry, and custom pill indicators.

---

## Quickstart

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- Python 3.10+ (Python 3.12+ recommended)

### 1. One-Command Launch
Clone the repository and launch both the backend and frontend services using the root startup script:

```bash
git clone https://github.com/ancure-2004/herald.git
cd herald
chmod +x start.sh
./start.sh
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`

---

### 2. Manual Installation

#### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Model Context Protocol (MCP) Setup

To connect Herald to Claude Desktop or Cursor:

```json
{
  "mcpServers": {
    "herald": {
      "command": "/path/to/herald/backend/.venv/bin/python",
      "args": ["/path/to/herald/backend/mcp_server.py"],
      "env": {
        "DATABASE_URL": "sqlite:////path/to/herald/backend/personal_os.db"
      }
    }
  }
}
```

---

## Repository Layout

```
herald/
├── backend/
│   ├── app/
│   │   ├── api/             # REST API routers & endpoint definitions
│   │   ├── autopilot/       # Discovery, verification, and recording engines
│   │   ├── controllers/     # Business logic controllers
│   │   ├── models/          # SQLAlchemy database entities
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── services/        # Pipeline, RAG, agent tools, and safety services
│   ├── tests/               # Backend pytest suite
│   ├── mcp_server.py        # Model Context Protocol v2.0.0 server
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router root layout & views
│   │   ├── components/      # Reusable UI components & modals
│   │   ├── context/         # CRM state & real-time telemetry providers
│   │   └── features/        # Cockpit, Dashboard, Inbox, and Settings features
│   ├── package.json
│   └── tailwind.config.ts
├── docs/                    # Architectural plans, design specifications, and audits
├── tests/                   # Unified E2E opaque-box and UI validation test suites
├── start.sh                 # Unified startup daemon script
├── PROJECT.md               # Project manifesto, current state, and roadmap
├── LICENSE                  # MIT Open Source License
└── README.md
```

---

## Testing & Quality Assurance

Run the complete test suite to verify system integrity:

```bash
# Backend Unit & Integration Tests
cd backend && .venv/bin/pytest -v

# Root Opaque-Box E2E Suite (4 Tiers / 72 Scenarios)
backend/.venv/bin/python tests/e2e/runner.py

# Frontend Typecheck
cd frontend && npx tsc --noEmit
```

---

## License

This project is licensed under the [MIT License](LICENSE).
