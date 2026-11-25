/**
 * The Playwright Test settings for the journeys check (checks/journeys.ts): the
 * journeys in journeys/, headless, one at a time, in the system's Google Chrome.
 * The check sets VERIFY_BASE_URL (the Verifier's own herald), VERIFY_JOURNEY_DIR
 * (the journeys' Evidence folder) and VERIFY_CHROME. This file and the journeys
 * in journeys/ import @playwright/test; tsconfig includes them, so `npm test`
 * needs the package installed (`cd verifier && npm install`).
 */
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

const evidence = process.env.VERIFY_JOURNEY_DIR ?? join(import.meta.dirname, "journeys-out");

export default defineConfig({
  testDir: "journeys",
  testMatch: "*.journey.ts",
  workers: 1,
  /** One journey, at most: a missing element fails within the action and expect limits, not after the test limit. */
  timeout: 240_000,
  /** Each expect waits this long: under `next dev` a route is compiled the first time it is opened. */
  expect: { timeout: 30_000 },
  /** results.json is what the journeys check reads: which journeys passed and which were skipped (checks/journey-results.ts). */
  reporter: [["list"], ["html", { open: "never", outputFolder: join(evidence, "report") }], ["json", { outputFile: join(evidence, "results.json") }]],
  outputDir: join(evidence, "results"),
  use: {
    baseURL: process.env.VERIFY_BASE_URL,
    /** A click or fill that finds no element fails in 30 s; the first `next dev` page load may compile for minutes. */
    actionTimeout: 30_000,
    navigationTimeout: 120_000,
    headless: true,
    channel: "chrome",
    /** The check's Chrome path wins over the channel's lookup, so the run uses the Chrome the check checked for. */
    launchOptions: { executablePath: process.env.VERIFY_CHROME },
    screenshot: "on",
    trace: "retain-on-failure",
  },
});
