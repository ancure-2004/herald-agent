# Code Pattern Audit - frontend/src

*Generated: 2026-11-05T16:46:34.445Z*
*Total scanned files: 42*

## Summary of Findings

| Category | Total Matches | Unique Values |
| :--- | :--- | :--- |
| Fixed Heights & Widths (`h-[...px]`, `w-[...px]`, `min-h-`, `max-h-`) | 514 | 47 |
| Viewport Units (`h-screen`, `w-screen`, `100vh`, `100vw`) | 11 | 4 |
| Overflow Rules (`overflow-hidden`, `overflow-x-hidden`, `overflow-y-auto`) | 46 | 3 |
| Arbitrary Pixel Values in Tailwind Classes | 0 | 0 |
| Hardcoded Hex Colors (`#...` and `[#...]`) | 161 | 32 |
| Z-Index Values (`z-...`) | 20 | 6 |

---

## Fixed Heights & Widths (`h-[...px]`, `w-[...px]`, `min-h-`, `max-h-`)

**Total Count:** 514

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `h-3` | 91 | `app/loading.tsx:22, app/loading.tsx:34, components/layout/Header.tsx:194 (+88 more)` |
| `w-3` | 89 | `components/layout/Header.tsx:194, components/layout/Header.tsx:247, components/layout/Header.tsx:262 (+86 more)` |
| `h-4` | 47 | `app/error.tsx:43, app/loading.tsx:8, app/not-found.tsx:23 (+44 more)` |
| `w-4` | 46 | `app/error.tsx:43, app/not-found.tsx:23, app/page.tsx:36 (+43 more)` |
| `h-2` | 24 | `components/layout/Header.tsx:176, components/layout/Sidebar.tsx:93, components/layout/Sidebar.tsx:228 (+21 more)` |
| `h-1` | 20 | `components/layout/Header.tsx:211, components/layout/Sidebar.tsx:186, components/layout/Sidebar.tsx:194 (+17 more)` |
| `w-2` | 18 | `components/layout/Header.tsx:176, components/layout/Sidebar.tsx:93, components/layout/Sidebar.tsx:228 (+15 more)` |
| `w-0` | 14 | `app/globals.css:104, app/page.tsx:48, app/page.tsx:52 (+11 more)` |
| `w-1` | 14 | `components/layout/Header.tsx:211, components/layout/Sidebar.tsx:77, components/layout/Sidebar.tsx:186 (+11 more)` |
| `w-8` | 13 | `components/layout/Header.tsx:65, components/layout/Header.tsx:188, components/layout/Sidebar.tsx:48 (+10 more)` |
| `h-5` | 13 | `components/layout/Sidebar.tsx:45, components/layout/Sidebar.tsx:75, components/layout/Sidebar.tsx:77 (+10 more)` |
| `h-8` | 12 | `app/loading.tsx:12, components/layout/Header.tsx:65, components/layout/Header.tsx:188 (+9 more)` |
| `w-5` | 12 | `components/layout/Sidebar.tsx:45, components/layout/Sidebar.tsx:75, components/ui/Modal.tsx:75 (+9 more)` |
| `h-16` | 7 | `app/loading.tsx:5, components/layout/Header.tsx:62, features/cockpit/PipelineNodeNetwork.tsx:205 (+4 more)` |
| `h-10` | 7 | `app/loading.tsx:24, app/loading.tsx:37, components/layout/Header.tsx:205 (+4 more)` |
| `h-7` | 6 | `app/error.tsx:21, app/loading.tsx:35, app/not-found.tsx:9 (+3 more)` |
| `h-9` | 6 | `app/loading.tsx:7, app/loading.tsx:10, app/loading.tsx:13 (+3 more)` |
| `w-11` | 6 | `components/layout/Sidebar.tsx:67, features/modals/LeadDetailModal.tsx:287, features/modals/LeadDetailModal.tsx:864 (+3 more)` |
| `w-7` | 5 | `app/error.tsx:21, app/not-found.tsx:9, features/cockpit/AutopilotCockpitView.tsx:442 (+2 more)` |
| `w-16` | 5 | `app/loading.tsx:22, features/dashboard/DashboardView.tsx:193, features/dashboard/DashboardView.tsx:194 (+2 more)` |
| `h-72` | 5 | `app/loading.tsx:47, app/loading.tsx:48, features/cockpit/AutopilotCockpitView.tsx:665 (+2 more)` |
| `w-10` | 5 | `components/layout/Header.tsx:205, components/layout/Sidebar.tsx:41, components/layout/Sidebar.tsx:89 (+2 more)` |
| `h-11` | 5 | `components/layout/Sidebar.tsx:67, features/modals/LeadDetailModal.tsx:287, features/sprint/EveningSprintView.tsx:32 (+2 more)` |
| `w-14` | 4 | `app/error.tsx:20, app/not-found.tsx:8, features/cockpit/PipelineNodeNetwork.tsx:204 (+1 more)` |
| `w-9` | 4 | `app/loading.tsx:7, components/layout/Header.tsx:65, features/modals/CommandPaletteModal.tsx:252 (+1 more)` |
| `h-14` | 2 | `app/error.tsx:20, app/not-found.tsx:8` |
| `w-12` | 2 | `app/global-error.tsx:20, features/board/KanbanBoardView.tsx:617` |
| `h-12` | 2 | `app/global-error.tsx:20, features/board/KanbanBoardView.tsx:617` |
| `w-32` | 2 | `app/loading.tsx:8, app/loading.tsx:34` |
| `w-80` | 2 | `app/loading.tsx:10, features/board/KanbanBoardView.tsx:290` |

