/**
 * The Playwright Test settings for the journeys check (checks/journeys.ts): the
 * journeys in journeys/, headless, one at a time, in the system's Google Chrome.
 * The check sets VERIFY_BASE_URL (the Verifier's own herald), VERIFY_JOURNEY_DIR
 * (the journeys' Evidence folder) and VERIFY_CHROME. This is the only file that
 * imports @playwright/test; tsconfig leaves it out until the package is installed.
 */
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

const evidence = process.env.VERIFY_JOURNEY_DIR ?? join("verifier", "journeys-out");

export default defineConfig({
  testDir: "journeys",
  testMatch: "*.journey.ts",
  workers: 1,
  /** Each expect waits this long: under `next dev` a route is compiled the first time it is opened. */
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: join(evidence, "report") }]],
  outputDir: join(evidence, "results"),
  use: {
    baseURL: process.env.VERIFY_BASE_URL,
    headless: true,
    channel: "chrome",
    /** The check's Chrome path wins over the channel's lookup, so the run uses the Chrome the check checked for. */
    launchOptions: { executablePath: process.env.VERIFY_CHROME },
    screenshot: "on",
    trace: "retain-on-failure",
  },
});
