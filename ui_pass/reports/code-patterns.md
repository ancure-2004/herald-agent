# Code Pattern Audit - frontend/src

*Generated: 2026-11-05T15:09:03.962Z*
*Total scanned files: 41*

## Summary of Findings

| Category | Total Matches | Unique Values |
| :--- | :--- | :--- |
| Fixed Heights & Widths (`h-[...px]`, `w-[...px]`, `min-h-`, `max-h-`) | 503 | 49 |
| Viewport Units (`h-screen`, `w-screen`, `100vh`, `100vw`) | 12 | 4 |
| Overflow Rules (`overflow-hidden`, `overflow-x-hidden`, `overflow-y-auto`) | 43 | 3 |
| Arbitrary Pixel Values in Tailwind Classes | 0 | 0 |
| Hardcoded Hex Colors (`#...` and `[#...]`) | 185 | 35 |
| Z-Index Values (`z-...`) | 22 | 6 |

---

## Fixed Heights & Widths (`h-[...px]`, `w-[...px]`, `min-h-`, `max-h-`)

**Total Count:** 503

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `h-3` | 91 | `app/loading.tsx:22, app/loading.tsx:34, components/layout/Header.tsx:177 (+88 more)` |
| `w-3` | 89 | `components/layout/Header.tsx:177, components/layout/Header.tsx:230, components/layout/Header.tsx:245 (+86 more)` |
| `h-4` | 46 | `app/error.tsx:43, app/loading.tsx:8, app/not-found.tsx:23 (+43 more)` |
| `w-4` | 45 | `app/error.tsx:43, app/not-found.tsx:23, app/page.tsx:36 (+42 more)` |
| `h-2` | 24 | `components/layout/Header.tsx:160, components/layout/Sidebar.tsx:90, components/layout/Sidebar.tsx:225 (+21 more)` |
| `h-1` | 20 | `components/layout/Header.tsx:194, components/layout/Sidebar.tsx:183, components/layout/Sidebar.tsx:191 (+17 more)` |
| `w-2` | 18 | `components/layout/Header.tsx:160, components/layout/Sidebar.tsx:90, components/layout/Sidebar.tsx:225 (+15 more)` |
| `w-1` | 14 | `components/layout/Header.tsx:194, components/layout/Sidebar.tsx:75, components/layout/Sidebar.tsx:183 (+11 more)` |
| `w-8` | 12 | `components/layout/Header.tsx:171, components/layout/Sidebar.tsx:47, components/layout/Sidebar.tsx:82 (+9 more)` |
| `h-8` | 11 | `app/loading.tsx:12, components/layout/Header.tsx:171, features/cockpit/OutreachHubSubpage.tsx:279 (+8 more)` |
| `h-5` | 10 | `components/layout/Sidebar.tsx:44, components/layout/Sidebar.tsx:73, components/layout/Sidebar.tsx:75 (+7 more)` |
| `w-5` | 9 | `components/layout/Sidebar.tsx:44, components/layout/Sidebar.tsx:73, components/ui/Modal.tsx:68 (+6 more)` |
| `w-0` | 8 | `app/page.tsx:48, app/page.tsx:52, features/board/KanbanBoardView.tsx:525 (+5 more)` |
| `h-7` | 6 | `app/error.tsx:21, app/loading.tsx:35, app/not-found.tsx:9 (+3 more)` |
| `w-12` | 6 | `app/global-error.tsx:20, components/layout/Sidebar.tsx:66, features/board/KanbanBoardView.tsx:617 (+3 more)` |
| `h-12` | 6 | `app/global-error.tsx:20, components/layout/Sidebar.tsx:66, features/board/KanbanBoardView.tsx:617 (+3 more)` |
| `h-9` | 6 | `app/loading.tsx:7, app/loading.tsx:10, app/loading.tsx:13 (+3 more)` |
| `w-7` | 5 | `app/error.tsx:21, app/not-found.tsx:9, features/cockpit/AutopilotCockpitView.tsx:442 (+2 more)` |
| `h-16` | 5 | `app/loading.tsx:5, components/layout/Header.tsx:62, features/cockpit/PipelineNodeNetwork.tsx:205 (+2 more)` |
| `h-10` | 5 | `app/loading.tsx:24, app/loading.tsx:37, components/layout/Header.tsx:188 (+2 more)` |
| `h-72` | 5 | `app/loading.tsx:47, app/loading.tsx:48, features/cockpit/AutopilotCockpitView.tsx:665 (+2 more)` |
| `w-6` | 5 | `features/board/KanbanBoardView.tsx:437, features/board/KanbanBoardView.tsx:618, features/sprint/EveningSprintView.tsx:30 (+2 more)` |
| `h-6` | 5 | `features/board/KanbanBoardView.tsx:437, features/board/KanbanBoardView.tsx:618, features/sprint/EveningSprintView.tsx:30 (+2 more)` |
| `w-14` | 4 | `app/error.tsx:20, app/not-found.tsx:8, features/cockpit/PipelineNodeNetwork.tsx:204 (+1 more)` |
| `w-9` | 4 | `app/loading.tsx:7, components/layout/Header.tsx:65, features/modals/CommandPaletteModal.tsx:234 (+1 more)` |
| `w-11` | 4 | `components/layout/Sidebar.tsx:41, components/layout/Sidebar.tsx:87, features/modals/LeadDetailModal.tsx:287 (+1 more)` |
| `w-16` | 3 | `app/loading.tsx:22, features/modals/LeadDetailModal.tsx:675, features/modals/LeadDetailModal.tsx:676` |
| `w-10` | 3 | `components/layout/Header.tsx:188, features/board/KanbanBoardView.tsx:588, features/board/KanbanBoardView.tsx:645` |
| `h-11` | 3 | `components/layout/Sidebar.tsx:41, components/layout/Sidebar.tsx:87, features/modals/LeadDetailModal.tsx:287` |
| `h-14` | 2 | `app/error.tsx:20, app/not-found.tsx:8` |

