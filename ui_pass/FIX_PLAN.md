# UI Consistency & Polish Plan (Fix Plan)

*Project: Personal OS & CRM*  
*Target Branch: `ui/impeccable-pass`*  
*Date: 2026-11-05*  
*Status: Awaiting Captain Approval*

---

## 1. Proposed Design Tokens & Primitives

### A. Color System Unification (One Source of Truth)

We unify all 185 scattered hex values and disparate background definitions into a singular semantic palette across `tailwind.config.ts`, `globals.css`, `layout.tsx`, and `page.tsx`:

| Token Role | Semantic Name | Dark Theme | Light Theme | Replaces in Code |
| :--- | :--- | :---: | :---: | :--- |
| **Canvas Background** | `crm-bg` | `#0B0C10` | `#FAF8F5` | `#0B0F19`, `#FAF9F6`, `slate-50` |
| **Surface Layer** | `crm-surface` | `#0F1117` | `#FFFFFF` | `#0E1017`, `slate-100` |
| **Card / Container** | `crm-card` | `#141721` | `#FFFFFF` | `#151722`, `#10121A`, `#12141D`, `#0D0F16`, `slate-900` |
| **Card Hover** | `crm-cardHover` | `#1A1D2B` | `#F8FAFC` | `slate-800/50`, `slate-200/50` |
| **Border / Hairline** | `crm-border` | `rgba(255, 255, 255, 0.08)` | `#E2E8F0` | `border-white/[0.06]`, `border-white/[0.12]`, `border-slate-200/80` |
| **Primary Brand** | `crm-primary` | `#6366F1` | `#4F46E5` | Hardcoded `blue-600` in Button.tsx |
| **Primary Hover** | `crm-primaryHover` | `#4F46E5` | `#4338CA` | `blue-700` |
| **Accent / Sprint** | `crm-accent` | `#F59E0B` | `#D97706` | Variable amber shades |
| **Telemetry Success** | `crm-success` | `#10B981` | `#059669` | `emerald-500`, `emerald-600` |
| **Destructive / DNC** | `crm-destructive`| `#EF4444` | `#DC2626` | `red-600`, `rose-600` |
| **Text Primary** | `crm-text` | `#F8FAFC` | `#0F172A` | `text-slate-100`, `text-slate-900` |
| **Text Muted** | `crm-muted` | `#94A3B8` | `#64748B` | `text-slate-400`, `text-slate-500` |

### B. Spacing Scale & Page Container
- **Grid Rhythm**: Standardized 4px increment scale: `4px` (`xs`), `8px` (`sm`), `12px` (`md`), `16px` (`lg`), `20px` (`xl`), `24px` (`2xl`), `32px` (`3xl`).
- **Main Viewport Shell**: Standardized to `h-[100dvh] w-full overflow-hidden flex flex-col` (using dynamic viewport height to prevent mobile toolbar clipping).
- **Workspace Main Container**: `<main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 space-y-6 min-w-0">`.
- **Card Padding**: Standardized to `p-4` or `p-5` (`16px`/`20px`) across all views.

### C. Corner Radius & Shape Hierarchy
- **Cards & Stat Containers**: `rounded-2xl` (`16px`). Eliminates inconsistent `rounded-3xl` jumps on standard cards.
- **Top-Level Overlays & Modals**: `rounded-3xl` (`24px`).
- **Interactive Controls (Buttons, Inputs, Selects)**: `rounded-xl` (`12px`) for primary actions, `rounded-lg` (`8px`) for utility icons.
- **Pills, Badges & Avatars**: `rounded-full` (`9999px`).

### D. Standardized Z-Index Hierarchy
- `z-0`: Base canvas & background layers.
- `z-10`: Inset panels & SVG connection layers.
- `z-20`: Persistent Sidebar & interactive drawer panels.
- `z-30`: Fixed Header (`h-16`).
- `z-40`: Popover menus (Profile menu, Filter/Sort popovers, Assistant Drawer).
- `z-50`: Modals, dialog backdrops, and Toast notifications.

### E. Component Primitives Normalization
1. **`Button.tsx`**: Standardize primary variant to Electric Indigo (`bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500`); ensure touch target min-height of 36px (`sm`), 42px (`md`), 48px (`lg`).
2. **`Badge.tsx`**: Enforce standardized padding (`px-2.5 py-0.5`), font sizing (`text-[11px] font-semibold`), and matching semantic borders.
3. **`Modal.tsx`**: Add dedicated sticky header and sticky action footer slots, enforce body internal scrolling (`max-h-[75vh] overflow-y-auto`), backdrop blur `backdrop-blur-md`, and built-in `Escape` key handling.

---

## 2. Implementation Order

