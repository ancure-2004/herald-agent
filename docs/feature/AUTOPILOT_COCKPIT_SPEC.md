# Autopilot Cockpit Specification & System Architecture
**Personal OS & CRM - Autonomous Factory Control Room**

---

## 1. Executive Vision & Surface Separation

The system is strictly divided into two distinct operating surfaces accessible from the persistent top navigation bar:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  CustomerGo   │  [ 📊 Operations Hub ]   │  [ ⚡ Autopilot Cockpit ● ACTIVE ] │            ⌘K  │ 🌙 │ 🔔 │ 👤 Captain │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Surface A: Operations Hub (Founder Decision & Workflow Space)**
   - **Dashboard**: Restored clean executive overview (Stock buffer health ring, warm-up channel meters, Day mode switcher, and Active Priority Clinics table). Zero autopilot logs or runner noise.
   - **Pipeline Board**: Drag-and-drop Kanban board with nested Smart Queues (Review Tray, Due Today, Hot Intent, Active Replies, Archived).
   - **Leads Table**: Comprehensive spreadsheet for deep multi-attribute inspection.
   - **Evening Sprint**: Focused 60-75 minute daily closing queue scored strictly by Expected Value per Minute.
   - **Operations Assistant**: Lightweight RAG assistant for operational queries, lead status lookup, and simple record moves.

2. **Surface B: Autopilot Cockpit (Autonomous Factory & Transparency Space)**
   - A dedicated control room split into two primary operational sub-pages:
     - **Page 1: 🏭 Lead Pipeline Factory** (Visual n8n pipeline, live terminal, structured end results, node output/error inspection, editable target counts, and the Autonomous Factory Supervisor Agent).
     - **Page 2: 🚀 Outreach Hub** (Multi-channel outreach telemetry tailored to the Dental Clinic protocol with WhatsApp + Email primary, Instagram fallback only, and a dedicated outreach terminal).

---

## 2. Page 1: Lead Pipeline Factory

### 2.1 Complete Visual Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ⚡ AUTOPILOT COCKPIT   │  [ 🏭 1. Lead Pipeline Factory (Active) ]  │  [ 🚀 2. Outreach Hub ]                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎯 FACTORY RUNNER CONTROLS                                                                                       │
│ Target Leads Needed: [ 25 ▼ ]   Locality: [ Delhi NCR / Noida ▼ ]   Mode: [ Strict No-Website ]                   │
│ [ 🔄 Verify Links ]   [ ⏹ Stop Pipeline ]   [ ▶ RUN REFILL BATCH (25 Leads) ]                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔗 VISUAL n8n-STYLE PIPELINE (Interactive Node Network)                                                          │
│                                                                                                                  │
│  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐   │
│  │ 1. DISCOVERY     │ ────► │ 2. VERIFICATION  │ ────► │ 3. DEEP RESEARCH │ ────► │ 4. NEXT.JS BUILD │ ┐ │
│  │ Google Places/   │ ~~~~~ │ HTTP Probes +    │ ~~~~~ │ Practo + J-Dial  │ ~~~~~ │ 3 Live Templates │ │ │
│  │ Serper Maps      │ (flow)│ Brave Search     │ (flow)│ Doctor & IG      │ (flow)│ Modern,Warm,Lux  │ │ │
│  │ Status: SUCCESS  │       │ Status: RUNNING  │       │ Status: QUEUED   │       │ Status: QUEUED   │ │ │
│  │ [✓ 25 Found]     │       │ [● Probing (14)] │       │ [0 Pending]      │       │ [0 Pending]      │ │ │
│  │ (Click to View)  │       │ (Click to View)  │       │ (Click to View)  │       │ (Click to View)  │ │ │
│  └──────────────────┘       └──────────────────┘       └──────────────────┘       └──────────────────┘ │ │
│                                                                                                        │ │
│                             ┌──────────────────┐       ┌──────────────────┐                            │ │
│                             │ 6. REVIEW TRAY   │ ◄──── │ 5. WALKTHROUGH   │ ◄──────────────────────────┘ │
│                             │ Sealed & Staged  │ ~~~~~ │ Headless MP4     │                              │
│                             │ Ready for Pitch  │ (flow)│ Video Recorder   │                              │
│                             │ Status: QUEUED   │       │ Status: QUEUED   │                              │
│                             │ [8 in Buffer]    │       │ [0 Pending]      │                              │
│                             │ (Click to View)  │       │ (Click to View)  │                              │
│                             └──────────────────┘       └──────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ 💻 PIPELINE TERMINAL (Server-Sent Events: /api/events/stream)    │ 📋 BATCH END RESULTS & STRUCTURED OUTPUTS     │
│ Auto-Scroll: [ON]  Filter: [ALL]      [ Copy Logs ] [ Clear ]    │ Direct high-level summary of latest execution │
├──────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ [00:44:10] [SCRAPE] Querying Google Places: Sector 76 Noida...   │ Run ID: #run-89 (Triggered: 2m ago)           │
│ [00:44:14] [FOUND] 6 candidate dental clinics identified         │ Status: 🟢 IN PROGRESS (Stage 2: Verification)│
│ [00:44:15] [PROBE] Checking website for "Dr Jha Dental Studio"   │ ───────────────────────────────────────────── │
│ [00:44:16] [OK]    Verified: No mobile responsive website (404)  │ • Target Requested: 25 leads                  │
│ [00:44:18] [AUDIT] Crawling Practo & Justdial for Dr credentials │ • Candidate Leads:  25 found                  │
│ [00:44:21] [BUILD] Scaffolding Next.js templates for clinic slug │ • Verified No-Site: 14 passed (3 dropped)     │
│ [00:44:24] [OK]    Modern (200), Warm (200), Premium (200)       │ • Research Dossiers: 11 enriched              │
│ [00:44:28] [VIDEO] Playwright recording 45s mobile walkthrough.. │ • Multi-Demos Built: 8 ready                  │
│ [00:44:35] [HOT]   Package sealed! Moved to Review Tray (ID: 14) │ • Review Tray Ready: 8 in buffer              │
│                                                                  │ ───────────────────────────────────────────── │
│                                                                  │ 🔍 Recent Verified Lead Payload:              │
│                                                                  │ Dentique Dental & Implant Centre              │
│                                                                  │ Dr. Rajeev Verma • Sec 76 Noida               │
│                                                                  │ [🔗 Modern (200)] [🔗 Warm (200)] [🔗 Lux (200)]│
└──────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🤖 COCKPIT FACTORY SUPERVISOR AGENT (Autonomous Pipeline Controller)                                              │
│ Mode: [AUTONOMOUS SUPERVISOR] • Status: MONITORING PIPELINE • Auto-Retry on Failures: ON                         │
│ [ Chat / Instruct Agent...                                                    ] [ Send Command ] [ Emergency Stop ] │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Interactive Node Drill-Down Drawer (Click to Inspect)

