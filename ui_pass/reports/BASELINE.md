# UI Consistency & Polish Pass - Baseline Report

*Generated: 2026-11-05*  
*Branch: `ui/impeccable-pass`*  
*Project: Personal OS & CRM (`frontend/src`)*

---

## 1. Executive Summary & Aggregate Issue Counts

This baseline report captures the complete pre-pass state of the Personal OS & CRM frontend across automated detection, code pattern analysis, full Playwright responsive screenshot matrix (88 screenshots captured), and technical/design quality audits.

### Aggregate Metrics

| Assessment Tool | Scope | Findings / Issue Count |
| :--- | :--- | :---: |
| **Impeccable Detector** (`detect-before.txt`) | Static scan of `frontend/src` | **5** anti-patterns (overused fonts, AI gradient tells) |
| **Code Pattern Audit** (`code-patterns.md`) | Regex analysis of 41 TSX/CSS files | **765** pattern anomalies (503 fixed sizes, 185 hex colors, 43 overflows, 22 z-indices) |
| **Layout Probe** (`probe-before.md`) | 88 browser test conditions | **274** clipped text events, **4** distinct z-index layers |
| **Screenshot Matrix** (`screens/before/`) | 6 views + 5 modals across 4 widths & 2 themes | **88** full-page reference screenshots |
| **Technical Audit** (`audit-before.md`) | 5 dimensions (0-4 scale) | Score: A11y (1/4), Theming (1/4), Responsive (1/4) |

---

## 2. Priority Classification: P0 and P1 Issues

### Priority 0: Critical Functional, Viewport & Accessibility Blockers

1. **[P0] Command Palette Completely Unreachable on Mobile/Tablet (`< 1024px`)**
   - **File**: `frontend/src/components/layout/Header.tsx:120`
   - **Evidence**: Search bar is wrapped in `hidden lg:block`. There is no icon button or alternate trigger for smaller screens, and there is no global keyboard shortcut listener in `CRMContext.tsx`. Mobile operators cannot access Command Palette.
   - **Screenshot**: `ui_pass/screens/before/dark/390/view-dashboard.png`

2. **[P0] Modal Primitive Divergence & Trapped Overlays**
   - **File**: `frontend/src/features/modals/{AddLeadModal,CommandPaletteModal,ProblemReportModal,LeadDetailModal}.tsx`
   - **Evidence**: Each modal independently recreates backdrop and container markup instead of consuming `src/components/ui/Modal.tsx`. 3 out of 5 modals (`AddLeadModal`, `CommandPaletteModal`, `ProblemReportModal`) lack an `Escape` key listener, trapping keyboard users.
   - **Screenshot**: `ui_pass/screens/before/dark/1440/modal-AddLead.png`

3. **[P0] Severe Text Truncation and Clipping Across All Breakpoints (274 Occurrences)**
   - **File**: `frontend/src/features/modals/AddLeadModal.tsx`, `LeadDetailModal.tsx`, `ProblemReportModal.tsx`
   - **Evidence**: The automated layout probe discovered 274 clipped text instances where `scrollWidth > clientWidth` (e.g. Next Action texts like `"Review 3 live demo links & approve WhatsApp pitch"` clipped to 210px in dropdowns and action cards).
   - **Screenshot**: `ui_pass/screens/before/dark/390/modal-LeadDetail.png`

4. **[P0] Primary Button Token Disconnect (`blue-600` vs `indigo-600`)**
   - **File**: `frontend/src/components/ui/Button.tsx:16`
   - **Evidence**: `Button.tsx` hardcodes `primary: "bg-blue-600 hover:bg-blue-700 text-white"` while the entire design system and `tailwind.config.ts` standardizes on `indigo-600` / `indigo-500`.

5. **[P0] Root Shell Viewport Trapping on Mobile Browsers**
   - **File**: `frontend/src/app/layout.tsx:15`, `frontend/src/app/page.tsx:25`
   - **Evidence**: `html` and `body` enforce `h-full overflow-hidden`, while `page.tsx` enforces `h-screen w-screen overflow-hidden`. On mobile devices with dynamic address bars, `100vh` / `h-screen` causes bottom action buttons to sit beneath the system toolbar.

---

### Priority 1: Visual Cohesion, Theming & Responsiveness Bugs

6. **[P1] Hex Color Fragmentation Across 185 Occurrences**
   - **Files**: Across all feature components (`DashboardView.tsx`, `LeadsTableView.tsx`, `KanbanBoardView.tsx`, `AutopilotCockpitView.tsx`)
   - **Evidence**: Dark background and card colors are defined with multiple conflicting hex values: `#0B0C10`, `#0B0F19`, `#0F1117`, `#141721`, `#0E1017`, `#10121A`, `#12141D`, `#0D0F16`.

