---
name: Personal OS & CRM
description: High-density autonomous control room and CRM for high-volume service side hustles
colors:
  primary: "#6366f1"
  primary-hover: "#4f46e5"
  secondary: "#818cf8"
  accent: "#f59e0b"
  accent-hover: "#d97706"
  success: "#10b981"
  destructive: "#ef4444"
  dark-bg: "#0b0c10"
  dark-surface: "#0f1117"
  dark-card: "#141721"
  dark-card-border: "rgba(255, 255, 255, 0.08)"
  dark-border: "#202538"
  dark-text: "#f8fafc"
  dark-text-muted: "#94a3b8"
  light-bg: "#faf8f5"
  light-surface: "#ffffff"
  light-card: "#ffffff"
  light-card-border: "rgba(0, 0, 0, 0.08)"
  light-border: "#e2e8f0"
  light-text: "#0f172a"
  light-text-muted: "#64748b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card-standard:
    backgroundColor: "{colors.dark-card}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Personal OS & CRM

## Overview

**Creative North Star: "The Obsidian Flight Deck"**

Personal OS & CRM is an executive control room and autonomous factory for high-velocity solo operators. It balances information density with visual calm: high-contrast dark surfaces evoke aviation glass cockpits, rich indigo accents guide operational focus, and warm amber highlights urgent action items.

The aesthetic combines crisp data geometry with subtle atmospheric depth. Soft frosted glass backdrops (`backdrop-blur-md`), precise hairline borders (`border-white/[0.08]`), and tactile pill badges give every metric, pipeline node, and chat bubble an unmistakable physical hierarchy. Light mode is supported as a warm parchment companion ("CustomerGo Warm Paper") retaining identical layout structure and semantic accents.

**Key Characteristics:**
- High-density information architecture without clutter
- Dark-by-default obsidian and slate foundation with high-contrast type
- Indigo primary focus with amber attention signals and emerald telemetry health indicators
- Rounded geometric silhouettes (`16px` cards, `24px` modal dialogs, `9999px` badges)
- Split typography: Plus Jakarta Sans for human UI and JetBrains Mono for machine telemetry and metrics

## Colors

The palette is tuned for high-contrast legibility across long working sessions.

### Primary
- **Electric Indigo** (`#6366f1` / `hover #4f46e5`): The primary interactive and focus color. Used for active navigation tabs, primary buttons, focus rings, and selection indicators.

### Secondary
- **Soft Periwinkle** (`#818cf8`): Secondary interactive accent, active badges, and subtle glows.

### Accent
- **Amber Gold** (`#f59e0b` / `hover #d97706`): Alerting, evening sprint highlights, overdue next actions, and hot lead tags.
- **Emerald Telemetry** (`#10b981`): Verified safe state, live SSE stream heartbeat, online autopilot status, and positive pipeline conversions.
- **Rose Destructive** (`#ef4444`): Unreachable contacts, failed HTTP probes, and do-not-contact flags.

### Neutral
- **Obsidian Dark Background** (`#0b0c10`): Canonical root dark canvas.
- **Dark Surface** (`#0f1117`): Header, sidebar, and elevated panel layer.
- **Dark Card** (`#141721`): Modular card and container background.
- **Dark Hairline Border** (`rgba(255, 255, 255, 0.08)` / `#202538`): Structural card edges and dividers.
- **Light Parchment Background** (`#faf8f5`): Canonical light canvas.
- **Light Surface / Card** (`#ffffff`): Crisp white elevated cards in light mode.

### Named Rules
**The Rarity of Amber Rule.** Amber is reserved for items requiring immediate human intervention (due today, overdue follow-ups, low stock warnings). When everything is amber, nothing is urgent.

**The Single Dark Canvas Rule.** All views, roots, and modals must anchor to `#0b0c10` background and `#0f1117` / `#141721` surfaces; one-off dark hex codes (`#0B0F19`, `#0E1017`, `slate-900`) are prohibited.

## Typography

**Display Font:** Plus Jakarta Sans (with system-ui fallback)
**Body Font:** Plus Jakarta Sans
**Label/Mono Font:** JetBrains Mono (with ui-monospace fallback)

**Character:** Modern geometric sans-serif with generous x-height and clear punctuation, paired with a monospaced font engineered for technical telemetry.

