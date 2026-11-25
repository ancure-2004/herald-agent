/**
 * The Playwright Test settings for the load check's screens (checks/load.ts):
 * load/*.load.ts, headless, one at a time, in the system's Google Chrome. The
 * check sets VERIFY_BASE_URL (the Verifier's own herald), VERIFY_LOAD_DIR (the
 * load folder in Evidence) and VERIFY_CHROME. This is not the journeys' config:
 * the journeys' files match *.journey.ts and this folder's *.load.ts.
 */
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

const evidence = process.env.VERIFY_LOAD_DIR ?? join(import.meta.dirname, "..", "load-out");

export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: "*.load.ts",
  workers: 1,
  /** Four loads, each at most its hard limit (30 s), plus the first compile: well inside this. */
  timeout: 300_000,
  reporter: [["list"]],
  outputDir: join(evidence, "results"),
  use: {
    baseURL: process.env.VERIFY_BASE_URL,
    headless: true,
    channel: "chrome",
    /** The check's Chrome path wins over the channel's lookup, as in playwright.config.ts. */
    launchOptions: { executablePath: process.env.VERIFY_CHROME },
    /** The warm-up load may compile a route under `next dev`, so it gets the journeys' navigation limit; the timed load is bounded by its own hard limit. */
    navigationTimeout: 120_000,
    screenshot: "off",
    trace: "off",
  },
});
