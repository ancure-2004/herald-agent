# Herald (PersonalOS & CRM) — Project Specifications & Feature Ledger

**Last Updated:** 2026-11-20  
**Branch:** `perf/full-app-optimization` (branched off `main` after PR #6 merge)  
**Stack:** FastAPI + SQLite (SQLAlchemy) backend | Next.js `16.4.6` + React + Tailwind CSS frontend

---

## 1. Core CRM & Lead Lifecycle
- **Kanban Board (`frontend/src/features/board/KanbanBoardView.tsx`, `KanbanColumn.tsx`, `LeadCard.tsx`):**
  - Drag-and-drop stage progression across the sales pipeline.
  - Card density tuned for quick scanning of clinic/business name, city, niche, score, and outreach status.
- **Leads Table (`frontend/src/features/table/LeadsTableView.tsx`):**
  - Tabular view of all CRM leads with filtering, sorting, and quick-action triggers.
  - Integrated with `LeadDetailModal.tsx` and `AddLeadModal.tsx`.
- **Calls Management (`frontend/src/features/calls/CallsManagementView.tsx`, `LogCallModal.tsx`):**
  - Call logging, follow-up scheduling, and call-outcome tracking backed by `backend/app/services/call_service.py`.
- **WhatsApp / Outreach Inbox (`frontend/src/features/inbox/WhatsAppInboxView.tsx`, `LogReplyModal.tsx`):**
  - Centralized reply tracking and message thread inspection backed by `backend/app/services/message_service.py` and `backend/app/repositories/message_repo.py`.
- **Evening Sprint (`frontend/src/features/sprint/EveningSprintView.tsx`):**
  - Focused daily execution view for high-priority follow-ups and sprint targets.
- **Dashboard (`frontend/src/features/dashboard/DashboardView.tsx`):**
  - High-level CRM metrics, pipeline velocity, and conversion summaries.

---

## 2. Autopilot Cockpit Overview
- **Cockpit Shell (`frontend/src/features/cockpit/AutopilotCockpitView.tsx`, `CockpitOverviewDashboard.tsx`, `CockpitSupervisorBar.tsx`):**
  - Unified command center for autonomous discovery, demo generation, and outreach.
  - **Pipeline Node Network (`PipelineNodeNetwork.tsx`, `NodeInspectionDrawer.tsx`):** Visualizes active pipeline stages and lets operators inspect node-level state and logs.
  - **Attention & Velocity (`AttentionVelocityDashboard.tsx`):** Surfaces bottlenecks, throughput, and items requiring human-in-the-loop review.
  - **Live Log Terminal (`frontend/src/components/ui/LiveLogTerminal.tsx`):** Real-time SSE-backed log streaming from `backend/app/services/sse_publisher.py` and `backend/app/services/event_bus.py`.

---

## 3. 4-Tier Discovery Engine
- **Backend Discovery Pipeline (`backend/app/autopilot/discovery/`, `backend/app/autopilot/search/`, `backend/app/autopilot/verification/`):**
  - Multi-tier lead sourcing (Google Places, Practo, web/social enrichment, and verification/scoring).
  - Quota and rate management (`backend/app/autopilot/quota.py`).
- **Frontend Discovery Tab (`frontend/src/features/cockpit/discovery/DiscoveryTab.tsx`, `LeadDataTable.tsx`):**
  - **Date Grouping:** Discovered leads grouped chronologically by run/discovery date.
  - **Confidence & Verification Indicators (`ConfidencePill.tsx`, `VerificationBadge.tsx`):** Visualizes data quality and verification status.
  - **Floating Action Bar (`FloatingActionBar.tsx`):** Batch actions for selected discovered leads (promote to CRM, queue for demo, discard).
  - **Discovery Lead Drawer (`DiscoveryLeadDrawer.tsx`):** Slide-over inspection drawer for full lead dossier, contact details, and enrichment signals.

---

## 4. Demo Factory & Multi-Device Preview
- **Backend Build & Recording (`backend/app/autopilot/build/`, `backend/app/autopilot/recording/`):**
  - Automated personalized demo site generation and Playwright-based video/screenshot recording.
  - Run tracking via `backend/app/autopilot/runs/`.
- **Frontend Demo Factory (`frontend/src/features/cockpit/demo-factory/DemoFactoryTab.tsx`, `RunMatrixTable.tsx`, `EphemeralPreviewLink.tsx`):**
  - Matrix view of demo build runs, status, and generated preview URLs.
  - **Multi-Device Preview Drawer (`MultiDevicePreviewDrawer.tsx`):** Interactive preview across desktop, tablet, and mobile viewports.

---

## 5. Outreach Automation & Safety Guardrails
- **Backend Outreach & Tracking (`backend/app/services/pipeline_service.py`, `tracking_service.py`, `hustle_service.py`):**
  - Automated outreach dispatch queue, cadence management, and tracking pixel/link instrumentation (`backend/app/controllers/tracking_controller.py`).
- **Frontend Outreach Hub (`frontend/src/features/cockpit/OutreachHubSubpage.tsx`, `outreach/OutreachTab.tsx`, `DispatchQueueTable.tsx`, `QueueFilterBar.tsx`):**
  - Queue filtering, dispatch scheduling, and status monitoring.
- **Safety Guardrails (`outreach/SafetyControlsCard.tsx`):**
  - Daily send caps, cooldown windows, pause/kill-switch controls, and human-approval gates to prevent spam or domain/account bans.

---

## 6. AI Copilot & 11-Tool MCP Server
- **AI Copilot (`backend/app/services/ai_service.py`, `assistant_service.py`, `rag_service.py`, `frontend/src/features/modals/AssistantDrawer.tsx`):**
  - Context-aware assistant for drafting outreach, summarizing lead dossiers, and querying CRM state via RAG.
- **Agent & 11-Tool MCP Server (`backend/app/agents.py`, `backend/app/services/agent_service.py`, `backend/app/services/agent_tools.py`, `backend/app/controllers/agent_controller.py`):**
  - Exposes 11 structured tools for autonomous/assisted CRM, discovery, demo, and outreach operations.

---

## 7. UX Overhaul (PR #6)
Merged via `feat(ux): comprehensive frontend overhaul and Next.js security upgrade` (`#6`):
- **Next.js Security Upgrade:** Upgraded Next.js to `16.4.6` (`frontend/package.json`, `package-lock.json`, `next-env.d.ts`).
- **Obsidian & Claude-Charcoal Dark Mode (`frontend/src/hooks/useTheme.ts`, `frontend/src/app/globals.css`):**
  - Obsidian `#09090B` base surface paired with Claude-Charcoal `#18181B` elevated surfaces.
  - **700ms Directional Ripple:** Smooth theme transition animation.
- **Cmd+K Command Palette (`frontend/src/features/modals/CommandPaletteModal.tsx`):**
  - Global keyboard-first navigation, quick actions, and search across views and leads.
- **Claude-Style Settings Modal (`frontend/src/features/settings/SettingsModal.tsx`):**
  - Unified, clean settings experience replacing fragmented configuration views.
- **Portaled Select Component (`frontend/src/components/ui/Select.tsx`):**
  - Custom accessible dropdown rendered via portal to avoid overflow/clipping issues inside modals and tables.
- **Toast Layering (`frontend/src/components/ui/Toast.tsx`):**
  - Elevated to `z-[9999]` so notifications always render above drawers and modals.
- **Layout & Error Boundaries (`Header.tsx`, `Sidebar.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`):**
  - Streamlined navigation chrome and consistent error/loading states across the app.
