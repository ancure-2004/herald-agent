# API Documentation - Personal OS & CRM

## Base URLs and Versioning

- **Version 1 (Standard)**: `/api/v1/...`
- **Frontend Compatibility Alias**: `/api/...`

Both route prefixes map to the same modular controllers and services. Existing frontend calls require zero changes.

---

## Interactive Documentation

- **Swagger UI**: `http://localhost:8000/docs` (Disabled when `ENVIRONMENT=production`)
- **ReDoc**: `http://localhost:8000/redoc` (Disabled when `ENVIRONMENT=production`)
- **Raw OpenAPI Schema**: `docs/openapi.json` or `http://localhost:8000/openapi.json`

---

## Endpoint Catalog

### 1. System & Health
| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Root service metadata | 200 OK |
| `GET` | `/api/health` | Health status and summary counts | 200 OK |
| `GET` | `/api/v1/health` | Health status and summary counts (v1) | 200 OK |

### 2. Hustles & Pipeline Configuration
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hustles` | None | Lists all configured hustles with stages and views |
| `POST` | `/api/hustles` | `HustleCreate` | Creates a new hustle with default stages |
| `PATCH` | `/api/hustles/{id}` | `HustleUpdate` | Updates hustle settings (channels, limits, autonomy) |
| `GET` | `/api/sprint` | `?hustle_id=1&budget_minutes=75` | Computes prioritized evening sprint based on ROI/min |
| `GET` | `/api/stock-plan` | `?hustle_id=1` | Returns buffer stock requirements & refill needs |
| `POST` | `/api/availability` | `AvailabilitySetRequest` | Sets day mode (`normal`, `away`, `off`) |
| `POST` | `/api/schedule/day-mode` | `{"mode": "away"}` | Dashboard day mode shortcut |

### 3. Leads Management
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leads` | Query params | Filterable lead pipeline list |
| `POST` | `/api/leads` | `LeadCreate` | Creates a new lead (enforces next action & uniqueness) |
| `PATCH` | `/api/leads/{id}` | `LeadUpdate` | Updates lead attributes |
| `POST` | `/api/leads/{id}/complete-task` | `CompleteTaskRequest` | Completes task and mandates next step |
| `DELETE`| `/api/leads/{id}` | None | **BLOCKED (HTTP 405)**: Leads are archived, never deleted |
| `POST` | `/api/leads/{id}/archive` | None | Moves lead to archived state with reason |
| `GET` | `/api/leads/export/csv` | None | Exports all leads as CSV |
| `GET` | `/api/leads/{id}/copilot` | None | Returns tailored objection handling suggestions |
| `GET` | `/api/leads/{id}/reply-copilot` | None | Suggestions list alias |
| `POST` | `/api/leads/{id}/approve-send` | `{"channel": "whatsapp"}` | Shortcut to approve and send initial pitch |
| `POST` | `/api/leads/{id}/post-call-draft` | `{"call_note": "..."}` | Generates WhatsApp follow-up & locks commitment |
| `POST` | `/api/admin/wipe-leads` | None | Clears demo leads for a clean slate |

### 4. Messages & Outreach Safety
| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/leads/{id}/messages` | `MessageCreate` | Appends message to immutable timeline |
| `PUT` | `/api/messages/{id}` | Any | **BLOCKED (HTTP 405)**: Messages are immutable |
| `DELETE`| `/api/messages/{id}` | Any | **BLOCKED (HTTP 405)**: Messages are immutable |
| `POST` | `/api/commitments/{id}/confirm` | None | One-tap confirmation of detected commitment |
| `POST` | `/api/outbox/approve` | `OutboxApproveRequest` | Checks safety rules, queues/sends pitch, starts 7d clock |
| `POST` | `/api/mark-sent` | `{"id": 4, "channel": "whatsapp"}` | Records live dispatch from cockpit automations |
| `POST` | `/api/mark-unreachable` | `{"id": 4, "reason": "..."}` | Triggers automatic channel fallback (WA -> IG -> Email) |

### 5. Public Demo Engine & Telemetry
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/public/demo/{slug}` | Serves clinic package JSON (enforces 7-day link expiration) |
| `POST` | `/api/public/track` | Logs section views, design choices, and WA taps; updates intent score |
| `POST` | `/api/tracking/event` | Alias for `/api/public/track` |

### 6. Pipeline, Autopilot & Cockpit
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/runs` | Returns recent Autopilot discovery run logs |
| `POST` | `/api/autopilot/trigger-refill` | Triggers 7-step refill batch and link verification |
| `POST` | `/api/autopilot/verify-links` | Verifies HTTP 200 on ready demo packages |
| `GET` | `/api/batch` | Feeds ready clinic packages to outreach automations |

### 7. AI Autonomous Agents
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/agents/scout/run` | Discovers no-website clinics and enriches doctor profiles |
| `POST` | `/api/agents/auditor/run` | Verifies all demo routes & attaches video walkthroughs |
| `POST` | `/api/agents/closer/run` | Dispatches outreach via Playwright and drafts hot follow-ups |

### 8. Assistant & Telegram Console
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/assistant/ask-do` | In-app conversational queries (Ask) and CRM actions (Do) |
| `POST` | `/api/assistant/undo` | Reverts the last Do action with 1-click safety |
| `POST` | `/api/telegram/command` | Handles `/away`, `/off`, `/stock`, `/sprint`, `/log` |
| `POST` | `/api/problem-reports` | Context-rich sanitized debug reporting for Antigravity |

### 9. Real-Time Telemetry & SSE
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/events/stream` | Server-Sent Events stream for live CRM updates |
| `GET` | `/api/terminal/logs` | Returns recent execution terminal logs |
