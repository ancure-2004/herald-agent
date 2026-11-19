# Herald - Frontend

Production-grade Next.js App Router frontend for Herald - Multi-Agent Operations Engine. Built with TypeScript, Tailwind CSS, Lucide icons, and a feature-based modular architecture.

## Overview

The frontend serves as the mission control and autonomous command center for dental clinic lead acquisition, proof package validation, and outreach workflow orchestration.

### Tech Stack
- **Framework**: Next.js 16.4.4 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.x
- **State & Data**: React Context (`CRMProvider`) + `@tanstack/react-query`
- **Validation**: Zod runtime environment validation
- **Icons**: Lucide React with package import optimizations

## Directory Layout

```
frontend/
  src/
    app/                 # Next.js App Router root layout, shell pages, and orchestrator
      page.tsx           # Lean top-level orchestrator (<150 lines)
      layout.tsx         # Global fonts and theme container
      loading.tsx        # Skeleton pulse loader
      error.tsx          # Client-side error boundary
      global-error.tsx   # Root error boundary fallback
      not-found.tsx      # Custom 404 screen
      globals.css        # Tailwind styles and theme CSS variables
    components/
      layout/            # Reusable structural layout (Header, Sidebar)
      ui/                # Presentational UI primitives (Button, Badge, Modal, Toast, Skeleton)
    features/            # Domain-driven feature modules
      dashboard/         # Executive dashboard, KPIs, quick stats, schedule
      board/             # Kanban board with drag-and-drop & CustomerGo filters
      table/             # Fast tabular view of pipeline leads
      sprint/            # Evening sprint prioritized EV/minute task view
      cockpit/           # 7-step autopilot runner, sub-agents (Scout, Auditor, Closer), live terminal
      settings/          # Hustle blueprint, autonomy mode, and channel safety limits
      modals/            # Lead detail dossier, Add lead, Problem report, Command palette, Copilot drawer
    context/             # Centralized CRM state provider (CRMContext)
    hooks/               # Shared hooks (useSSE, useTheme, useCommandPalette)
    lib/
      api/               # Typed API client with timeout and abort handling
      utils/             # Pure formatters and Tailwind merger (cn)
    config/              # Validated env and application constants
    types/               # Centralized domain interfaces
  docs/                  # Architecture, Environment, Performance, and Security docs
  public/                # Static assets
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   Set `NEXT_PUBLIC_API_BASE_URL` to your backend instance (default: `http://localhost:8000`).

3. **Run local development**:
   ```bash
   npm run dev
   ```
   Access the dashboard at `http://localhost:3000`.

4. **Typecheck & Production Build**:
   ```bash
   npm run typecheck
   npm run build
   npm run start
   ```
