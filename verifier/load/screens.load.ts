/**
 * The two screens the load check times (checks/load.ts), in headless Chrome:
 * the Overview and the Leads Table. Each is loaded once (the warm-up, not
 * timed), then loaded again and timed: a load ends when the page shows the
 * screen's own marker and no /api request is still in flight. Each time, and
 * whether it finished within its hard limit (verifier/load-limits.ts), goes to
 * VERIFY_LOAD_DIR/screens.json. The test always passes: the check judges the
 * times (fast, slow, broken), so a slow or broken screen is reported, not hidden.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";
import { loadLimits } from "../load-limits.ts";

/** The first load may compile a route under `next dev`: the warm-up gets the navigation limit, not the screen's hard limit. */
const WARM_UP_MS = 120_000;

/** How long the page must have no /api request in flight before a load counts as done. */
const QUIET_MS = 500;

/** One screen's result, as the check reads it. */
type Timing = { screen: string; ms: number; ok: boolean; error?: string };

/** The Leads Table's marker: its first column header. */
const LEADS_MARKER = "Clinic & Doctor";

/** An /api request the page makes while loading (the live event stream is not one: it never ends). */
function isLoadRequest(url: string): boolean {
  return /\/api\//.test(url) && !/\/api\/events/.test(url) && !/\/terminal\//.test(url);
}

/** Track the page's in-flight /api requests; the set is empty when none is in flight. */
function trackRequests(page: Page): Set<Request> {
  const pending = new Set<Request>();
  page.on("request", (r) => {
    if (isLoadRequest(r.url())) pending.add(r);
  });
  const done = (r: Request) => {
    pending.delete(r);
  };
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return pending;
}

/** Wait until no /api request has been in flight for QUIET_MS, or throw once `ms` has passed. */
async function settle(pending: Set<Request>, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    if (pending.size > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= QUIET_MS) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`requests still in flight after ${ms / 1000} s`);
}

/** One load of the Overview: open herald and wait for the sidebar's Leads Table button, then for the requests to settle. */
async function loadOverview(page: Page, pending: Set<Request>, timeout: number): Promise<void> {
  await page.goto("/", { timeout, waitUntil: "load" });
  await expect(page.getByRole("button", { name: "Leads Table", exact: true })).toBeVisible({ timeout });
  await settle(pending, timeout);
}

/** One load of the Leads Table: the Overview, then the sidebar's Leads Table button, then its column header and the settled requests. */
async function loadLeadsTable(page: Page, pending: Set<Request>, timeout: number): Promise<void> {
  await loadOverview(page, pending, timeout);
  await page.getByRole("button", { name: "Leads Table", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: LEADS_MARKER, exact: true })).toBeVisible({ timeout });
  await settle(pending, timeout);
}

/** The screens in the order they are timed, each with its load. */
const SCREENS: Array<{ label: string; load: (page: Page, pending: Set<Request>, timeout: number) => Promise<void> }> = [
  { label: "Management Overview", load: loadOverview },
  { label: "Leads Table", load: loadLeadsTable },
];

test("the Overview and the Leads Table load and are timed", async ({ page }) => {
  const dir = process.env.VERIFY_LOAD_DIR ?? join(import.meta.dirname, "..", "load-out");
  const hardMs = (label: string): number => loadLimits(process.env).screens.find((s) => s.label === label)!.limits.hardMs;
  const pending = trackRequests(page);
  const timings: Timing[] = [];
  for (const screen of SCREENS) {
    const started = Date.now();
    try {
      await screen.load(page, pending, WARM_UP_MS);
      const timed = Date.now();
      await screen.load(page, pending, hardMs(screen.label));
      timings.push({ screen: screen.label, ms: Date.now() - timed, ok: true });
    } catch (error) {
      timings.push({ screen: screen.label, ms: Date.now() - started, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  writeFileSync(join(dir, "screens.json"), JSON.stringify(timings, null, 2));
});
