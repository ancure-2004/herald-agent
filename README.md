# PersonalOS & Autopilot CRM

> **Executive Autopilot Command Center & Kanban CRM for Solo Hustles**  
> Inspired by the visual elegance of **Homies Lab** and the deal execution speed of **CustomerGo**.

---

## Overview

**PersonalOS CRM** is a keyboard-first, high-performance business operating system built for solo founders running high-ticket agency and service side-hustles (specifically configured for the Dental Clinic Website Engine).

It pairs an executive daily command center with an optimistic drag-and-drop pipeline board, backed by an autonomous 7-step lead verification autopilot.

---

## Core Capabilities

### 1. Homies Lab Executive Dashboard
- **Daily Command Greeting**: Contextual greeting with date and mode switcher (Normal, Away, Off).
- **KPI Health Rings & Metrics**: Circular progress meters displaying real-time stock buffer health and target closing value.
- **Urgent Action Queue**: Priority-ordered next steps with warm gradient highlight cards.
- **Channel Outreach Limits**: Real-time safety bars for WhatsApp, Instagram, and Email warmup limits.
- **Priority Clinic Table**: Recent priority clinic prospects with instant deep-inspection.

### 2. CustomerGo Kanban Board
- **Drag & Drop Deal Cards**: Native drag-and-drop across customizable stages with optimistic UI updates and live backend sync.
- **Visual Intelligence**: Deal values, 5-star fit ratings, locality pins, and translucent pastel tags.
- **Nested Smart Queues**: Expandable file-tree sub-navigation nested directly under the board (Review Tray, Due Today, Hot Intent, Active Replies, Archived).

### 3. Claude-Style Global Command Palette
- **Global Shortcut**: Press `⌘K` or `Ctrl+K` from anywhere in the app to open.
- **Instant Search**: In-memory, zero-latency search across clinic names, doctor names, localities, phone numbers, and next steps.
- **Quick Action Commands**: Run autopilot refills, verify live preview links, switch modes, export CSVs, and trigger diagnostic briefs in one keystroke.

### 4. Dual-Collapsed Floating Dock
- **Width & Height Collapse**: Instead of stretching an empty sidebar down the entire screen, the sidebar collapses into a floating, compact glass dock anchored on the left.
- **Big Centered Icons**: Displays prominent `w-12 h-12` buttons with active status rings and tooltips.

### 5. 7-Step Acquisition Autopilot Engine
- Enforces strict operational invariants:
  1. **No-Website Verification**: Prospects must have no active mobile website.
  2. **2-Source Fact Rule**: Contact and doctor details verified across at least 2 independent sources.
  3. **Live HTTP 200 Verification**: Automatically validates all 3 multi-template preview links before queueing outreach.
  4. **Pipedrive Mandatory Next Action**: Every lead must have a scheduled next step and due date.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React
- **Backend**: FastAPI (Python 3.12+), SQLite with SQLAlchemy ORM, Pydantic v2, Uvicorn
- **Design System**: Dual-mode theme supporting Homies Lab Warm Cream (`#FAF8F5`) and Obsidian Carbon (`#0B0C10`)

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 & 26)
- Python 3.10+ (tested on Python 3.12)

### 1. Quickstart (One Command)
Run both backend and frontend with the root startup script:

```bash
chmod +x start_crm.sh
./start_crm.sh
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

### 2. Manual Setup

#### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
PersonalOS and CRM/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application entrypoint
│   │   ├── database.py      # SQLite connection & session management
│   │   ├── models.py        # SQLAlchemy models (Lead, Hustle, Stage, Package, RunLog)
│   │   ├── schemas.py       # Pydantic validation schemas
│   │   └── routers/         # REST API endpoints (leads, hustles, autopilot, diagnostics)
│   ├── tests/               # Backend pytest suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx   # Root layout with viewport locks
│   │   │   ├── globals.css  # Obsidian carbon & warm cream theme tokens
│   │   │   └── page.tsx     # Unified PersonalOS CRM application
│   │   └── lib/
│   │       └── api.ts       # Type-safe client fetcher & model definitions
│   ├── tailwind.config.ts   # Design tokens & color extensions
│   └── package.json
├── design-system/           # Design system tokens and specifications
├── start_crm.sh             # Combined daemon runner script
└── README.md
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Open Claude-style Command Palette & Lead Search |
| `ESC` | Dismiss Command Palette or Floating Modals |
| `Tab` / `Shift+Tab` | Cycle through interactive inputs |
| `Arrow Up / Down` | Navigate search results and quick action commands |

---

## License

Private & Proprietary. All rights reserved.
