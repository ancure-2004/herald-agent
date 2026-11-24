/**
 * The journeys check: Playwright Test runs herald's journeys
 * (verifier/journeys/<feature id>.journey.ts) in the system's Google Chrome,
 * against the Verifier's own herald (started and stopped here, herald.ts). The
 * fast set is the journeys of the changed features; --full runs every journey.
 * With nothing to run it passes without starting herald. Missing Playwright or
 * Chrome cannot run (exit 2); a failing journey fails (exit 1), named by its
 * failing lines. Reads and runs only; the browser and Playwright are not paid.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { failureOutput, heraldMissing, launchHerald, readyLimits, stopHerald, type HeraldPorts, type Launch } from "../herald.ts";
import { signalChildGroup, trackGroup, type Server } from "../launch.ts";
import { readOutcomes, summarize } from "../journey-results.ts";

/** Where the journeys live, relative to herald's root; one file per feature, named <feature id>.journey.ts. */
const JOURNEY_DIR = "verifier/journeys";
const SUFFIX = ".journey.ts";

/** The file, in the journeys' Evidence folder, where Playwright writes its JSON report (playwright.config.ts). */
const RESULTS_FILE = "results.json";

/** The Playwright Test package and its program, installed by `cd verifier && npm install`. */
const PLAYWRIGHT_PACKAGE = "verifier/node_modules/@playwright/test";
const PLAYWRIGHT = "verifier/node_modules/.bin/playwright";
const CONFIG = "verifier/playwright.config.ts";
const SETUP = "cd verifier && npm install";

/** Where Google Chrome is expected; VERIFY_CHROME overrides it (the tests use this). */
const DEFAULT_CHROME = "/usr/bin/google-chrome";

/** How long the whole Playwright run may take before it is killed. */
const TIMEOUT_MS = 15 * 60 * 1000;

/** The journey files in verifier/journeys/, sorted, relative to herald's root; none when the folder is missing. */
export function journeyFiles(root: string): string[] {
  const dir = join(root, JOURNEY_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(SUFFIX))
    .sort()
    .map((name) => `${JOURNEY_DIR}/${name}`);
}

/** The feature a journey file belongs to: its file name minus `.journey.ts`. */
export function featureOf(file: string): string {
  return basename(file).slice(0, -SUFFIX.length);
}

/** The journeys this run runs: every file under --full or when every feature changed, else those of the changed features. */
function selectJourneys(ctx: CheckContext): string[] {
  const all = journeyFiles(ctx.root);
  if (ctx.full || ctx.changed.allFeatures) return all;
  return all.filter((file) => ctx.changed.features.includes(featureOf(file)));
}

/** Playwright's failure lines: each `  N) <journey and title>` header, and the first `Error` line after it. */
export function failureLines(output: string): string[] {
  const lines = output.split("\n");
  const picked: string[] = [];
  lines.forEach((line, i) => {
    if (!/^\s*\d+\) /.test(line)) return;
    picked.push(line.trim());
    const error = lines.slice(i + 1, i + 8).find((next) => /^\s*Error/.test(next));
    if (error) picked.push(error.trim());
  });
  return picked;
}

/** The outcome of one program run: its exit code (null when it was killed or never started), its output, and whether the time limit killed it. */
type Ran = { code: number | null; output: string; timedOut: boolean };

/**
 * Run a program in `cwd` with `env`, collecting its output. It leads its own
 * process group, so a time limit (or the end of the program) stops everything
 * it started, Chrome included, and an outside stop of the Verifier does too
 * (trackGroup). The group is killed once the program has exited, since a
 * background child would otherwise keep the output open.
 */
export function runProgram(program: string, args: string[], cwd: string, env: Record<string, string>, timeoutMs = TIMEOUT_MS): Promise<Ran> {
  return new Promise((resolve) => {
    const child = spawn(program, args, { cwd, env, detached: true });
    const untrack = trackGroup(child);
    let output = "";
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      signalChildGroup(child, "SIGKILL");
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      untrack();
      resolve({ code: null, output: output + error.message, timedOut: false });
    });
    child.on("exit", () => signalChildGroup(child, "SIGKILL"));
    child.on("close", (code) => {
      clearTimeout(timer);
      untrack();
      resolve({ code, output, timedOut });
    });
  });
}

