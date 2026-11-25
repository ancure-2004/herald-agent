/**
 * The two screens the load check times (checks/load.ts), in headless Chrome:
 * the Overview and the Leads Table. Each is loaded once (the warm-up, not
 * timed), then loaded again and timed. A timed load starts when its own action
 * starts (the Leads Table's starts at the click on the sidebar's Leads Table
 * button, with the Overview already loaded), and ends at the later of two
 * moments: the page shows the screen's marker, and the last /api request in
 * flight finished. The quiet window that proves no request is left is waited
 * for, but not counted. Each screen's time, and whether it finished within its
 * hard limit (verifier/load-limits.ts), goes to VERIFY_LOAD_DIR/screens.json
 * after that screen, so a Playwright timeout keeps the earlier screens. The
 * test always passes: the check judges the times (fast, slow, broken), so a
 * slow or broken screen is reported, not hidden.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";
import { loadLimits } from "../load-limits.ts";

/** The first load may compile a route under `next dev`: the warm-up gets the navigation limit, not the screen's hard limit. */
const WARM_UP_MS = 120_000;

/** How long the page must have no /api request in flight before a load counts as done. */
const QUIET_MS = 500;

/** The Leads Table's marker: its first column header. */
const LEADS_MARKER = "Clinic & Doctor";

/** One screen's result, as the check reads it. */
type Timing = { screen: string; ms: number; ok: boolean; error?: string };

/** The page's /api requests: the ones in flight, and when the last one finished. `restart` moves that clock to now (a timed load starts). */
type Tracker = { pending: Set<Request>; lastDone: number; restart: () => void };

/** An /api request the page makes while loading (the live event stream is not one: it never ends). */
function isLoadRequest(url: string): boolean {
  return /\/api\//.test(url) && !/\/api\/events/.test(url) && !/\/terminal\//.test(url);
}

/** Track the page's in-flight /api requests and the moment the last one finished. */
function trackRequests(page: Page): Tracker {
  const pending = new Set<Request>();
  const tracker: Tracker = { pending, lastDone: Date.now(), restart: () => (tracker.lastDone = Date.now()) };
  page.on("request", (r) => {
    if (isLoadRequest(r.url())) pending.add(r);
  });
  const done = (r: Request) => {
    if (pending.delete(r)) tracker.lastDone = Date.now();
  };
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return tracker;
}

/** Milliseconds left until a deadline (at least 1, so a Playwright time-out is never zero). */
function left(deadline: number): number {
  return Math.max(1, deadline - Date.now());
}

/** Wait until no /api request has been in flight for QUIET_MS, or throw once the deadline has passed. */
async function settle(tracker: Tracker, deadline: number): Promise<void> {
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    if (tracker.pending.size > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= QUIET_MS) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("requests still in flight at the time limit");
}

/** The sidebar's Leads Table button: the marker that the Overview has shown. */
function sidebarButton(page: Page) {
  return page.getByRole("button", { name: "Leads Table", exact: true });
}

/** A screen the check times: what it does before its timed load (untimed) and the timed action, which returns when the marker was seen. */
type Screen = {
  label: string;
  prepare: (page: Page, tracker: Tracker, deadline: number) => Promise<void>;
  open: (page: Page, deadline: number) => Promise<number>;
};

/** The screens in the order they are timed. */
const SCREENS: Screen[] = [
  {
    label: "Management Overview",
    /** Nothing to set up: the timed load is the navigation itself. */
    prepare: async () => {},
    open: async (page, deadline) => {
      await page.goto("/", { timeout: left(deadline), waitUntil: "load" });
      await expect(sidebarButton(page)).toBeVisible({ timeout: left(deadline) });
      return Date.now();
    },
  },
  {
    label: "Leads Table",
    /** The Overview, loaded and settled, so its requests are not counted in the Leads Table's time. */
    prepare: async (page, tracker, deadline) => {
      await page.goto("/", { timeout: left(deadline), waitUntil: "load" });
      await expect(sidebarButton(page)).toBeVisible({ timeout: left(deadline) });
      await settle(tracker, deadline);
    },
    /** The timed part: the click on the sidebar's Leads Table button, until its column header shows. */
    open: async (page, deadline) => {
      await sidebarButton(page).click({ timeout: left(deadline) });
      await expect(page.getByRole("columnheader", { name: LEADS_MARKER, exact: true })).toBeVisible({ timeout: left(deadline) });
      return Date.now();
    },
  },
];

/** The error text of anything thrown, its first line (a Playwright error runs on for many lines). */
function firstLine(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "";
}

test("the Overview and the Leads Table load and are timed", async ({ page }) => {
  const dir = process.env.VERIFY_LOAD_DIR ?? join(import.meta.dirname, "..", "load-out");
  const tracker = trackRequests(page);
  const timings: Timing[] = [];
  const write = () => writeFileSync(join(dir, "screens.json"), JSON.stringify(timings, null, 2));
  for (const screen of SCREENS) {
    const hardMs = loadLimits(process.env).screens.find((s) => s.label === screen.label)!.limits.hardMs;
    /** The warm-up: the same load, untimed, with one shared budget. */
    const warm = Date.now() + WARM_UP_MS;
    try {
      await screen.prepare(page, tracker, warm);
      await screen.open(page, warm);
      await settle(tracker, warm);
    } catch (error) {
      timings.push({ screen: screen.label, ms: 0, ok: false, error: `warm-up failed: ${firstLine(error)}` });
      write();
      continue;
    }
    /** The timed load: the preparation is untimed; the clock starts at the timed action and ends when the marker and the last request are both done. */
    let started = Date.now();
    try {
      await screen.prepare(page, tracker, Date.now() + hardMs);
      tracker.restart();
      started = Date.now();
      const marker = await screen.open(page, Date.now() + hardMs);
      await settle(tracker, Date.now() + hardMs);
      timings.push({ screen: screen.label, ms: Math.max(marker, tracker.lastDone) - started, ok: true });
    } catch (error) {
      timings.push({ screen: screen.label, ms: Date.now() - started, ok: false, error: firstLine(error) });
    }
    write();
  }
});
