# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Internal single-operator (Captain / founder) managing multiple service side hustles (specifically Dental Clinic Websites). Daily high-intensity operational workflow. Desktop-first, with mobile requirements strictly bounded to no horizontal scroll and no unreachable interactive actions.

## Product Purpose
Autopilot-first operating system and CRM for high-volume service side hustles. Eliminates spreadsheet clutter as daily lead volume scales to 25 qualified leads/day (~750/month). Discovers qualified leads, verifies no existing websites, scaffolds 3-template Next.js demo websites, orchestrates multi-channel outreach (WhatsApp, Email, Instagram fallback), tracks demo viewer intent, and enforces strict lock-step next actions.

## Positioning
An autonomous dual-surface operations room combining an executive decision dashboard (Command Dashboard) and an autonomous pipeline execution factory (Autopilot Cockpit). Unlike generic CRMs or static spreadsheets, every active lead is bound to automated code scaffolding, verified proof packages, and daily channel safety limits.

## Operating Context
Daily operating environment:
- Desktop-first browser view used continuously throughout the operational day.
- Single-page application architecture with view transitions driven by CRMContext state (`dashboard`, `board`, `table`, `sprint`, `autopilot`, `settings`).
- Real-time Server-Sent Events (SSE) telemetry streaming from FastAPI backend to terminal and live metrics.
- Mobile access for quick status triage without horizontal scrolling or clipped modals.

## Capabilities and Constraints
- Stack: Next.js App Router (React 19), TypeScript, Tailwind CSS 3.4, framer-motion, lucide-react; backend is FastAPI with SQLite/Postgres.
- Hard constraints: Keep the existing stack, zero new dependencies in `frontend/package.json`, zero behavior or state changes (props, types, state, API contracts, command palette shortcuts, SSE hook, CRMContext logic remain identical).
- Primary pass scope: Visual consistency, padding/margin normalization, elimination of clipping and overflow in viewport shell and modals, token unification.

## Brand Commitments
- Dark-by-default control room aesthetic.
- Color identity: Deep obsidian/slate neutral foundations, Indigo primary brand accent, Amber warning/accent, Emerald success indicators.
- Typography: Plus Jakarta Sans for UI/display, JetBrains Mono for metrics, code, timestamps, and terminal output.

## Product Principles
1. Operator Focus: Optimize for high-clarity information density and keyboard-first speed without cognitive overload.
2. Unbroken Viewports: No clipped text, no hidden scrollbars, zero horizontal overflow across all responsive widths (1440px down to 390px).
3. Visual Cohesion: Single source of truth for color, spacing, radius, and elevation tokens across all views and modals.
4. Autonomous Transparency: Absolute visibility into background automation, pipeline step transitions, and error states.
