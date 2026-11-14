# Autopilot Cockpit UI/UX Master Specification
**Target System**: Autonomous Growth Engine & Operational Flight Deck  
**Target Directory**: `frontend/src/features/cockpit/` in `projects/PersonalOS and CRM`  
**Author**: Firstmate Teamwork Specification Team  
**Date**: November 2026  
**Status**: Authoritative Developer-Grade Implementation Specification  

---

## Table of Contents
1. [Executive Summary & Design Philosophy](#1-executive-summary--design-philosophy)
   - 1.1 [Core Premise & Architecture](#11-core-premise--architecture)
   - 1.2 [Zero AI Slop: Anti-Patterns vs. Professional Standards](#12-zero-ai-slop-anti-patterns-vs-professional-standards)
   - 1.3 [Purposeful Density & Vertical Rhythm](#13-purposeful-density--vertical-rhythm)
   - 1.4 [Spatial Consistency & Keyboard Velocity](#14-spatial-consistency--keyboard-velocity)
2. [Architectural & Visual Separation: Cockpit vs. CRM](#2-architectural--visual-separation-cockpit-vs-crm)
   - 2.1 [Conceptual Boundary & Mental Models](#21-conceptual-boundary--mental-models)
   - 2.2 [Sequential Pipeline Flow vs. Relational Entity Mesh](#22-sequential-pipeline-flow-vs-relational-entity-mesh)
   - 2.3 [Routing, URL Patterns & State Isolation](#23-routing-url-patterns--state-isolation)
   - 2.4 [Deep-Linking Contracts & Contextual Bridges](#24-deep-linking-contracts--contextual-bridges)
   - 2.5 [Global Workspace Switcher Control](#25-global-workspace-switcher-control)
3. [Design System & Design Tokens](#3-design-system--design-tokens)
   - 3.1 [Complete Neutral Color Scales (OLED Dark & CRM Light)](#31-complete-neutral-color-scales)
   - 3.2 [Hairline Borders & Surface Elevation](#32-hairline-borders--surface-elevation)
   - 3.3 [Semantic Status Tokens](#33-semantic-status-tokens)
   - 3.4 [Typography Scale & Tabular Numerics](#34-typography-scale--tabular-numerics)
   - 3.5 [Radii & Shadow Elevation Scales](#35-radii--shadow-elevation-scales)
   - 3.6 [Micro-Interactions & 120ms Compositor Physics](#36-micro-interactions--120ms-compositor-physics)
4. [Tab 1: Lead Discovery (Clay Pattern)](#4-tab-1-lead-discovery-clay-pattern)
   - 4.1 [Interactive Data Execution Spreadsheet Grid](#41-interactive-data-execution-spreadsheet-grid)
   - 4.2 [Column Types, Glyphs & Controls](#42-column-types-glyphs--controls)
   - 4.3 [Multi-Select Mechanics & Selection Banner](#43-multi-select-mechanics--selection-banner)
   - 4.4 [Bottom-Anchored Floating Bulk Action Bar](#44-bottom-anchored-floating-bulk-action-bar)
   - 4.5 [Asynchronous Enrichment State Machine](#45-asynchronous-enrichment-state-machine)
   - 4.6 [4-State Email Verification Badges & Audit Tooltip](#46-4-state-email-verification-badges--audit-tooltip)
   - 4.7 [Confidence Score Pills & Visual Bars](#47-confidence-score-pills--visual-bars)
5. [Tab 2: Demo Factory (Trigger.dev / Vercel Pattern)](#5-tab-2-demo-factory-triggerdev--vercel-pattern)
   - 5.1 [High-Density Run Matrix Table](#51-high-density-run-matrix-table)
   - 5.2 [Lifecycle State Machine & Status Indicator Tokens](#52-lifecycle-state-machine--status-indicator-tokens)
   - 5.3 [Live Stopwatch Timers & Monospace Short Hashes](#53-live-stopwatch-timers--monospace-short-hashes)
   - 5.4 [Ephemeral Live Preview URLs & Hover Preview Cards](#54-ephemeral-live-preview-urls--hover-preview-cards)
   - 5.5 [Multi-Device Viewport Testing Drawer (Responsive Workbench)](#55-multi-device-viewport-testing-drawer)
   - 5.6 [Real-Time Streaming Build Log Drawer](#56-real-time-streaming-build-log-drawer)
   - 5.7 [5-Stage Collapsible Execution Stepper](#57-5-stage-collapsible-execution-stepper)
   - 5.8 [Streaming ANSI Terminal & Sticky Auto-Scroll Engine](#58-streaming-ansi-terminal--sticky-auto-scroll-engine)
   - 5.9 [Syntax Error Code Frames & 1-Click Recovery](#59-syntax-error-code-frames--1-click-recovery)
6. [Tab 3: Outreach Dispatch (Instantly.ai Pattern)](#6-tab-3-outreach-dispatch-instantlyai-pattern)
   - 6.1 [Two-Tier Send Quota Engine (Account vs. Campaign)](#61-two-tier-send-quota-engine)
   - 6.2 [Dual KPI Visual Safety Meters](#62-dual-kpi-visual-safety-meters)
   - 6.3 [Mailbox Fleet Health & Master Queue Switch](#63-mailbox-fleet-health--master-queue-switch)
   - 6.4 [Virtualized Outreach Dispatch Queue Table](#64-virtualized-outreach-dispatch-queue-table)
   - 6.5 [Dynamic Countdown Timers & Timezone Pacing](#65-dynamic-countdown-timers--timezone-pacing)
   - 6.6 [Sequence Step Tracking & Micro-Steppers](#66-sequence-step-tracking--micro-steppers)
   - 6.7 [Safety Jitter, Batch Throttling & Priority Routing](#67-safety-jitter-batch-throttling--priority-routing)
7. [Complete TypeScript Data Contracts & Interfaces](#7-complete-typescript-data-contracts--interfaces)
   - 7.1 [Discovery Lead & Verification Models](#71-discovery-lead--verification-models)
   - 7.2 [Demo Factory & Build Log Models](#72-demo-factory--build-log-models)
   - 7.3 [Outreach Dispatch & Quota Models](#73-outreach-dispatch--quota-models)
8. [Component Hierarchy & File Mapping](#8-component-hierarchy--file-mapping)
   - 8.1 [Directory Layout in frontend/src/features/cockpit/](#81-directory-layout)
   - 8.2 [Component Tree Architecture](#82-component-tree-architecture)
9. [UI Library Integration & Engineering Excellence](#9-ui-library-integration--engineering-excellence)
   - 9.1 [Tailwind CSS Configuration & Variables](#91-tailwind-css-configuration--variables)
   - 9.2 [Radix UI Primitives & Accessibility](#92-radix-ui-primitives--accessibility)
   - 9.3 [Lucide React Icon Standards](#93-lucide-react-icon-standards)
   - 9.4 [Framer Motion Physics Guidelines](#94-framer-motion-physics-guidelines)
   - 9.5 [Virtualization Budget & Performance Benchmarks](#95-virtualization-budget--performance-benchmarks)

---

## 1. Executive Summary & Design Philosophy

### 1.1 Core Premise & Architecture
The **Autopilot Cockpit** is an autonomous operational flight deck and execution engine embedded within PersonalOS. It transforms raw business leads into qualified prospects, generates tailored live client demo websites in parallel background workers, and orchestrates deliverability-protected outbound email campaigns.

To achieve world-class operational velocity, the Cockpit draws upon the proven interaction models of four industry-leading developer and growth platforms:
1. **Clay.com**: The reactive, virtualized data execution spreadsheet where columns are active computing units and bulk operations are handled via floating command bars.
2. **Trigger.dev (v3)**: The developer-first background workflow matrix featuring OpenTelemetry trace steppers, real-time streaming terminal logs, and sticky auto-scroll latching.
3. **Vercel Deployments**: The gold standard for ephemeral preview URLs, hover snapshot cards, and responsive multi-device viewport inspection.
4. **Instantly.ai**: The deliverability-focused outreach engine with dual-tier quota safety meters, randomized sending jitter, and strict prospect timezone enforcement.
5. **Attio & Linear**: High-density typography, tabular numerals, 1px hairline borders, segmented spring tabs, and keyboard ergonomics.

### 1.2 Zero AI Slop: Anti-Patterns vs. Professional Standards
"AI slop" refers to generic, unconsidered UI code often generated by automated tools: arbitrary pastel gradients, puffy low-density paddings, cartoonish emojis, inconsistent font weights, and slow, laggy animations. The Autopilot Cockpit adheres to strict engineering and craft rules:

| AI Slop Anti-Pattern | Professional Developer-Grade Standard |
| :--- | :--- |
| **Puffy, Low-Density Containers** (`p-8`, `gap-6` around sparse text) | **Intentional Information Density**: Normalized row heights (`36px` to `40px`), disciplined card padding (`p-3` to `p-4`), and compact layout grids. |
| **Arbitrary Rainbow Gradients** (neon purple/pink glowing blobs) | **Semantic Restraint**: 90% monochromatic dark surfaces (`#090A0C` to `#1E2025`). Color is reserved strictly for state signals (emerald, amber, rose, sky, indigo). |
| **Inconsistent Typography & Layout Shifts** | **Tabular Monospace Numerics**: Strict font scale, `font-mono tabular-nums` for all metrics, timers, and countdowns to eliminate number jitter. |
| **Sluggish 500ms Animations** on simple clicks | **120ms Snappy Compositor Micro-Interactions**: Instantaneous perceived latency with hardware-accelerated opacity/transform transitions. |
| **Missing Interactive States** (no focus, no active, no disabled) | **Complete Interactive State Matrix**: Every element defines `:hover`, `:active`, `:focus-visible` (2px offset ring), and `:disabled` opacity. |
| **Cartoon Emojis as Status Glyphs** (🚀, 🤖, 💥) | **Crisp 14px SVG Iconography**: Lucide icons locked to `14px` or `16px` with matching `1.5px` or `1.75px` stroke width. |

### 1.3 Purposeful Density & Vertical Rhythm
Every vertical pixel in the Cockpit carries operational meaning:
- **Compact Table Rows**: `36px` height in dense mode, `40px` in standard mode.
- **Card Surfaces**: `p-3` to `p-4` with 1px hairline borders (`rgba(255, 255, 255, 0.08)`).
- **Metric Readouts**: Large bold tabular numbers (`24px` to `28px`) paired with compact `11px` uppercase tracking labels.
- **Zero Wasted Air**: Whitespace is used intentionally to separate functional modules, not as empty padding around sparse content.

### 1.4 Spatial Consistency & Keyboard Velocity
Operators must be able to fly through pipeline stages without touching a mouse:
- `1` or `Cmd+1`: Switch to Tab 1 (Discovery).
- `2` or `Cmd+2`: Switch to Tab 2 (Demo Factory).
- `3` or `Cmd+3`: Switch to Tab 3 (Outreach Dispatch).
- `g` then `c`: Jump to Autopilot Cockpit (`/cockpit`).
- `g` then `r`: Jump to CRM Management (`/crm`).
- `j` / `k` or `Up` / `Down`: Navigate list rows.
- `x` or `Space`: Toggle row selection.
- `Shift + Click`: Continuous range multi-select.
- `Esc`: Clear row selection or dismiss sliding drawers.
- `Cmd + K`: Open universal command palette.

---

## 2. Architectural & Visual Separation: Cockpit vs. CRM

### 2.1 Conceptual Boundary & Mental Models
A foundational architectural mandate is the uncompromising structural and visual separation between the **Autopilot Cockpit** and the **CRM Management Dashboard**:

```
+---------------------------------------------------------------------------------------------------+
| GLOBAL WORKSPACE SHELL                                                                            |
| [⚡ Autopilot Cockpit] (Autonomous Engine)      |     [👥 CRM Management] (System of Record)        |
+---------------------------------------------------------------------------------------------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
         v                                                 v
+--------------------------------------+  +--------------------------------------+
| AUTOPILOT COCKPIT (/cockpit)         |  | CRM MANAGEMENT DASHBOARD (/crm)      |
+--------------------------------------+  +--------------------------------------+
| • Operational Execution Engine       |  | • Relational System of Record (SoR)  |
| • Linear Sequential Pipeline:        |  | • Relational Entity Mesh:            |
|   Tab 1: Discovery (Ingest & Verify) |  |   - Deals & Pipeline Stages          |
|   Tab 2: Demo Factory (Build & Test) |  |   - Accounts & Companies             |
|   Tab 3: Outreach (Throttle & Send)  |  |   - Contacts & Communication Notes   |
| • Real-Time Telemetry & Terminal Logs|  | • Human Relationship Management      |
| • Autonomous Subagent Workers        |  | • Contract Sizes, ARR & Revenue      |
| • High-Density Dark Theme (#090A0C)  |  | • Clean Canvas / Light Mode Available|
+--------------------------------------+  +--------------------------------------+
         |                                                 ^
         | Deep Link: "View Record in CRM ↗"              | Deep Link: "Open in Cockpit ↗"
         +-------------------------------------------------+
```

### 2.2 Sequential Pipeline Flow vs. Relational Entity Mesh
1. **Autopilot Cockpit (Sequential Execution)**:
   - Data flows forward through a three-stage assembly line:
     `Discovery (Sourced & Verified)` -> `Demo Factory (Generated & Deployed)` -> `Outreach (Queued & Sent)`.
   - Primary operations: batch runs, waterfall enrichments, compilation builds, and rate-limited queue flushes.
   - Leads do not populate CRM deal stages until positive intent or valid delivery is confirmed.
2. **CRM Management (Relational Database)**:
   - Data is structured around relational entities: Accounts have multiple Contacts, Deals, Activities, and Contracts.
   - Primary operations: stage movement (Lead -> Discovery Call -> Proposal -> Closed Won), manual note logging, task assignment, and pipeline revenue forecasting.

### 2.3 Routing, URL Patterns & State Isolation
- **URL Route Segregation**:
  - `/cockpit`: Primary cockpit route.
  - `/cockpit?tab=discovery`: Discovery spreadsheet grid.
  - `/cockpit?tab=demo-factory&runId=run_8f2a1b9`: Demo Factory with active run log drawer.
  - `/cockpit?tab=outreach&filter=scheduled`: Outreach dispatch queue filtered to scheduled items.
  - `/crm`: CRM root view.
  - `/crm/deals`: Kanban deal pipeline.
  - `/crm/contacts`: Relational contact table.
  - `/crm/companies/:id`: Company record detail view.
- **State Store Isolation**:
  - Cockpit state (`selectedRows`, `activeTab`, `logDrawerOpen`, `filterRules`) is stored in a dedicated `useCockpitStore` (or URL search params).
  - CRM state (`pipelineFilter`, `selectedDealId`, `contactModalOpen`) is stored in `useCRMStore`.
  - Switching between `/cockpit` and `/crm` never clears or contaminates the other workspace's active view filters or selection state.

### 2.4 Deep-Linking Contracts & Contextual Bridges
Contextual bridges connect the two systems without blurring their boundaries:
1. **From Cockpit to CRM**:
   - Every lead in Tab 1 or Tab 3 includes an Attio-style micro-action: `[View in CRM ↗]`.
   - Clicking opens the CRM record sheet in an overlay slide-over or navigates to `/crm/contacts/:id?from=cockpit`.
   - A return breadcrumb is rendered: `← Back to Cockpit Queue`.
2. **From CRM to Cockpit**:
   - A CRM Company Profile renders an "Autopilot Activity" widget:
     - Demo Status: `Live (v1.4) [Inspect Build Logs ↗]` -> deep links to `/cockpit?tab=demo-factory&leadId=:id`.
     - Outreach Status: `Step 2/3 Scheduled [View in Queue ↗]` -> deep links to `/cockpit?tab=outreach&leadId=:id`.

### 2.5 Global Workspace Switcher Control
Positioned in the top navigation header:
```tsx
<div className="flex items-center gap-1 bg-[#111215] border border-white/[0.08] p-1 rounded-lg">
  <button 
    onClick={() => router.push('/cockpit')}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1C1E24] text-white shadow-sm border border-white/[0.08]"
  >
    <Zap className="w-3.5 h-3.5 text-indigo-400" />
    <span>Autopilot Cockpit</span>
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 animate-pulse" />
  </button>
  <button 
    onClick={() => router.push('/crm')}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
  >
    <Users className="w-3.5 h-3.5 text-zinc-400" />
    <span>CRM Management</span>
  </button>
</div>
```

---

## 3. Design System & Design Tokens

### 3.1 Complete Neutral Color Scales
The Cockpit employs a dark OLED-first palette inspired by Linear and Trigger.dev, while CRM management can utilize a crisp light palette:

```css
:root {
  /* ==========================================================================
     Dark OLED Palette (Autopilot Cockpit Primary Theme)
     ========================================================================== */
  --cockpit-bg-base: #090A0C;          /* Deepest obsidian canvas */
  --cockpit-bg-surface: #111215;       /* Card and table row resting surface */
  --cockpit-bg-elevated: #17181D;      /* Modals, drawers, popovers */
  --cockpit-bg-subtle: #1C1E24;        /* Tab bar frame, input backgrounds */
  --cockpit-bg-hover: #22252C;         /* Row hover, button hover */
  --cockpit-bg-active: #292C35;        /* Selected rows, pressed states */

  /* Hairline Borders */
  --cockpit-border-hairline: rgba(255, 255, 255, 0.08); /* 1px structural dividing lines */
  --cockpit-border-subtle: rgba(255, 255, 255, 0.12);   /* Section dividers */
  --cockpit-border-focus: #38BDF8;                       /* Sky/cyan focus ring */
  --cockpit-inner-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.06); /* Tactile top edge */

  /* Typography Colors */
  --cockpit-text-primary: #F8FAFC;     /* Pure high-contrast foreground text */
  --cockpit-text-secondary: #94A3B8;   /* Field labels, secondary metadata */
  --cockpit-text-muted: #64748B;       /* Timestamps, line numbers, placeholders */
  --cockpit-text-disabled: #475569;    /* Disabled states */

  /* ==========================================================================
     Light Scale (CRM Management Dashboard)
     ========================================================================== */
  --crm-bg-base: #FAF8F5;
  --crm-bg-surface: #FFFFFF;
  --crm-bg-elevated: #FFFFFF;
  --crm-bg-subtle: #F1F3F5;
  --crm-bg-hover: #E9ECEF;
  --crm-border-hairline: rgba(0, 0, 0, 0.08);
  --crm-text-primary: #0F172A;
  --crm-text-secondary: #475569;
  --crm-text-muted: #94A3B8;
}
```

### 3.2 Hairline Borders & Surface Elevation
- **1px Hairline Rule**: No thick or blurry borders. All separations use `1px solid var(--cockpit-border-hairline)`.
- **Inner Milled Edge**: Card containers feature `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06)`, producing an engineering-grade tactile finish.
- **Zero Heavy Shadows**: Rested components use hairline borders instead of muddy dark dropshadows. Floating modals and popovers use `0 12px 32px -4px rgba(0, 0, 0, 0.6)`.

### 3.3 Semantic Status Tokens
Colors are strictly functional signals:

| Token Key | Base Hex | Background Fill (10%) | Border Fill (20%) | Text Hex | Semantic Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Emerald** | `#10B981` | `rgba(16, 185, 129, 0.10)` | `rgba(16, 185, 129, 0.20)` | `#34D399` | Deliverable, Live/Ready, Sent, Healthy |
| **Amber** | `#F59E0B` | `rgba(245, 158, 11, 0.10)` | `rgba(245, 158, 11, 0.20)` | `#FBBF24` | Risky/Catch-All, Building, Queued, Throttled |
| **Rose** | `#EF4444` | `rgba(239, 68, 68, 0.10)` | `rgba(239, 68, 68, 0.20)` | `#F87171` | Invalid/Bounced, Failed/Crashed, Cap Reached |
| **Sky / Cyan** | `#38BDF8` | `rgba(56, 189, 248, 0.10)` | `rgba(56, 189, 248, 0.20)` | `#38BDF8` | In-Flight, Enriching, Executing, Warmup Pool |
| **Indigo / Violet**| `#6366F1` | `rgba(99, 102, 241, 0.10)` | `rgba(99, 102, 241, 0.20)` | `#818CF8` | Outreach Triggered, Active Sequence, Primary CTA |

### 3.4 Typography Scale & Tabular Numerics
- **Font Stack**:
  - Sans: `Plus Jakarta Sans`, `Geist Sans`, `Inter`, sans-serif.
  - Mono: `JetBrains Mono`, `Geist Mono`, monospace.
- **Mandatory Tabular Numerics**:
  All metrics, stopwatches, countdown timers, quota percentages, and line numbers MUST include `font-mono tabular-nums`.

```
Scale Definition:
- text-micro:    10px (line-height: 14px, tracking: +0.02em, weight: 500) -> Badges, kbd tags
- text-caption:  11px (line-height: 16px, tracking: +0.01em, weight: 500) -> Status pills, timestamps
- text-sub:      12px (line-height: 16px, tracking: normal,  weight: 500) -> Column headers, labels
- text-body:     13px (line-height: 18px, tracking: -0.005em,weight: 400) -> Table cells, card text
- text-base:     14px (line-height: 20px, tracking: -0.01em, weight: 500) -> Card titles, inputs
- text-title:    16px (line-height: 24px, tracking: -0.015em,weight: 600) -> Drawer headers, section titles
- text-h1:       20px (line-height: 28px, tracking: -0.02em, weight: 700) -> KPI numbers, page title
```

### 3.5 Radii & Shadow Elevation Scales
- `rounded-xs`: `3px` (micro badges, inline keyboard `kbd`).
- `rounded-sm`: `5px` (buttons, inputs, dropdown items).
- `rounded-md`: `7px` (cards, tab indicators, table containers).
- `rounded-lg`: `10px` (slide-over drawers, modal dialogs).
- `rounded-full`: `9999px` (status dots, quota rings, avatars).
- `shadow-hairline`: `0 0 0 1px var(--cockpit-border-hairline)`.
- `shadow-card`: `0 1px 3px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--cockpit-border-hairline), var(--cockpit-inner-highlight)`.
- `shadow-popover`: `0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--cockpit-border-subtle)`.

### 3.6 Micro-Interactions & 120ms Compositor Physics
- **120ms Rule**: Micro-transitions (button hover, cell highlight, icon reveal) execute in `120ms ease-out`.
- **Spring Physics**: Spatial transitions (drawer slide-in, tab slider) use Framer Motion springs: `stiffness: 450, damping: 35, mass: 0.8`.
- **Compositor Only**: Animate strictly `transform` and `opacity` to avoid repaints.

---

## 4. Tab 1: Lead Discovery (Clay Pattern)

Tab 1 acts as the high-velocity data intake and validation engine.

```
+---------------------------------------------------------------------------------------------------------------------------------+
| Views: [All Leads (342)] [Needs Verification (18)] [Enriched High-Intent (140)] [+]    [Search Leads...] [Filters (2)] [Columns] |
+---+----------------------------+-----------------------+------------------------+-------------------+----------------+----------+
|   | Company / Lead             | Contact Person        | Verified Work Email    | Confidence        | Tech Stack     | Enrich   |
+---+----------------------------+-----------------------+------------------------+-------------------+----------------+----------+
| [ ] Acumen Health               | Dr. Marcus Vance      | [V] m.vance@acumen.io  | [ 98% Deliverable]| React, Dentrix | [Done]   |
| [*] Crest Dental Group         | Elena Rostova         | [?] erostova@crest.com | [ 74% Catch-All  ]| WordPress, PHP | [Enrich] |
| [ ] Apex Orthodontics          | Neil Armstrong        | [X] narmstrong@apex.org| [ 12% Undeliv.   ]| Webflow        | [Failed] |
+---+----------------------------+-----------------------+------------------------+-------------------+----------------+----------+
| Selected: 1 row                | [Enrich Selected]   [Verify Emails]   [Generate Demos]   [Push to Outreach]   [Clear (ESC)]       |
+---------------------------------------------------------------------------------------------------------------------------------+
```

### 4.1 Interactive Data Execution Spreadsheet Grid
- **Virtualization**: Built on `@tanstack/react-virtual` for 60fps scrolling across 10,000+ leads.
- **Frozen Left Columns**:
  - Column 0 (`w-10`): Row selection checkbox, pinned left (`sticky left-0 z-20`).
  - Column 1 (`w-64`): Primary Company & Domain Identifier, pinned alongside Column 0 (`sticky left-10 z-20`).
  - A subtle 1px border with shadow (`shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]`) separates frozen columns from scrollable data.
- **Row Height**: `38px` normalized height with single-line truncation.

### 4.2 Column Types, Glyphs & Controls
Each column header displays an explicit type icon:
- **Text (`Aa`)**: Text fields (Company name, Contact name).
- **Globe (`Globe`)**: Domain, website URLs.
- **Email (`Mail`)**: Email addresses.
- **Verification (`ShieldCheck`)**: Deliverability status.
- **Score (`Gauge`)**: Confidence and intent scores.
- **Tags (`Tags`)**: Tech stack, category arrays.
- **Waterfall (`Sparkles`)**: Asynchronous enrichment provider.

**Header Controls**:
- Column resize grip: 4px right border hit-box (`cursor-col-resize`), double-click auto-fits width.
- Column menu trigger: Sort Asc/Desc, Filter by column, Freeze/Unfreeze, Hide column.
- Add column (`+`) button: Opens enrichment catalog modal.

### 4.3 Multi-Select Mechanics & Selection Banner
- Checkbox hover: Semi-transparent until hovered or selected.
- Shift-Click: Selects continuous range between anchor row and clicked row.
- Select-All Banner: When header checkbox is clicked:
  *"All 25 leads on this page are selected. **Select all 342 leads in this view**"*.

### 4.4 Bottom-Anchored Floating Bulk Action Bar
When `selectedRows.length > 0`, a floating pill docks at bottom center:
- **Position**: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50`.
- **Styling**: `bg-[#111215]/95 backdrop-blur-md border border-white/[0.12] shadow-2xl rounded-full px-4 py-2 flex items-center gap-3`.
- **Elements**:
  - Count Pill: `bg-indigo-500/20 text-indigo-300 font-mono text-xs px-2.5 py-1 rounded-full border border-indigo-500/30`.
  - Divider: `h-4 w-px bg-white/[0.1]`.
  - Primary Actions:
    - `Enrich Selected` (`Sparkles` icon)
    - `Verify Emails` (`ShieldCheck` icon)
    - `Generate Demos (Tab 2)` (`PlayCircle` icon)
    - `Push to Outreach (Tab 3)` (`Send` icon)
  - Dismiss: `Deselect` (`X` icon + `Esc` key badge).

### 4.5 Asynchronous Enrichment State Machine
Enrichment transitions through observable states:
1. `idle`: Empty cell with ghost trigger (`Click to enrich`).
2. `queued`: Pulsing amber dot with text `Queued in waterfall...`.
3. `running`: Animated shimmer bar (`animate-pulse bg-white/[0.08] h-4 w-3/4 rounded`) + 12px rotating spinner.
4. `success`: Flashes emerald tint for 600ms before displaying resolved data and provider badge (`via Hunter`, `via Apollo`).
5. `failed`: Amber/rose warning triangle with `Retry` action.

### 4.6 4-State Email Verification Badges & Audit Tooltip
Email deliverability is categorized into four states:

```tsx
// Verification Badge Specifications:
Deliverable: bg-emerald-500/10 text-emerald-400 border-emerald-500/20 (CheckCircle2)
Risky:       bg-amber-500/10   text-amber-400   border-amber-500/20   (AlertTriangle)
Invalid:     bg-rose-500/10    text-rose-400    border-rose-500/20    (XCircle)
Pending:     bg-sky-500/10     text-sky-400     border-sky-500/20     (Loader2 spinning)
```

**Rich Audit Tooltip**:
Hovering the badge reveals complete SMTP and DNS telemetry:
```
+-----------------------------------------------+
| Email Health Check: m.vance@acumenhealth.io   |
+-----------------------------------------------+
| SMTP Response:      250 2.1.5 Recipient OK    |
| MX Provider:        Google Workspace (aspmx)  |
| Disposable Domain:  No                        |
| Role-Based Account: No (Individual Personal)  |
| Catch-All Config:   Disabled                  |
| Verified At:        2026-11-07 14:10:02 UTC   |
+-----------------------------------------------+
```

### 4.7 Confidence Score Pills & Visual Bars
- Score `90 - 100%`: Emerald badge (`98% High`) with 3px emerald fill bar.
- Score `70 - 89%`: Amber badge (`78% Medium`) with 3px amber fill bar.
- Score `< 70%`: Rose badge (`34% Low`) with 3px rose fill bar.

---

## 5. Tab 2: Demo Factory (Trigger.dev / Vercel Pattern)

Tab 2 serves as the automated production line where verified leads are converted into customized live demo websites.

```
+---------------------------------------------------------------------------------------------------+
| DEMO FACTORY DASHBOARD                                                                            |
| Generated: 142  |  Active Builds: 3  |  Queued: 8  |  Ready/Live: 126  |  Success Rate: 96.2%     |
+---------------------------------------------------------------------------------------------------+
| [+ New Demo Batch]  [Filter: All (142) / Building (3) / Ready (126) / Failed (5)]  [Search...]    |
+---+----------------------------+-----------------------+------------------+-----------+-----------+
| # | Clinic Lead                | Template Theme        | Status           | Duration  | Preview   |
+---+----------------------------+-----------------------+------------------+-----------+-----------+
| 1 | Apex Dental Specialists    | Boutique Aesthetic    | [● BUILDING 82%] | 24.3s     | [Preview] |
| 2 | Crest Pediatric Dentistry  | Pediatric Playful     | [● LIVE / READY] | 42.1s     | [apex.dev]|
| 3 | Smile Studio Austin        | Clinical Modern       | [▲ FAILED Step 3]| 18.2s     | [Retry]   |
+---+----------------------------+-----------------------+------------------+-----------+-----------+
```

### 5.1 High-Density Run Matrix Table
- **Columns**:
  1. Selection Checkbox.
  2. Clinic / Target Business (Name, City, Phone).
  3. Template Theme Badge (e.g. `template:aesthetic-v2`).
  4. Status Indicator Token (Semantic color dot + label).
  5. Live Stopwatch Duration (`font-mono tabular-nums`).
  6. Monospace Short Hash (`#8f2a1b9`) with copy button.
  7. Ephemeral Preview Link with hover snapshot card.
  8. Action Menu (`Logs`, `Preview`, `Retry`).

### 5.2 Lifecycle State Machine & Status Indicator Tokens
The Demo Run lifecycle is governed by a deterministic finite state machine:
```
[QUEUED] -> [SCAFFOLDING] -> [BUILDING] -> [DEPLOYING] -> [READY / LIVE]
   |             |               |              |
   v             v               v              v
[FAILED] <-------+---------------+--------------+
   |
   +-> (Retry) -> [QUEUED]
```

- `QUEUED`: Muted amber ring + `Queued in slot #3`.
- `BUILDING / EXECUTING`: Animated cyan radial pulsing dot (`box-shadow: 0 0 10px rgba(56, 189, 248, 0.4)`) + live ticking stopwatch.
- `DEPLOYING`: Blue glowing dot + `Deploying edge worker...`.
- `READY / LIVE`: Solid emerald glowing dot + `Live (Ready)`.
- `FAILED`: Crimson alert triangle + `Failed (Step 3)`.
- `CANCELLED`: Neutral slate badge.

### 5.3 Live Stopwatch Timers & Monospace Short Hashes
- **Stopwatch Physics**: Active runs display a live stopwatch ticking at 100ms intervals via `requestAnimationFrame`. Formatted as `18.4s` or `1m 24.2s`.
- **Zero Jitter**: Enforced with `font-mono tabular-nums`.
- **Short Hashes**: `run_8f2a1b9` in monospace pill. Clicking copies full ID with an instant checkmark micro-animation.

### 5.4 Ephemeral Live Preview URLs & Hover Preview Cards
- **URL Format**: `https://[client-slug]-[template]-[hash].preview.domain`.
- **Hover Preview Card**: Hovering the URL opens an interactive popover:
  - 320x180 snapshot thumbnail of the landing page.
  - Lighthouse speed score badge (`⚡ 99/100`).
  - Quick action buttons: `Open Live Drawer` or `Copy Link`.

### 5.5 Multi-Device Viewport Testing Drawer (Responsive Workbench)
Clicking `Preview` slides open a responsive device inspection drawer (`min(94vw, 1280px)`):
- **Responsive Device Switcher Buttons**:
  - `📱 Mobile (375 × 812)`: iPhone 15 mockup bezel.
  - `📱 Tablet (768 × 1024)`: iPad Mini mockup bezel.
  - `💻 Desktop (1440 × 900)`: MacBook mockup bezel.
  - `🖥️ Full Screen (100% Fluid)`.
- **Workbench Toolbar Controls**:
  - Viewport Zoom Dropdown (`50%`, `75%`, `100%`, `Fit`).
  - Frame Reload button (isolated iframe refresh).
  - Instant QR Code modal: Generates scannable QR code for physical smartphone testing.
  - External tab link (`arrow-up-right`).
- **Interactive Sandboxed Iframe**: Loaded with `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`.

### 5.6 Real-Time Streaming Build Log Drawer
Clicking `Logs` slides open the build observability drawer (`min(90vw, 1100px)`).

### 5.7 5-Stage Collapsible Execution Stepper
Each build decomposes into 5 sequential stages:
1. `scaffold_template`: Allocates isolated workspace, copies template components.
2. `ingest_brand_assets`: Parses doctor names, service list, clinic colors from Tab 1.
3. `synthesize_copy`: Injects personalized headlines and testimonials into React props.
4. `compile_vite_bundle`: Compiles Vite/Rollup production bundle, minifies assets.
5. `deploy_edge_worker`: Uploads bundle to edge storage, creates ephemeral subdomain, provisions SSL.

Each step shows status icon, duration pill (`1.2s`), and collapsible disclosure. The active running step expands automatically.

### 5.8 Streaming ANSI Terminal & Sticky Auto-Scroll Engine
- **Terminal Shell**: Pitch black (`#090A0C`), 1px border (`border-white/[0.08]`), `JetBrains Mono` 12px.
- **Log Line Columns**: Line number, delta timestamp (`+0.420s`), stream badge (`STDOUT` / `STDERR`), message with ANSI color parsing.
- **Sticky Auto-Scroll Latching Hook**:
  - Auto-scrolls down as logs stream in.
  - When the user scrolls up, auto-scroll unlatches, displaying a floating pill:
    `⬇ 18 new lines - Resume auto-scroll`.
  - Clicking the pill smoothly scrolls down and re-locks sticky tracking.
- **Search & Level Filters**: Keyword search with match counter (`Match 3 of 12`) and level toggle (`All`, `Info`, `Warn`, `Error`).

### 5.9 Syntax Error Code Frames & 1-Click Recovery
When a step crashes:
- An Error Callout Box highlights the offending code frame:
  ```
  Error: Failed to compile template prop 'doctorTitle'
  at src/templates/aesthetic/HeroSection.tsx:42:15
    40 |   <h1 className="text-4xl font-bold">
    41 |     Welcome to {clinic.name}
  > 42 |     <span>{clinic.leadDoctor.title.toUpperCase()}</span>
       |                                   ^ TypeError: Cannot read properties of undefined
    43 |   </h1>
  ```
- Instant recovery actions: `Retry this Step` or `Rerun with Clean Cache`.

---

## 6. Tab 3: Outreach Dispatch (Instantly.ai Pattern)

Tab 3 manages sender reputation preservation, rate-limited queue pacing, and outbound campaign dispatch.

```
+---------------------------------------------------------------------------------------------------+
| OUTREACH COCKPIT                                 [Queue: ACTIVE] [Pause All] [Batch Settings]     |
|                                                                                                   |
| [ DAILY CAPACITY GAUGE ]             [ WARMUP VS CAMPAIGN ]           [ MAILBOX FLEET HEALTH ]    |
|       ( 340 / 500 )                    [==Warm==|====Camp====|---]       8 Connected Inboxes      |
|         68% Utilized                   120 Warmup | 220 Campaign         98.4% Health Score       |
+---------------------------------------------------------------------------------------------------+
| Queue Status: [All (184)] [Scheduled (120)] [Sending (2)] [Throttled (14)] [Sent (48)] [Failed (0)] |
+---+----------------------------+-----------------------+------------------+-----------+-----------+
| # | Lead / Company             | Sequence Step         | Time-to-Send     | Mailbox   | Status    |
+---+----------------------------+-----------------------+------------------+-----------+-----------+
| 1 | Elena Rostova (Crest)      | Step 1/3: Intro Demo  | In 3m 42s (EST)  | sales@    | [Sending] |
| 2 | Dr. Marcus Vance (Acumen)  | Step 2/3: Value Proof | In 8m 10s (EST)  | outreach@ | [Schedule]|
| 3 | Sarah Jenkins (Apex)       | Step 1/3: Intro Demo  | In 14m 20s (CST) | info@     | [Throttle]|
+---+----------------------------+-----------------------+------------------+-----------+-----------+
```

### 6.1 Two-Tier Send Quota Engine (Account vs. Campaign)
Instantly enforces a strict two-tier cap architecture:
1. **Account-Level Cap (Inbox Ceiling)**:
   - Absolute ceiling per sending inbox per day (Google/M365: `30 - 35 emails/day`, SMTP: `25 emails/day`).
2. **Campaign-Level Cap (Aggregate Segment Ceiling)**:
   - Dynamic validation: `Campaign Cap <= Sum(Active Inboxes) * Inbox Daily Cap`.
3. **Warm-up Volume Separation**:
   - Automated warm-up traffic runs in a separate pool. Warm-up emails do not consume cold campaign quota, but the combined total must not exceed the provider ceiling.

### 6.2 Dual KPI Visual Safety Meters

#### 1. SVG Radial Quota Gauge
- Circular SVG progress ring with `stroke-dashoffset` transition.
- Bold center readout: `340 / 500` with subtext `Daily Sent (68%)`.
- Dynamic color threshold transitions:
  - `< 75%`: Emerald (`#10B981`) ring (Healthy).
  - `75% - 89%`: Cyan/Sky (`#06B6D4`) ring (Optimal).
  - `90% - 99%`: Amber (`#F59E0B`) ring (High utilization warning).
  - `100%`: Rose (`#EF4444`) ring with pulsing outer glow (Cap Reached).

#### 2. Stacked Linear Capacity Bar
- 10px tall horizontal bar with `rounded-full overflow-hidden bg-[#1C1E24]`.
- Segments:
  - Warmup Pool (Teal/Cyan `bg-cyan-500`, e.g. 24% width).
  - Active Campaign Sends (Indigo `bg-indigo-600`, e.g. 44% width).
  - Scheduled In-Flight (Sky `bg-sky-400/60`, e.g. 16% width with subtle animated pulse).
  - Remaining Safe Headroom (Neutral dark background, 16% width).
- Interactive tooltip reveals exact send counts across segments.

### 6.3 Mailbox Fleet Health & Master Queue Switch
- **Fleet Health Card**: Shows connected inboxes (e.g. `8/8 Online`), domain reputation score (`98.4%`), and DKIM/SPF auth status.
- **Global Master Queue Switch**: Tactile header toggle:
  `[ Queue: ACTIVE (Running) ]` (Green) vs. `[ Queue: PAUSED ]` (Slate).
  Pausing freezes all countdown timers without canceling scheduled dates.

### 6.4 Virtualized Outreach Dispatch Queue Table
Status badges:
- `Scheduled`: Slate clock badge (`text-zinc-400 bg-zinc-800/40`).
- `Sending`: Blue badge with animated spinner + 6px breathing pulse dot.
- `Throttled`: Amber pause-octagon badge (`text-amber-400 bg-amber-500/10`).
- `Paused`: Neutral pause badge.
- `Sent`: Emerald double-check badge (`CheckCheck`).
- `Failed`: Crimson alert circle with error tooltip.

### 6.5 Dynamic Countdown Timers & Timezone Pacing
- **Countdown Display**: Relative time ticking in tabular font: `In 4m 12s` or `In 22s`.
- When `< 60s`, pill shifts to sky blue with an animated pulsing dot.
- **Prospect Timezone Enforcement**:
  - Sends strictly between `09:00 - 17:30 Prospect Local Time`.
  - If prospect local time is outside business hours, the timer shows: `Scheduled for tomorrow 09:15 EST`.

### 6.6 Sequence Step Tracking & Micro-Steppers
- Step Pills: `Step 1/3` (Indigo), `Step 2/3` (Violet), `Step 3/3` (Slate).
- Micro-Stepper Tooltip: Hovering reveals the 3-node touch pipeline:
  `[ (1) Sent Nov 4 ] ---- [ (2) Scheduled Today ] ---- [ (3) Pending ]`.

### 6.7 Safety Jitter, Batch Throttling & Priority Routing
- **Randomized Delay (Jitter)**: Configurable slider (`120s` to `300s`) adds pseudo-random intervals between sends to mimic human behavior.
- **Batch Size Limiters**: Restricts burst releases to `10`, `25`, `50`, or `100` leads.
- **Priority Reordering**: Drag handle (`GripVertical`) allowing operators to reorder queue rows. P1 High priority items (e.g. lead viewed demo) automatically jump to the top.
- **Instant Send Action**: `Send Now` button allows immediate timer bypass with a confirmation micro-popover.

---

## 7. Complete TypeScript Data Contracts & Interfaces

To eliminate ambiguity during frontend development, below are the complete TypeScript interfaces governing the Cockpit.

### 7.1 Discovery Lead & Verification Models
```typescript
// ============================================================================
// TAB 1: LEAD DISCOVERY DATA MODELS
// ============================================================================

export type DeliverabilityStatus = 'deliverable' | 'risky' | 'invalid' | 'pending';

export interface VerificationDetails {
  status: DeliverabilityStatus;
  confidenceScore: number; // 0 - 100
  smtpCheck: 'passed' | 'failed' | 'timeout';
  mxRecordValid: boolean;
  mxHost: string;
  isCatchAll: boolean;
  isDisposable: boolean;
  isRoleAccount: boolean;
  isFreeProvider: boolean;
  verifiedAt: string; // ISO 8601 UTC
  provider: 'Debounce' | 'Hunter' | 'ZeroBounce' | 'CustomSMTP';
}

export type EnrichmentState = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export interface LeadEnrichment {
  state: EnrichmentState;
  provider?: string;
  lastUpdated?: string;
  errorMessage?: string;
  techStack?: string[];
  headcount?: string;
  annualRevenue?: string;
  decisionMakerTitle?: string;
  linkedinUrl?: string;
}

export interface DiscoveryLead {
  id: string;
  companyName: string;
  companyWebsite: string;
  companyDomain: string;
  faviconUrl?: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  verification: VerificationDetails;
  enrichment: LeadEnrichment;
  industry: string;
  location: string;
  tags: string[];
  demoReady: boolean;
  createdAt: string;
}
```

### 7.2 Demo Factory & Build Log Models
```typescript
// ============================================================================
// TAB 2: DEMO FACTORY DATA MODELS
// ============================================================================

export type RunStatus = 
  | 'QUEUED' 
  | 'SCAFFOLDING' 
  | 'BUILDING' 
  | 'DEPLOYING' 
  | 'READY' 
  | 'FAILED' 
  | 'CANCELED';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export type TemplateId = 
  | 'clinical-modern' 
  | 'boutique-aesthetic' 
  | 'high-tech-surgical' 
  | 'pediatric-playful';

export interface ClinicLeadRef {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  website?: string;
  primaryColor?: string;
  leadScore: number;
}

export interface BuildStage {
  id: string;
  name: string;
  key: 'scaffold' | 'ingest' | 'synthesize' | 'compile' | 'deploy';
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;      // ISO 8601
  deltaMs: number;        // Milliseconds from run start
  level: LogLevel;
  stream: 'stdout' | 'stderr' | 'system';
  message: string;
  stageKey?: string;
}

export interface PreviewConfig {
  ephemeralUrl: string;
  expiresAt: string;      // ISO 8601
  isPermanent: boolean;
  sslVerified: boolean;
  lighthouseScore?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  thumbnailUrl?: string;
}

export interface DemoRun {
  id: string;             // e.g. "run_8f2a1b9c"
  batchId?: string;
  clinic: ClinicLeadRef;
  templateId: TemplateId;
  status: RunStatus;
  versionTag: string;     // e.g. "v1.4.2" or commit SHA "8f2a1b9"
  triggeredBy: {
    type: 'manual' | 'batch' | 'autopilot_trigger' | 'webhook';
    authorName: string;
  };
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  totalDurationMs?: number;
  stages: BuildStage[];
  logs: LogEntry[];
  preview?: PreviewConfig;
  error?: {
    stage: string;
    message: string;
    stackTrace?: string;
    codeFrame?: string;
  };
}

export interface BatchJob {
  id: string;
  name: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  inProgressRuns: number;
  concurrency: number;
  createdAt: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  runIds: string[];
}
```

### 7.3 Outreach Dispatch & Quota Models
```typescript
// ============================================================================
// TAB 3: OUTREACH DISPATCH DATA MODELS
// ============================================================================

export type QueueItemStatus =
  | 'scheduled'
  | 'sending'
  | 'throttled'
  | 'paused'
  | 'sent'
  | 'failed';

export type PriorityLevel = 'P1_high' | 'P2_standard' | 'P3_low';

export interface QueueItem {
  id: string;
  leadId: string;
  leadName: string;
  companyName: string;
  verifiedEmail: string;
  verificationStatus: DeliverabilityStatus;
  campaignId: string;
  campaignName: string;
  sequenceStep: number;        // e.g. 1, 2, 3
  totalSequenceSteps: number;  // e.g. 3
  stepTitle: string;           // e.g. "Interactive Demo Link"
  demoUrl?: string;
  scheduledSendTime: string;   // ISO 8601 UTC
  prospectTimezone: string;    // e.g. "America/New_York"
  sendingMailboxId: string;
  sendingMailboxEmail: string;
  status: QueueItemStatus;
  priority: PriorityLevel;
  throttleBackoffMinutes?: number;
  failureReason?: string;
  sentAt?: string;
  retryCount: number;
}

export interface DailyCapacityMetrics {
  totalDailyCap: number;                 // e.g. 500
  totalSentToday: number;                // e.g. 340
  warmupSentToday: number;               // e.g. 120
  campaignSentToday: number;             // e.g. 220
  inFlightScheduled: number;             // e.g. 80
  remainingSafeHeadroom: number;         // e.g. 80
  overallUtilizationPercentage: number;  // e.g. 68%
}

export interface MailboxAccount {
  id: string;
  email: string;
  provider: 'google' | 'microsoft' | 'smtp';
  dailyCap: number;
  sentToday: number;
  warmupActive: boolean;
  healthScore: number;                   // 0 - 100
  status: 'active' | 'warning' | 'paused' | 'auth_error';
}

export interface DispatchEngineSettings {
  masterQueueRunning: boolean;
  minDelaySeconds: number;               // e.g. 120
  maxDelaySeconds: number;               // e.g. 300
  batchSizeLimit: number;                // e.g. 50
  sendingWindowStart: string;            // e.g. "09:00"
  sendingWindowEnd: string;              // e.g. "17:30"
  respectProspectTimezone: boolean;
  slowRampActive: boolean;
}
```

---

## 8. Component Hierarchy & File Mapping

### 8.1 Directory Layout
All Cockpit components reside in `frontend/src/features/cockpit/`:

```
frontend/src/features/cockpit/
├── AutopilotCockpitView.tsx             # Master view container with global telemetry and tab switcher
├── types.ts                             # Shared data contracts (Discovery, Demo, Outreach)
│
├── shared/                              # Shared primitives across Cockpit tabs
│   ├── CockpitHeader.tsx                # Title, active worker beacon, global status
│   ├── CockpitTabBar.tsx                # Segmented spring sliding pill tabs (⌘1, ⌘2, ⌘3)
│   ├── MetricKpiCard.tsx                # High-density metric card with tabular numbers
│   ├── StatusBeacon.tsx                 # Pulsing telemetry dot
│   └── PriorityGlyph.tsx                # Linear-style 3-bar priority glyph
│
├── discovery/                           # Tab 1: Lead Discovery (Clay Pattern)
│   ├── DiscoveryTab.tsx                 # Tab 1 root container
│   ├── DiscoveryMetricsStrip.tsx        # 4 KPI cards (Total, Verified %, Enriched %, Intent)
│   ├── DiscoveryToolbar.tsx             # Search input, filter builder popover, column menu
│   ├── DiscoveryDataGrid.tsx            # Virtualized spreadsheet table with frozen columns
│   ├── GridHeader.tsx                   # Column headers with resize grips and type glyphs
│   ├── GridRow.tsx                      # Dense row with hover actions and selection checkbox
│   ├── EmailVerificationBadge.tsx       # 4-state badge with rich SMTP/MX audit tooltip
│   ├── ConfidenceScorePill.tsx          # 0-100% score pill with color fill bar
│   ├── FloatingBulkActionBar.tsx        # Docked bottom-center bulk action bar
│   └── LeadDetailDrawer.tsx             # Slide-over record inspection drawer
│
├── demo-factory/                        # Tab 2: Demo Factory (Trigger.dev / Vercel Pattern)
│   ├── DemoFactoryTab.tsx               # Tab 2 root container
│   ├── DemoFactoryHeader.tsx            # Summary metrics and batch launch CTA
│   ├── RunMatrixTable.tsx               # High-density task run table
│   ├── RunMatrixRow.tsx                 # Run row with live duration stopwatch and short hash
│   ├── StatusIndicatorToken.tsx         # Semantic badge with radial pulsing animation
│   ├── LiveDurationTimer.tsx            # Tabular live stopwatch ticker (zero jitter)
│   ├── HoverPreviewCard.tsx             # 320x180 snapshot popover with Lighthouse score
│   ├── LivePreviewDrawer.tsx            # Responsive multi-device workbench (Mobile/Tablet/Desktop)
│   ├── ViewportCanvas.tsx               # Sandboxed device bezel frame and iframe stage
│   ├── QrCodeModal.tsx                  # Instant QR code for physical mobile testing
│   ├── StreamingBuildLogDrawer.tsx      # Slide-over observability drawer
│   ├── ExecutionStageStepper.tsx        # 5-stage OpenTelemetry collapsible stepper
│   ├── StreamingTerminalViewer.tsx      # ANSI monospace terminal with sticky auto-scroll
│   ├── ErrorCalloutBanner.tsx           # Syntax error code frame with 1-click retry
│   └── BatchGenerationDrawer.tsx        # Modal/drawer to configure template and launch batch
│
├── outreach/                            # Tab 3: Outreach Dispatch (Instantly.ai Pattern)
│   ├── OutreachTab.tsx                  # Tab 3 root container
│   ├── OutreachKpiHeader.tsx            # Safety strip: Radial gauge, stacked bar, fleet health
│   ├── RadialQuotaGauge.tsx             # SVG circular quota meter with threshold color shifts
│   ├── StackedCapacityBar.tsx           # 10px stacked linear bar (Warmup vs Campaign vs In-Flight)
│   ├── MailboxFleetHealth.tsx           # Connected inboxes count and domain reputation score
│   ├── MasterQueueToggle.tsx            # Tactical green/slate master switch (RUNNING vs PAUSED)
│   ├── DispatchQueueTable.tsx           # Priority-ranked dispatch queue table
│   ├── QueueRow.tsx                     # Queue row with drag handle and countdown timer
│   ├── CountdownTimerCell.tsx           # Dynamic tabular countdown ("In 4m 12s") + timezone
│   ├── SequenceStepPill.tsx             # Step 1/3 pill with 3-node connected pipeline tooltip
│   ├── BatchSettingsDrawer.tsx          # Drawer for randomized jitter (120s-300s) and windows
│   └── MessagePreviewModal.tsx          # Rendered email preview with embedded demo link
│
└── hooks/                               # Cockpit-specific custom hooks
    ├── useStickyTerminalScroll.ts       # Terminal auto-scroll latching and unread pill
    ├── useStopwatchTimer.ts             # High-precision tabular stopwatch ticker
    ├── useCountdownTimer.ts             # Live relative countdown ticker
    └── useCockpitKeyboardShortcuts.ts   # Keyboard navigation (1, 2, 3, j, k, Esc, Cmd+K)
```

### 8.2 Component Tree Architecture
```
<AutopilotCockpitView>
  ├── <CockpitHeader>
  │     ├── <WorkspaceBreadcrumb />
  │     ├── <CockpitTabBar activeTab={tab} onTabChange={setTab} />
  │     └── <GlobalStatusBeacon status="operational" />
  │
  ├── [tab === 'discovery' && <DiscoveryTab>]
  │     ├── <DiscoveryMetricsStrip />
  │     ├── <DiscoveryToolbar />
  │     ├── <DiscoveryDataGrid />
  │     │     ├── <GridHeader />
  │     │     └── <GridRowList virtualizer={...} />
  │     ├── <FloatingBulkActionBar />
  │     └── <LeadDetailDrawer />
  │
  ├── [tab === 'demo-factory' && <DemoFactoryTab>]
  │     ├── <DemoFactoryHeader />
  │     ├── <RunMatrixTable />
  │     ├── <BatchGenerationDrawer />
  │     ├── <LivePreviewDrawer />
  │     └── <StreamingBuildLogDrawer />
  │
  └── [tab === 'outreach' && <OutreachTab>]
        ├── <OutreachKpiHeader>
        │     ├── <RadialQuotaGauge />
        │     ├── <StackedCapacityBar />
        │     ├── <MailboxFleetHealth />
        │     └── <MasterQueueToggle />
        ├── <DispatchQueueTable />
        ├── <BatchSettingsDrawer />
        └── <MessagePreviewModal />
```

---

## 9. UI Library Integration & Engineering Excellence

### 9.1 Tailwind CSS Configuration & Variables
In `projects/PersonalOS and CRM/frontend/tailwind.config.ts`, extend the theme to bind cockpit tokens:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cockpit: {
          base: "#090A0C",
          surface: "#111215",
          elevated: "#17181D",
          subtle: "#1C1E24",
          hover: "#22252C",
          active: "#292C35",
          border: "rgba(255, 255, 255, 0.08)",
          borderSubtle: "rgba(255, 255, 255, 0.12)",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "monospace"],
      },
      animation: {
        'live-pulse': 'livePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        livePulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

### 9.2 Radix UI Primitives & Accessibility
The Cockpit relies on headless Radix UI primitives for robust keyboard and screen-reader accessibility:
- `@radix-ui/react-tooltip`: Instant tooltip with `delayDuration={100}` for audit logs and badges.
- `@radix-ui/react-dropdown-menu`: Column menus, row action menus.
- `@radix-ui/react-dialog`: Modals (QR Code, Message Preview, Batch Trigger).
- `@radix-ui/react-popover`: Filter rule builders and hover snapshot cards.

### 9.3 Lucide React Icon Standards
- All icons imported from `lucide-react`.
- Default sizing: `14px` (`w-3.5 h-3.5`) or `16px` (`w-4 h-4`).
- Stroke width: Strictly `1.5px` or `1.75px` across all components to maintain consistent visual weight.

### 9.4 Framer Motion Physics Guidelines
- Segmented sliding tabs use `layoutId="activeCockpitTab"` with spring `{ type: "spring", stiffness: 450, damping: 35 }`.
- Slide-over drawers use:
  ```tsx
  export const drawerVariants = {
    hidden: { x: '100%', opacity: 0.5 },
    visible: { 
      x: 0, 
      opacity: 1, 
      transition: { type: 'spring', damping: 30, stiffness: 300, mass: 0.8 } 
    },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
  };
  ```

### 9.5 Virtualization Budget & Performance Benchmarks
- Table virtualizers set `overscan: 5` to balance render speed and memory footprint.
- Stopwatches and live timers update via throttled `requestAnimationFrame` intervals, preventing React render thrashing.
- Type-check verification: All TypeScript interfaces must compile cleanly with `npm run typecheck` or `tsc --noEmit`.

---
*End of Autopilot Cockpit UI/UX Master Specification*