## Viewport Units (`h-screen`, `w-screen`, `100vh`, `100vw`)

**Total Count:** 12

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `h-screen` | 5 | `app/error.tsx:18, app/global-error.tsx:18, app/loading.tsx:3 (+2 more)` |
| `w-screen` | 5 | `app/error.tsx:18, app/global-error.tsx:18, app/loading.tsx:3 (+2 more)` |
| `min-h-screen` | 1 | `components/ui/Modal.tsx:46` |
| `100vh` | 1 | `features/cockpit/AutopilotCockpitView.tsx:395` |

## Overflow Rules (`overflow-hidden`, `overflow-x-hidden`, `overflow-y-auto`)

**Total Count:** 43

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `overflow-hidden` | 24 | `app/layout.tsx:15, app/layout.tsx:16, app/loading.tsx:3 (+21 more)` |
| `overflow-y-auto` | 17 | `app/loading.tsx:31, app/page.tsx:52, components/layout/Sidebar.tsx:97 (+14 more)` |
| `overflow-x-auto` | 2 | `features/board/KanbanBoardView.tsx:341, features/dashboard/DashboardView.tsx:463` |

## Arbitrary Pixel Values in Tailwind Classes

**Total Count:** 0

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |

## Hardcoded Hex Colors (`#...` and `[#...]`)

