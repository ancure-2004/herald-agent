# Product Vision, UI Specification & Next-Gen Roadmap
**Personal OS & CRM - Side Hustle Operating System**

---

## 1. Executive Summary

This specification defines the product enhancements, UX architecture, and interface design for **Personal OS & CRM**. 

As daily lead volume scales to **25 qualified clinics per day (~750 per month)**, the CRM shifts from a static spreadsheet-style tracker to an **autonomous dual-surface control room**:
1. **Command Dashboard**: High-level KPI control, daily sprint tasks, review tray, and smart-filtered Kanban.
2. **Autopilot Cockpit**: Live interactive n8n-style visual pipeline, real-time terminal stream, and multi-channel outreach engine.
3. **Chat-Centric Lead Modal**: Conversational messaging timeline, inline objection-copilot recommendations, and an Autopilot-vs-Manual dispatch toggle.

---

## 2. Dual-Dashboard Architecture

The application interface is split into two primary, dedicated tabs at the top navigation bar:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Personal OS & CRM   │  [ 📊 Command Dashboard ]  │  [ ⚡ Autopilot Cockpit ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Command Dashboard (Decision & High-Level Control)
- **Top Metric Strip**:
  - Ready Stock Buffer (Current vs Required days).
  - Active Pipeline Leads (broken down by stage).
  - Today's Channel Senders (WhatsApp / Instagram / Email vs Daily Caps).
  - Day Mode Indicator (`Normal` / `Away` / `Off`).
- **Evening Sprint Panel**:
  - Prioritized to-do list sorted by expected value per minute:
    $$\text{Priority Score} = \frac{\text{Close Probability} \times \text{Deal Value INR}}{\text{Estimated Minutes}}$$
  - Bounded to the operator's time budget (e.g. 60-75 mins).
- **Smart-Filtered Kanban Board**:
  - Eliminates the cognitive overload of displaying 750 cards simultaneously.
  - Defaults to targeted **Smart Views**:
    - *Review Tray*: Packages ready for approval & dispatch.
    - *Due Today / Overdue*: Tasks requiring action today.
    - *Hot Demo Viewers*: Leads with `intent_score >= 40` (opened demos, explored sections, selected layouts).
    - *Active Inbound Replies*: Leads in `replied` or `warm` state.

---

### Tab 2: Autopilot Cockpit (Transparency, Pipeline & Outreach)

The Cockpit provides 100% operational transparency into what the autonomous agents are doing at any second.

#### A. n8n-Style Animated Pipeline Cards
The end-to-end client factory is displayed as connected, animated node cards. When a step runs, its node pulses with an active glow; upon completion, it displays a green checkmark and triggers the next step with an animated flowing connection:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Discovery    │ ────► │ 2. Verification │ ────► │ 3. Research     │ ────► │ 4. Engine Build │ ────► │ 5. Walkthrough  │
│ Google Places   │       │ No-Website Check│       │ Doctor & Facts  │       │ 3 Next.js Demos │       │ MP4 Video Rec   │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Step 1: Discovery**
   - Queries Google Places / Maps for clinics in targeted localities (e.g. Delhi NCR, Noida, Gurgaon).
   - Filters out chains and clinics that already have established online marketing teams.
2. **Step 2: No-Website Verification**
   - Runs Brave Search and HTTP probes to guarantee the clinic has no existing website or only a broken link.
3. **Step 3: Deep Research & Dossier Creation**
   - Discovers lead doctor name, degrees, Instagram handle, and primary WhatsApp contact.
   - Cross-verifies clinic facts across 2+ distinct sources (Practo, JustDial, Google Maps).
4. **Step 4: Dental Studio Engine Scaffolding**
   - Automatically scaffolds clinic data into the 3 Next.js demo templates:
     - Modern Studio
     - Warm Family Care
     - Luxury Implant Center
   - Generates the interactive Choice Page (`/demo/[slug]`).
5. **Step 5: Automated Walkthrough Video Recording**
   - Headless Playwright script scrolls through the 3 live demo layouts on mobile viewport and records an MP4 walkthrough.
   - Marks the package `ready_for_review` and places it into the Review Tray.

#### B. Live Execution Terminal
- Embedded terminal console at the bottom of the Cockpit.
- Subscribed to the backend Server-Sent Events (`/api/events/stream`).
- Features: Auto-scroll toggle, clear buffer button, severity color tags (`[INFO]`, `[SUCCESS]`, `[ERROR]`, `[HOT-ALERT]`), and copy-log button.
- Full transparency into API rate limits, HTTP status codes, and scrapers.

#### C. Multi-Channel Outreach Automation Tray
- Live telemetry for the 3 outreach channels:
  - **WhatsApp Bot** (`wa_autopilot.mjs`)
  - **Instagram DM Bot** (`ig_autopilot.mjs`)
  - **Email Bot** (`email_autopilot.py`)
- Cards show: Current clinic being contacted, active channel, daily send count vs cap, and fallback status (e.g. WA unreachable -> auto-switched to Instagram).

---

## 3. Chat-Centric Lead Detail Modal

Instead of a plain form or cluttered tabs, opening a lead launches a modern, two-column interactive operations modal:

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│              LEFT: CHAT & OUTREACH            │          RIGHT: CLINIC DOSSIER & NEXT STEP    │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ [Message Timeline]                            │ Clinic Name: Dentique Dental & Implant Centre │
│ ───────────────────────────────────────────── │ Doctor: Dr. Rajeev Verma                      │
│ Outbound: Hi Doctor, here are your 3 demos... │ Locality: Sector 76, Noida                    │
│ Inbound: Price kitna hai?                     │ Phone: +91 98112 XXXXX (Verified)             │
│                                               │ Instagram: @dentiquedental (Verified)         │
│ ───────────────────────────────────────────── │                                               │
│ [AI Copilot Suggestions]                      │ [3 Live Demo Previews]                        │
│ 💡 "Namaste Dr. Verma, our complete 3-page... │ 🔗 Modern: localhost:3001/demo/dentique/1     │
│ 💡 "Sir, we offer zero upfront setup..."      │ 🔗 Warm:   localhost:3001/demo/dentique/2     │
│                                               │ 🔗 Luxury: localhost:3001/demo/dentique/3     │
│ ───────────────────────────────────────────── │                                               │
│ Mode: [● Autopilot ON / OFF]                  │ [Next Action Lock-Step]                       │
│ [ Send Selected Reply ]                       │ Action: Follow up on WhatsApp after OPD       │
│                                               │ Due: Tomorrow, 7:00 PM                        │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Key Modal Capabilities
1. **WhatsApp / Chat History View**:
   - Inbound doctor messages and outbound pitches presented in conversational chat bubbles.
   - Distinct tags for channel (`WhatsApp`, `Instagram`, `Email`, `Phone Call`).
2. **Inline Copilot Recommendations**:
   - Evaluates inbound doctor sentiment (`interested`, `price_question`, `not_now`, `stop`).
   - Surfaces 2-3 personalized, pre-rendered response templates referencing the doctor's name, clinic locality, and chosen layout.
3. **Autopilot vs. Manual Permission Toggle**:
   - **Autopilot ON**: Clicking a suggested response sends it immediately through the background agent.
   - **Autopilot OFF**: Clicking a response launches WhatsApp Web in a new tab with the phone number and pre-filled message, allowing the captain to review, tweak, and hit send manually.
4. **Mandatory Next-Action Lock**:
   - Enforces the core CRM invariant: completing a task or sending a message requires scheduling the next follow-up date and action.

---

## 4. Scalability at 25 Leads/Day (750/Month)

| Operational Challenge | Architectural Solution |
| :--- | :--- |
| **Kanban Clutter** | Kanban displays only active, in-flight stages (`Package Ready`, `Contacted`, `Viewed Demo`, `Replied`). Archived, won, lost, and raw discovery leads are hidden behind dedicated Smart Views. |
| **WhatsApp Rate Limits** | Daily channel safety caps (20 sends/day/channel). Once hit, outbox items are safely queued for the next normal day. |
| **Link Expiry** | 7-day expiration timer starts automatically on the day of pitch send. Expired links return HTTP 410 with a friendly WhatsApp reconnect prompt. |
| **Double Contacting** | Phone numbers and Instagram handles are normalized and strictly enforced unique across the database. |