Clicking any node card in the visual pipeline opens an **Inspection Slide-Over Drawer**:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 NODE INSPECTION: [ 2. VERIFICATION (HTTP & Search) ]  ✕  │
├─────────────────────────────────────────────────────────────┤
│ Status: RUNNING (Item 14 of 25) • Started: 42s ago          │
│ Stage Logic: Probes domain HTTP status + checks Brave Search │
│                                                             │
│ ┌─ LIVE OUTPUT PAYLOAD ───────────────────────────────────┐ │
│ │ [                                                       │ │
│ │   {                                                     │ │
│ │     "clinic": "Dr Jha Dental Studio",                   │ │
│ │     "domain": "http://drjhadental.in",                  │ │
│ │     "http_status": 404,                                 │ │
│ │     "has_mobile_site": false,                           │ │
│ │     "verdict": "PASSED_NO_WEBSITE"                      │ │
│ │   },                                                    │ │
│ │   {                                                     │ │
│ │     "clinic": "Apollo White Dental",                    │ │
│ │     "domain": "https://apollowhite.com",                │ │
│ │     "http_status": 200,                                 │ │
│ │     "verdict": "DROPPED_ACTIVE_CHAIN"                   │ │
│ │   }                                                     │ │
│ │ ]                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ ERROR & EXCEPTION TRACE (If Node Fails) ───────────────┐ │
│ │ Error: None (Stage healthy)                             │ │
│ │ If Error Occurs:                                        │ │
│ │ - Exact Exception name & Line number                    │ │
│ │ - HTTP Response code (e.g. 429 Rate Limit)              │ │
│ │ - [ 🔄 Retry This Node ]  [ ⏭ Skip & Continue ]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [ ⚡ Run Only This Step ]       [ ⏸ Pause Node Execution ]  │
└─────────────────────────────────────────────────────────────┘
```

#### Node Inspection Capabilities:
1. **Live Intermediate Output**: See the raw JSON array of records processed by this exact node in real-time.
2. **Failure & Error Diagnostics**: If a node turns red (fails), clicking it reveals the exact exception, failed clinic payload, and an instant **"Retry Node"** trigger.
3. **Manual Trigger**: Can execute a single node in isolation for testing.

---

### 2.3 Editable Batch Lead Target

Right on the factory runner control header:
* An interactive input / selector: `Target Leads Needed: [ 10 | 25 | 30 | Custom... ]`.
* Passing this parameter into `/api/pipeline/run?target_count=25` ensures the scraper only searches until the requested quota of qualified leads is fulfilled.

---

### 2.4 Cockpit Factory Supervisor Agent (Dedicated Agent Space)

Distinct from the simple Common Dashboard Assistant:
* **Role**: Powerful autonomous supervisor that monitors pipeline execution, auto-recovers from transient errors (rate limits, network timeouts), and can start, pause, or abort pipeline stages.
* **UI Space**: A dedicated bottom bar / docked agent drawer inside the Cockpit with real-time intent status:
  * "Monitoring Step 2... 14 clinics verified."
  * "Warning: Serper API returned 429 rate limit. Switching automatically to Brave Search fallback."
  * "Step 4 complete. 18 live Next.js demo packages built and validated."

---

## 3. Page 2: Outreach Hub

### 3.1 Dental Clinic Multi-Channel Architecture

Strictly aligned with the Dental Clinic operating protocol:
1. **Priority #1: WhatsApp (`wa_autopilot.mjs`)**
   - High conversion channel. Dispatches personalized video demo message directly to the doctor's verified WhatsApp number.
   - Pacing: 4-7 minute randomized jitter delay to stay strictly within daily safety caps (20/day).
2. **Priority #2: Cold Email (`email_autopilot.py`)**
   - Professional multi-template choice page sent to clinic contact address.
   - Pacing: 2 minute spacing, max 30/day.
3. **Fallback Channel: Instagram DM (`ig_autopilot.mjs`)**
   - **Trigger Invariant**: ONLY triggers when WhatsApp delivery fails (e.g. phone number is a landline, invalid, or lacks WhatsApp registration).
   - If WhatsApp succeeds, Instagram DM is never sent.

```
┌─────────────────────────────────┬─────────────────────────────────┬──────────────────────────────────────────────┐
│ 🟢 WHATSAPP (Priority #1)       │ 🔵 COLD EMAIL (Priority #2)     │ 🟣 INSTAGRAM DM (Fallback Only)              │
├─────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────────┤
│ Status: ACTIVE (Window Open)    │ Status: ACTIVE (Domain Warmed)  │ Status: STANDBY (Fallback Rule)              │
│ Quota: 8 / 20 Sent Today        │ Quota: 4 / 30 Sent Today        │ Quota: 1 / 15 Sent Today                     │
│ [████████░░░░░░░░░░░░] 40%      │ [████░░░░░░░░░░░░░░░░] 13%      │ [██░░░░░░░░░░░░░░░░░░] 6%                    │
│ Delay Between Sends: 4-7 mins   │ Delay Between Sends: 2 mins     │ Rule: Triggered ONLY on WA failure           │
│ Current Target: Prime Dental    │ Current Target: Dr Pratibha     │ Last Trigger: WA number was landline         │
│ Action: Outbound pitch with demo│ Action: Follow-up email sent    │ Fallback Lead: Apex Dental (@apexdental)     │
└─────────────────────────────────┴─────────────────────────────────┴──────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 💬 OUTREACH DISPATCH TERMINAL (Real-time Messaging Logs & Webhook Confirmations)                                │
│ Auto-Scroll: [ON]  Channel: [ALL]                                                 [ Copy Logs ] [ Clear Buffer ] │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [00:45:01] [WA]     Preparing outreach payload for "Dentique Dental" (Dr. Rajeev Verma, +91 98112XXXXX)...       │
│ [00:45:02] [WA]     Attaching demo preview link: localhost:3001/modern/dentique-dental                           │
│ [00:45:05] [WA]     [DELIVERED] Message delivered to WhatsApp recipient. Status: HTTP 200                       │
│ [00:45:06] [DB]     Lead #10 stage updated: "Package Ready" -> "Pitch Sent". Next action due in 2 days.         │
│ [00:45:10] [EMAIL]  Dispatching intro email to info@primedental.com with 3-design choice page link...            │
│ [00:45:12] [EMAIL]  [SENT] SMTP accepted for delivery (Message-ID: <prime.0921@sidehustle.com>)                 │
│ [00:45:15] [WA]     Attempting WhatsApp dispatch for "Apex Dental Care" (+91 11 2618XXXX)...                     │
│ [00:45:17] [WA-ERR] Recipient is a landline/unregistered number. WhatsApp delivery failed!                       │
│ [00:45:18] [FALLBACK] Triggering Instagram fallback protocol for @apexdental_official...                         │
│ [00:45:22] [IG]     [DELIVERED] Instagram DM sent successfully with mobile walkthrough video!                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Plan & Crew Assignment

To execute this specification cleanly without breaking any existing functionality:

* **Branch**: `feature/autopilot-cockpit-overhaul` (branched fresh from `main`).
* **Subagent 1 (Frontend Developer)**:
  * Clean up `DashboardView.tsx` (remove noisy frankenstein preview cards, restore pristine executive layout).
  * Build the dual-subpage Cockpit inside `AutopilotCockpitView.tsx` (Sub-tab 1: Pipeline Factory, Sub-tab 2: Outreach Hub).
  * Build the interactive n8n node component with error/output inspection slide-over drawer.
  * Implement the editable lead target count input and separate dedicated terminals.
  * Scaffold the Cockpit Factory Supervisor Agent UI space.
* **Subagent 2 (Reviewer & Tester)**:
  * Audit in Chrome DevTools: click every node, test drawer slide-out, verify editable lead target count, test switching between Pipeline Factory and Outreach Hub, and verify responsive styling with 0 errors.

---
*Document approved and ratified for immediate implementation.*