**Total Count:** 185

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `#141721` | 66 | `app/error.tsx:19, app/globals.css:51, app/loading.tsx:42 (+63 more)` |
| `#0E1017` | 27 | `app/error.tsx:32, features/cockpit/AutopilotCockpitView.tsx:527, features/cockpit/AutopilotCockpitView.tsx:542 (+24 more)` |
| `#10121A` | 20 | `features/modals/AssistantDrawer.tsx:26, features/modals/AssistantDrawer.tsx:95, features/modals/AssistantDrawer.tsx:138 (+17 more)` |
| `#ffffff` | 7 | `app/globals.css:12, app/globals.css:15, app/globals.css:18 (+4 more)` |
| `#0F1117` | 7 | `app/loading.tsx:5, app/loading.tsx:20, components/layout/Header.tsx:62 (+4 more)` |
| `#FAF9F6` | 6 | `app/error.tsx:18, app/global-error.tsx:18, app/loading.tsx:3 (+3 more)` |
| `#0B0D14` | 6 | `components/layout/Header.tsx:201, features/cockpit/AutopilotCockpitView.tsx:585, features/cockpit/CockpitSupervisorBar.tsx:106 (+3 more)` |
| `#0B0C10` | 5 | `app/error.tsx:18, app/loading.tsx:3, app/not-found.tsx:6 (+2 more)` |
| `#12141D` | 4 | `components/layout/Sidebar.tsx:222, features/modals/LeadDetailModal.tsx:281, features/modals/LeadDetailModal.tsx:779 (+1 more)` |
| `#6366f1` | 3 | `app/globals.css:13, app/globals.css:44, app/globals.css:58` |
| `#4f46e5` | 2 | `app/globals.css:11, app/globals.css:25` |
| `#f59e0b` | 2 | `app/globals.css:14, app/globals.css:47` |
| `#0f172a` | 2 | `app/globals.css:17, app/globals.css:19` |
| `#ef4444` | 2 | `app/globals.css:23, app/globals.css:56` |
| `#0b0c10` | 2 | `app/globals.css:49, app/globals.css:78` |
| `#f8fafc` | 2 | `app/globals.css:50, app/globals.css:52` |
| `#94a3b8` | 2 | `app/globals.css:54, app/globals.css:89` |
| `#202538` | 2 | `app/globals.css:55, app/globals.css:85` |
| `#121521` | 2 | `features/cockpit/AutopilotCockpitView.tsx:588, features/cockpit/OutreachHubSubpage.tsx:491` |
| `#faf8f5` | 1 | `app/globals.css:16` |
| `#f4efe9` | 1 | `app/globals.css:20` |
| `#64748b` | 1 | `app/globals.css:21` |
| `#e2e8f0` | 1 | `app/globals.css:22` |
| `#818cf8` | 1 | `app/globals.css:46` |
| `#10131b` | 1 | `app/globals.css:53` |
| `#f1f5f9` | 1 | `app/globals.css:75` |
| `#cbd5e1` | 1 | `app/globals.css:81` |
| `#333c57` | 1 | `app/globals.css:92` |
| `#0B0F19` | 1 | `app/layout.tsx:16` |
| `#0D0F16` | 1 | `features/board/KanbanBoardView.tsx:406` |

## Z-Index Values (`z-...`)

**Total Count:** 22

### Frequency Table

| Token / Value | Frequency | Sample Locations |
| :--- | :--- | :--- |
| `z-50` | 9 | `app/page.tsx:29, components/layout/Header.tsx:185, components/ui/Modal.tsx:45 (+6 more)` |
| `z-20` | 4 | `components/layout/Sidebar.tsx:37, components/layout/Sidebar.tsx:97, features/cockpit/PipelineNodeNetwork.tsx:130 (+1 more)` |
| `z-40` | 4 | `features/board/KanbanBoardView.tsx:232, features/board/KanbanBoardView.tsx:290, features/cockpit/CockpitSupervisorBar.tsx:48 (+1 more)` |
| `z-10` | 3 | `features/cockpit/NodeInspectionDrawer.tsx:69, features/cockpit/PipelineNodeNetwork.tsx:160, features/cockpit/PipelineNodeNetwork.tsx:204` |
| `z-30` | 1 | `components/layout/Header.tsx:62` |
| `z-0` | 1 | `features/cockpit/PipelineNodeNetwork.tsx:121` |