7. **[P1] Uncontained Horizontal Scroll on Leads Table**
   - **File**: `frontend/src/features/table/LeadsTableView.tsx:11`
   - **Evidence**: At 768px and 390px, table columns extend off-screen without a dedicated `overflow-x-auto` wrapper, cutting off the Mandatory Next Step and Action columns.
   - **Screenshot**: `ui_pass/screens/before/dark/390/view-table.png`

8. **[P1] Inconsistent Card and Container Border Radius**
   - **Files**: `DashboardView.tsx`, `EveningSprintView.tsx`, `HustleSettingsView.tsx`
   - **Evidence**: Metric cards unpredictably alternate between `rounded-3xl` (24px), `rounded-2xl` (16px), and `rounded-xl` (12px) without semantic rationale.

9. **[P1] Autopilot Cockpit Runner Controls Clutter on Mobile**
   - **File**: `frontend/src/features/cockpit/AutopilotCockpitView.tsx`
   - **Evidence**: Target leads selector, locality dropdown, and action buttons crowd and wrap irregularly at widths `< 768px`.
   - **Screenshot**: `ui_pass/screens/before/dark/390/view-autopilot.png`

10. **[P1] Low Contrast and Bleed in Light Mode**
    - **Files**: `frontend/src/app/globals.css`, `frontend/src/components/layout/Header.tsx`
    - **Evidence**: Borders using `border-slate-200/80` fade into the `#FAF8F5` light background; status pills with light pastel text are hard to read.
    - **Screenshot**: `ui_pass/screens/before/light/1440/view-dashboard.png`

---

## 3. Top 15 Visual and Structural Problems (Catalog)

| # | Problem Description | Primary File | Baseline Screenshot |
|---|---|---|---|
| 1 | Command Palette trigger hidden on viewports `< 1024px` | `src/components/layout/Header.tsx:120` | `screens/before/dark/768/view-dashboard.png` |
| 2 | Primary Button variant hardcodes blue instead of indigo | `src/components/ui/Button.tsx:16` | `screens/before/dark/1440/modal-AddLead.png` |
| 3 | 274 clipped text occurrences across Next Actions & labels | `src/features/modals/LeadDetailModal.tsx` | `screens/before/dark/390/modal-LeadDetail.png` |
| 4 | Modals missing `Escape` key listeners & shared container | `src/features/modals/AddLeadModal.tsx` | `screens/before/dark/1440/modal-AddLead.png` |
| 5 | Conflicting root background colors (`#0B0C10` vs `#0B0F19`) | `src/app/layout.tsx:16`, `page.tsx:25` | `screens/before/dark/1440/view-dashboard.png` |
| 6 | Leads Table horizontal clipping without scroll affordance | `src/features/table/LeadsTableView.tsx` | `screens/before/dark/390/view-table.png` |
| 7 | Assistant Drawer fixed width (`360px-410px`) breaks at 390px | `src/features/modals/AssistantDrawer.tsx:25` | `screens/before/dark/390/modal-Assistant.png` |
| 8 | Inconsistent card radiuses (`rounded-3xl` vs `rounded-2xl`) | `src/features/sprint/EveningSprintView.tsx` | `screens/before/dark/1440/view-sprint.png` |
| 9 | Cockpit Runner buttons uneven heights (36px vs 40px) | `src/features/cockpit/AutopilotCockpitView.tsx` | `screens/before/dark/1024/view-autopilot.png` |
| 10 | Kanban columns crowd and clip cards on 768px tablet | `src/features/board/KanbanBoardView.tsx` | `screens/before/dark/768/view-board.png` |
| 11 | Light mode borders wash out on warm canvas (`#FAF8F5`) | `src/app/globals.css:22` | `screens/before/light/1440/view-dashboard.png` |
| 12 | Status badges lack standardized sizing and typography | `src/components/ui/Badge.tsx:21` | `screens/before/dark/1440/view-table.png` |
| 13 | Hardcoded hex colors (185 instances across feature files) | `src/features/dashboard/DashboardView.tsx` | `screens/before/dark/1440/view-dashboard.png` |
| 14 | Modal footers clip on short viewports without sticky bottom | `src/features/modals/LeadDetailModal.tsx` | `screens/before/dark/768/modal-LeadDetail.png` |
| 15 | AI gradient tells (`from-indigo-500 to-purple-600`) | `src/components/layout/Header.tsx:171` | `screens/before/dark/1440/view-dashboard.png` |

---

## 4. Stale Spec Mismatch Note

`design-system/personal-os-and-crm/MASTER.md` is confirmed stale: it specifies a light-blue theme and explicitly labels dark-by-default an anti-pattern. In contrast, the running production codebase, user preferences, and real design tokens are dark-by-default with obsidian `#0B0C10`, electric indigo `#6366F1`, and amber `#F59E0B`. Per Hard Rule 7, `MASTER.md` remains untouched, and the running codebase and `DESIGN.md` serve as the normative source of truth.