### Hierarchy
- **Display** (800 weight, 1.5rem / 24px, 1.2 line-height): Executive greetings and top-level cockpit headings.
- **Headline** (700 weight, 1.25rem / 20px, 1.3 line-height): Metric card values and section headers.
- **Title** (600 weight, 0.875rem / 14px, 1.4 line-height): Card titles, modal headers, and table column names.
- **Body** (500 weight, 0.75rem / 12px, 1.5 line-height): General UI copy, descriptions, and clinic metadata.
- **Label** (600 weight, 0.6875rem / 11px, 1.4 line-height): Numerical indicators, timestamps, status badges, and keyboard shortcuts.

### Named Rules
**The Telemetry Mono Rule.** All numbers, currency values (₹ INR), time durations, status codes, and terminal output must use JetBrains Mono.

## Layout

The application employs a fixed single-viewport architecture (`h-full w-full overflow-hidden`) where the global Header (`h-16`) remains pinned, the collapsible Sidebar (`w-64` expanded, `w-20` collapsed) remains pinned, and only the central `<main>` area scrolls vertically (`overflow-y-auto`).

### Grid and Rhythm
- Layout rhythm adheres strictly to an 8px grid (4px, 8px, 12px, 16px, 24px, 32px).
- Desktop (`>= 1024px`): Multi-column dashboards (e.g. 3-column KPI strip, 2-column modal layout).
- Mobile & Narrow Viewports (`< 768px`): Strict vertical stacking, zero horizontal document scrolling, and full-width drawer overlays.

## Elevation & Depth

Depth is achieved through tonal surface layering and translucent frosted glass rather than heavy dropped shadows.

### Shadow Vocabulary
- **Card Ambient** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)`): Grounded elevation for cards.
- **Indigo Glow** (`box-shadow: 0 0 20px -5px rgba(99, 102, 241, 0.25)`): Interactive focus and active tab glow.
- **Modal Elevation** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7)`): Top-level dialog separation.

### Named Rules
**The Flat Glass Rule.** Resting surfaces use subtle borders (`border-white/[0.08]`) and backdrops (`backdrop-blur-md`). Ambient shadows appear only on interactive elevation or modal overlays.

## Shapes

- **Card Silhouettes:** Rounded corners with `16px` (`rounded-2xl`) or `24px` (`rounded-3xl`) radius.
- **Inputs & Buttons:** Rounded with `8px` (`rounded-lg`) or `12px` (`rounded-xl`).
- **Pills & Avatars:** Fully rounded `9999px` (`rounded-full`).

## Components

### Buttons
- **Shape:** Rounded corners (`12px` / `rounded-xl` for primary action, `8px` / `rounded-lg` for utility buttons).
- **Primary:** Electric Indigo (`#6366f1`), white text, bold font, subtle shadow.
- **Secondary / Ghost:** Transparent or translucent slate (`hover:bg-white/[0.06]`), neutral text.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (`16px`) or `rounded-3xl` (`24px`).
- **Background:** Dark card `#141721` with border `border-white/[0.08]`.
- **Internal Padding:** `16px` to `20px` (`p-4` or `p-5`).

### Modals & Drawers
- **Container:** Centered or anchored overlay with `bg-black/70 backdrop-blur-sm` backdrop.
- **Dialog Surface:** `#141721` dark card, `border-white/[0.08]`, `rounded-3xl`, internal scroll boundary on content (`max-h-[85vh] overflow-y-auto`).

## Do's and Don'ts

### Do:
- **Do** use `JetBrains Mono` for all currency amounts, deal values, lead counters, and times.
- **Do** enforce internal scrolling (`overflow-y-auto`) on modal bodies while pinning header and action footers.
- **Do** maintain responsive padding: `p-4` on mobile scaling to `p-6` on desktop.
- **Do** wrap every card in hairline border `border-white/[0.08]` in dark mode and `border-slate-200/80` in light mode.

### Don't:
- **Don't** use raw uncalibrated hex colors (e.g. `#0B0F19` or `blue-600`) in component files.
- **Don't** permit horizontal scrolling on any view or modal at 390px, 768px, 1024px, or 1440px.
- **Don't** allow fixed modal heights (`h-[500px]`) that clip action buttons on small screens.
- **Don't** mix multiple conflicting card background colors on the same surface.