1. **Phase 5: Foundation (Shared Infrastructure)**
   - Unify tokens in `tailwind.config.ts` and `globals.css`.
   - Update `src/app/layout.tsx` and `src/app/page.tsx` with unified background tokens and responsive dynamic viewport `h-[100dvh]`.
   - Normalize `src/components/ui/` (`Button.tsx`, `Badge.tsx`, `Modal.tsx`, `Skeleton.tsx`, `Toast.tsx`).
   - Fix `src/components/layout/Header.tsx` (add mobile search icon button to open Command Palette on `< 1024px`) and `Sidebar.tsx`.
   - Verify foundation with `npm run typecheck` and layout probe. Commit.

2. **Phase 6: Pilot View (Dashboard)**
   - Polish `src/features/dashboard/DashboardView.tsx`: align KPI card paddings, fix 5-column metric grid wrapping at 768px/1024px, normalize priority queue text clipping, unify borders.
   - Verify with probe (target: 0 overflow/clipping issues for Dashboard) and capture before/after screenshots at 1440px and 390px (dark & light).
   - STOP and present 1440 dark and 390 dark comparison for Captain's explicit OK. Commit.

3. **Phase 7: Remaining Feature Views (Sequenced)**
   - **Step 7.1: Pipeline Board (`src/features/board/`)**: Fix column fixed-width crowding, unify stage badges, normalize card padding.
   - **Step 7.2: Leads Table (`src/features/table/`)**: Wrap table in responsive `overflow-x-auto` container, normalize row height and hover state, fix Next Step column clipping.
   - **Step 7.3: Evening Sprint (`src/features/sprint/`)**: Standardize top metric cards to `rounded-2xl`, align EV calculation typography with `JetBrains Mono`.
   - **Step 7.4: Hustle Settings (`src/features/settings/`)**: Align form field labels, clean up autonomy mode selector cards, normalize button heights.
   - **Step 7.5: Modals & Drawers (`src/features/modals/`)**: Align `AddLeadModal`, `ProblemReportModal`, `CommandPaletteModal`, `AssistantDrawer`, and `LeadDetailModal` to the standardized `Modal` layout. Fix 2-column mobile stacking and footer clipping.
   - **Step 7.6: Autopilot Cockpit (`src/features/cockpit/`)**: Light touch only. Normalize runner control bar button heights and gaps; fix terminal container mobile overflow; strictly preserve all SVG node connection logic.
   - Run typecheck and commit after each folder.

4. **Phase 8: Extract & Final Verification**
   - Extract recurring section header and card wrappers into shared components if duplicated.
   - Full build and typecheck verification (`npm run typecheck`, `npm run build`).
   - Run full after-pass screenshot matrix and layout probe (`ui_pass/screens/after/`, `reports/probe-after.json`).
   - Final audit report (`reports/audit-after.md`, `ui_pass/REPORT.md`).

---

## 3. Risk Assessment & Boundary Guarantees

| Potential Risk | Severity | Mitigation & Guardrail |
| :--- | :---: | :--- |
| **Command Palette Mobile Access** | Low | Add an icon button (`<Search className="w-4 h-4" />`) visible on `< 1024px` in `Header.tsx` that calls existing `setCmdKOpen(true)`. Zero state/logic change. |
| **Modal Container Migration** | Medium | Keep all modal internal form fields, inputs, validation, and submission handlers 100% untouched. Only the outer modal shell (backdrop, container frame, and header/footer wrapper) is standardized. |
| **Cockpit SVG Layout Disruption** | Medium | Touch only the outer runner controls container and terminal flex wrapper. Do not alter SVG path calculations, node coordinates, or SSE event listeners in `PipelineNodeNetwork.tsx`. |
| **Context / Single-Page State Resets** | Low | Zero modifications to `CRMContext.tsx`, `activeTab` routing, or API fetch functions. |

---

## 4. What We Will NOT Touch (Explicit Non-Goals)

1. **NO Backend Modifications**: Zero edits to `backend/`, API endpoints, models, safety limits, or database files (`*.db`, `*.sqlite3`).
2. **NO Logic or Behavior Alterations**: No changes to props, types, state management, SSE streaming, command palette action definitions, or submission logic.
3. **NO New Dependencies**: Zero new packages in `frontend/package.json`.
4. **NO Touch on Sibling Folders**: No access to `dental-clinic-engine`, `Side hustle (Building Website)`, or `test_runs/`.
5. **NO Editing of Stale Specs**: `design-system/personal-os-and-crm/MASTER.md` will NOT be edited; `DESIGN.md` remains the authoritative source.
6. **NO Automated Redesign**: Look, feel, brand identity, color palette character, and functional layout are preserved.
