# Frontend Architecture

## Layered & Feature-Based Architecture

The PersonalOS and CRM frontend is organized around feature modules and shared primitives to decouple concerns and scale cleanly:

### 1. Root Orchestrator (`src/app/page.tsx`)
- The monolith was refactored from 4,123 lines into a concise (~120-line) orchestrator.
- Renders the `CRMProvider` wrapper, top `Header`, collapsible `Sidebar`, dynamic feature views, and next/dynamic modals.
- Push state down: only the active view and modals are rendered based on context state.

### 2. State & Data Layer (`src/context/CRMContext.tsx`)
- Manages global state: active hustle, leads, stages, real-time live feed, terminal logs, sprint plan, stock plan, and sub-agent triggers.
- Provides standard action handlers (`loadAll`, `handleStageChange`, `handleApproveAndSend`, `handleTriggerRefill`, `handleDayModeChange`, `handleSyncBatchLinks`, `handleRunScout`, `handleRunAuditor`, `handleRunCloser`, `handleConfirmCommitment`, `handleAskDoSubmit`, `handleAssistantUndo`).
- Real-time updates via `useSSE` hook with automatic reconnect and event dispatch.

### 3. Feature Modules (`src/features/`)
Each domain contains self-contained components that interact with the CRM through `useCRM()`:
- **`dashboard`**: Executive KPIs, buffer health gauge, today mode switcher, priority schedule queue.
- **`board`**: Drag-and-drop Kanban board across stages, quick filter slider, sorting popovers.
- **`table`**: High-density tabular view with contact handles and fit scores.
- **`sprint`**: 90-minute evening sprint planner ranked by EV per minute.
- **`cockpit`**: 7-step acquisition waterfall runner, sub-agents control deck (Scout, Auditor, Closer), live streaming terminal, and structured run history.
- **`settings`**: Hustle blueprint configuration, autonomy mode (Copilot vs Autopilot), and channel rate limits.
- **`modals`**:
  - `LeadDetailModal`: Intelligence dossier, verified facts, proof package links, timeline, and mandatory next step lock.
  - `AddLeadModal`: Manual clinic lead intake with initial next step validation.
  - `ProblemReportModal`: Diagnostic brief generator capturing telemetry for Antigravity IDE.
  - `CommandPaletteModal`: Quick ⌘K navigation and lead jumping overlay.
  - `AssistantDrawer`: Floating Ask & Do AI copilot with 1-click action undo.

### 4. API Client & Security (`src/lib/api/`)
- Unified `apiFetch` with typed generics, configurable timeout (`AbortController`), and structured `ApiError` responses.
- Single source of truth for base URL via Zod-validated `src/config/env.ts`.