/** Run the journey files under Playwright Test, against the herald frontend at `ports`; Evidence goes to `evidence`. */
function runJourneys(ctx: CheckContext, files: string[], ports: HeraldPorts, evidence: string, chrome: string): Promise<Ran> {
  const env = {
    ...ctx.env,
    VERIFY_BASE_URL: `http://127.0.0.1:${ports.frontend}`,
    VERIFY_JOURNEY_DIR: evidence,
    VERIFY_CHROME: chrome,
  };
  return runProgram(join(ctx.root, PLAYWRIGHT), ["test", ...files, "--config", CONFIG], ctx.root, env);
}

/**
 * The check's result for the journeys that ran: pass (naming what passed and
 * what was skipped, from Playwright's report at `resultsFile`), or fail naming
 * the failing lines, with the full output below them. A zero exit with no
 * report, or with no test in it, cannot run: nothing is proven.
 */
function verdict(base: { name: string; command: string; durationMs: number }, ran: Ran, resultsFile: string, notes: string[]): CheckResult {
  if (ran.code === 0 && !ran.timedOut) {
    const outcomes = readOutcomes(resultsFile);
    if (outcomes.length === 0) {
      return { ...base, status: "could-not-run", exitCode: null, output: notes.join("\n"), message: `playwright wrote no test results to ${resultsFile}` };
    }
    return { ...base, status: "pass", exitCode: 0, output: notes.join("\n"), message: summarize(outcomes) };
  }
  const named = failureLines(ran.output);
  const message = ran.timedOut ? "playwright timed out" : named.length > 0 ? named.join(" | ") : `playwright exited with ${ran.code ?? "no code"}`;
  const output = [message, "--- playwright output ---", ran.output].join("\n");
  return { ...base, status: "fail", exitCode: 1, output, message };
}

/** The journeys check, run with the clean environment in ctx. */
async function run(ctx: CheckContext): Promise<CheckResult> {
  const base = { name: "journeys", command: `playwright test <journeys> --config ${CONFIG}`, durationMs: 0 };
  const files = selectJourneys(ctx);
  if (files.length === 0) {
    const message = ctx.full ? "no journey exists" : "no changed feature has a journey";
    return { ...base, status: "pass", exitCode: 0, output: "", message };
  }
  if (!existsSync(join(ctx.root, PLAYWRIGHT_PACKAGE)) || !existsSync(join(ctx.root, PLAYWRIGHT))) {
    return { ...base, status: "could-not-run", exitCode: null, output: "", message: `@playwright/test is missing; run: ${SETUP}` };
  }
  const chrome = ctx.env.VERIFY_CHROME ?? DEFAULT_CHROME;
  if (!existsSync(chrome)) {
    return { ...base, status: "could-not-run", exitCode: null, output: "", message: `Google Chrome is missing at ${chrome}; install it or set VERIFY_CHROME` };
  }
  const missing = heraldMissing(ctx.root);
  if (missing) return { ...base, status: "could-not-run", exitCode: null, output: "", message: missing };
  const evidence = join(ctx.evidenceDir, "journeys");
  mkdirSync(evidence, { recursive: true });
  const started = Date.now();
  const notes: string[] = [];
  const note = (line: string) => notes.push(line);
  const servers: Server[] = [];
  let launch: Launch = {};
  let ran: Ran | undefined;
  let freed = true;
  try {
    launch = await launchHerald(ctx, evidence, readyLimits(ctx.env), note, servers);
    if (launch.ports && !launch.failure) ran = await runJourneys(ctx, files, launch.ports, evidence, chrome);
  } finally {
    freed = await stopHerald(servers);
  }
  const durationMs = Date.now() - started;
  if (!launch.ports) return { ...base, status: "could-not-run", exitCode: null, output: "", message: "no free port on 127.0.0.1" };
  if (launch.failure) return { ...base, durationMs, status: "fail", exitCode: 1, output: failureOutput(launch.failure, notes), message: launch.failure.message };
  if (!ran) return { ...base, durationMs, status: "could-not-run", exitCode: null, output: notes.join("\n"), message: "herald answered but playwright did not run" };
  const result = verdict({ ...base, durationMs }, ran, join(evidence, RESULTS_FILE), notes);
  if (result.status === "fail" || freed) return result;
  const message = `a port was still in use after stopping (${launch.ports.backend}, ${launch.ports.frontend})`;
  return { ...base, durationMs, status: "fail", exitCode: 1, output: notes.join("\n"), message };
}

/** The journeys check. */
export const check: Check = { name: "journeys", run };