## Viewport Units (`h-screen`, `w-screen`, `100vh`, `100vw`)

**Total Count:** 11

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `h-screen` | 4 | `app/error.tsx:18, app/global-error.tsx:18, app/loading.tsx:3 (+1 more)` |
| `w-screen` | 4 | `app/error.tsx:18, app/global-error.tsx:18, app/loading.tsx:3 (+1 more)` |
| `100vw` | 2 | `features/cockpit/CockpitSupervisorBar.tsx:67, features/modals/AssistantDrawer.tsx:25` |
| `100vh` | 1 | `features/cockpit/AutopilotCockpitView.tsx:395` |

## Overflow Rules (`overflow-hidden`, `overflow-x-hidden`, `overflow-y-auto`)

**Total Count:** 46

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `overflow-hidden` | 24 | `app/layout.tsx:15, app/layout.tsx:16, app/loading.tsx:3 (+21 more)` |
| `overflow-y-auto` | 19 | `app/globals.css:104, app/loading.tsx:31, app/page.tsx:52 (+16 more)` |
| `overflow-x-auto` | 3 | `features/board/KanbanBoardView.tsx:341, features/dashboard/DashboardView.tsx:466, features/table/LeadsTableView.tsx:12` |

## Arbitrary Pixel Values in Tailwind Classes

**Total Count:** 0

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |

## Hardcoded Hex Colors (`#...` and `[#...]`)

**Total Count:** 161

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `#141721` | 73 | `app/error.tsx:19, app/globals.css:51, app/globals.css:107 (+70 more)` |
| `#0F1117` | 14 | `app/loading.tsx:5, app/loading.tsx:20, components/layout/Header.tsx:62 (+11 more)` |
| `#0E1017` | 11 | `app/error.tsx:32, features/modals/LeadDetailModal.tsx:572, features/modals/LeadDetailModal.tsx:584 (+8 more)` |
| `#ffffff` | 7 | `app/globals.css:12, app/globals.css:15, app/globals.css:18 (+4 more)` |
| `#10121A` | 6 | `features/modals/LeadDetailModal.tsx:543, features/modals/LeadDetailModal.tsx:655, features/modals/LeadDetailModal.tsx:704 (+3 more)` |
| `#0B0C10` | 5 | `app/error.tsx:18, app/layout.tsx:16, app/loading.tsx:3 (+2 more)` |
| `#0B0D14` | 5 | `features/cockpit/AutopilotCockpitView.tsx:585, features/cockpit/CockpitSupervisorBar.tsx:106, features/cockpit/NodeInspectionDrawer.tsx:156 (+2 more)` |
| `#FAF9F6` | 4 | `app/error.tsx:18, app/global-error.tsx:18, app/loading.tsx:3 (+1 more)` |
| `#6366f1` | 3 | `app/globals.css:13, app/globals.css:44, app/globals.css:58` |
| `#4f46e5` | 2 | `app/globals.css:11, app/globals.css:25` |
| `#f59e0b` | 2 | `app/globals.css:14, app/globals.css:47` |
| `#0f172a` | 2 | `app/globals.css:17, app/globals.css:19` |
| `#ef4444` | 2 | `app/globals.css:23, app/globals.css:56` |
| `#0b0c10` | 2 | `app/globals.css:49, app/globals.css:78` |
| `#f8fafc` | 2 | `app/globals.css:50, app/globals.css:52` |
| `#94a3b8` | 2 | `app/globals.css:54, app/globals.css:89` |
| `#202538` | 2 | `app/globals.css:55, app/globals.css:85` |
| `#FAF8F5` | 2 | `app/layout.tsx:16, app/page.tsx:25` |
| `#121521` | 2 | `features/cockpit/AutopilotCockpitView.tsx:588, features/cockpit/OutreachHubSubpage.tsx:491` |
| `#faf8f5` | 1 | `app/globals.css:16` |
| `#f4efe9` | 1 | `app/globals.css:20` |
| `#64748b` | 1 | `app/globals.css:21` |
| `#e2e8f0` | 1 | `app/globals.css:22` |
| `#818cf8` | 1 | `app/globals.css:46` |
| `#12141d` | 1 | `app/globals.css:53` |
| `#f1f5f9` | 1 | `app/globals.css:75` |
| `#cbd5e1` | 1 | `app/globals.css:81` |
| `#333c57` | 1 | `app/globals.css:92` |
| `#0B0D13` | 1 | `features/modals/LeadDetailModal.tsx:419` |
| `#1A1D2B` | 1 | `features/modals/LeadDetailModal.tsx:470` |

## Z-Index Values (`z-...`)

**Total Count:** 20

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `z-50` | 7 | `app/page.tsx:29, components/layout/Header.tsx:202, components/ui/Modal.tsx:47 (+4 more)` |
| `z-20` | 4 | `components/layout/Sidebar.tsx:37, components/layout/Sidebar.tsx:100, features/cockpit/PipelineNodeNetwork.tsx:130 (+1 more)` |
| `z-40` | 4 | `features/board/KanbanBoardView.tsx:232, features/board/KanbanBoardView.tsx:290, features/cockpit/CockpitSupervisorBar.tsx:48 (+1 more)` |
| `z-10` | 3 | `features/cockpit/NodeInspectionDrawer.tsx:69, features/cockpit/PipelineNodeNetwork.tsx:160, features/cockpit/PipelineNodeNetwork.tsx:204` |
| `z-30` | 1 | `components/layout/Header.tsx:62` |
| `z-0` | 1 | `features/cockpit/PipelineNodeNetwork.tsx:121` |

