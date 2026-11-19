# Project Manifesto: Herald - Multi-Agent Operations Engine

> **Everything, handled automatically.**

## 1. Vision & Core Mission

**Herald** is an autonomous Multi-Agent Operations Engine engineered to free solo creators, agency founders, and high-velocity builders from repetitive operational drag.

Modern single-operator businesses face an operational bottleneck: customer discovery, lead qualification, collateral generation, cold outreach, follow-up scheduling, and context-switching across spreadsheets consume 80% of human attention. Herald flips this equation. It provides an autonomous execution cockpit that handles the entire pipeline—from discovering verified prospects and synthesizing customized demo assets to managing CRM pipeline stages and dispatching safe outreach—while keeping the human firmly in command.

---

## 2. Current State (v2.0)

Herald is battle-tested in a live production environment powering high-volume service acquisitions (specifically custom web presence for local healthcare practices):

- **Command Center & Flight Deck**: Real-time KPI health rings, urgent action queues, daily channel quota monitors, and a keyboard-first global command palette (`⌘K`).
- **Autopilot Cockpit**:
  - **Discovery Console**: Multi-tier waterfall search (Google Places API with QuotaGuard soft limits, OpenStreetMap Overpass, local cache), strict website/mobile phone verification, real-time funnel telemetry, and cross-process database-backed single-flight run locking.
  - **Demo Factory Console**: Automated multi-template code scaffolding (`Modern`, `Premium`, `Warm` Next.js demo sites), responsive multi-device preview drawer, and sequential 1-by-1 Playwright walkthrough video recording.
  - **Outreach Hub**: Database-persisted Dry/Safe Mode toggle, multi-channel dispatch (WhatsApp, Instagram, Email), and immutable safety invariants (daily limits, instant stop/DNC compliance, idempotency keys).
- **Agentic AI & MCP Suite**:
  - **Hybrid RAG Assistant**: Combines vector semantic embeddings with lexical search over operating knowledge, scripts, and lead facts in an "Ask & Do" copilot drawer.
  - **Model Context Protocol (MCP v2.0.0)**: 11 production-grade tools enabling autonomous coordination from external harnesses (Claude Desktop, Cursor, AGY).
- **Obsidian Flight Deck Design**: Pixel-perfect monochrome dark/light system with strict viewport confinement and zero horizontal document scrolling.

---

## 3. Product Roadmap & Future Horizon

### 3.1 Multi-Side-Hustle Architecture
- Expand the current single-hustle engine into a pluggable multi-tenant framework.
- Independent hustle profiles with dedicated discovery providers, collateral engines, custom pipeline stages, and channel limits.
- Instant workspace switching from the command palette or sidebar dock.

### 3.2 Social Media & Video Content Automation
- Extend the 1-by-1 recording engine into an autonomous social content pipeline.
- Automatic generation of vertical short-form video demos (TikTok, Instagram Reels, YouTube Shorts).
- Programmatic captioning, audio voiceover overlay via TTS, and scheduled posting queues.

### 3.3 Autonomous Personal Assistant & Executive Task Dispatcher
- Expanding beyond sales and acquisition into daily life operations: calendar scheduling, inbox prioritization, receipt/invoice parsing, and proactive reminder digests.
- Ambient background monitoring with Telegram bot push notifications for hot events and pending approvals.

### 3.4 Companion Mobile Application
- Dedicated iOS and Android companion app (React Native / Flutter or PWA) for on-the-go triage.
- Native push notifications for incoming prospect replies, urgent follow-ups, and one-tap outreach approvals.
- Offline-first cache for reviewing lead dossiers and playing walkthrough videos.

---

## 4. Operating Principles

1. **Human Sovereignty, Autonomous Execution**: Automation executes the heavy lifting, but critical actions (live messaging, destructive actions) respect explicit safety gates and clear operational modes.
2. **Deterministic Reliability Over Black Boxes**: Telemetry must be transparent. Every background step emits observable logs, traces, and metrics.
3. **Information Density Without Clutter**: High-contrast, keyboard-driven UI designed for speed, clarity, and zero visual friction.
4. **Idempotence & Safety Invariants**: Double-sends are impossible; active runs are single-flight protected; opt-out requests are respected immediately and permanently.

See [docs/vision.md](docs/vision.md) for the full long-term Herald Agent vision.
