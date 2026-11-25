/**
 * The load check (`./verify --full` only; the fast set skips it): generates a
 * throwaway database with the fake-data generator (verifier/seed/generate.py),
 * starts herald on that database, and times the main backend calls and two
 * screens against the limits in verifier/load-limits.ts. Each one is fast or
 * slow (slow passes, and is named with its median) or broken (no answer by the
 * hard limit, or a non-2xx answer: the check fails). A missing venv, Playwright,
 * Chrome or herald install, or a generator that refuses (exit 2), cannot run (exit 2);
 * a generator that fails (exit 1) fails. herald is stopped on every path, pass or fail.
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { failureOutput, heraldMissing, launchHerald, readyLimits, stopHerald, type Launch } from "../herald.ts";
import type { Server } from "../launch.ts";
import { DEFAULT_CHROME, PLAYWRIGHT, PLAYWRIGHT_PACKAGE, runProgram, SETUP, type Ran } from "./journeys.ts";
import { VENV_SETUP } from "../pytest-check.ts";
import { loadLimits, type LoadLimits } from "../load-limits.ts";
import { measureCall } from "../load/calls.ts";
import { evidenceLines, judge, summary, type Measured, type Try } from "../load/judge.ts";

/** The fake-data generator, relative to herald's root, and the Python that runs it (herald's backend venv). */
const GENERATOR = "verifier/seed/generate.py";
const PYTHON = "backend/.venv/bin/python";

/** The screens' Playwright spec and its config, relative to herald's root (verifier/load/). */
const SCREEN_SPEC = "verifier/load/screens.load.ts";
const SCREEN_CONFIG = "verifier/load/playwright.load.config.ts";

/** The Evidence folder for this check, the file in it the screens write their times to, and the throwaway database's name. */
const DIR = "load";
const SCREENS_FILE = "screens.json";
const DB_FILE = "load.db";

/** What the screens' file holds for one screen (load/screens.load.ts). */
type ScreenTiming = { screen: string; ms: number; ok: boolean; error?: string };

/** What the measurement produced: herald's launch, every judged call and screen, a screen problem (the screens could not run), the Playwright output, and whether every port was freed. */
type Measure = { launch: Launch; rows: Measured[]; problem?: string; playwrightOutput: string; freed: boolean; notes: string[] };

/** Generate the fake data into `db`: the generator's own output (its row counts) is the result's output. */
function generate(ctx: CheckContext, limits: LoadLimits, db: string): Promise<Ran> {
  const env = { ...ctx.env, DATABASE_URL: `sqlite:///${db}` };
  return runProgram(join(ctx.root, PYTHON), [GENERATOR, db, "--leads", String(limits.leads), "--seed", String(limits.seed)], ctx.root, env);
}

/** The screens' timings, judged: one try per screen. A missing or unreadable file, or a screen with no timing, is a problem (the screens could not run). */
async function timeScreens(
  ctx: CheckContext,
  dir: string,
  frontend: number,
  limits: LoadLimits,
  chrome: string,
): Promise<{ rows: Measured[]; problem?: string; output: string }> {
  const file = join(dir, SCREENS_FILE);
  rmSync(file, { force: true });
  const env = { ...ctx.env, VERIFY_BASE_URL: `http://127.0.0.1:${frontend}`, VERIFY_LOAD_DIR: dir, VERIFY_CHROME: chrome };
  const ran = await runProgram(join(ctx.root, PLAYWRIGHT), ["test", SCREEN_SPEC, "--config", SCREEN_CONFIG], ctx.root, env);
  const fail = (problem: string) => ({ rows: [], problem, output: ran.output });
  if (!existsSync(file)) return fail(ran.timedOut ? "playwright timed out" : `playwright wrote no screen timings (exit ${ran.code ?? "none"})`);
  let timings: ScreenTiming[];
  try {
    timings = JSON.parse(readFileSync(file, "utf8")) as ScreenTiming[];
  } catch {
    return fail(`unreadable screen timings in ${SCREENS_FILE}`);
  }
  const rows: Measured[] = [];
  for (const screen of limits.screens) {
    const found = timings.find((t) => t.screen === screen.label);
    if (!found) return fail(`no timing for the ${screen.label} screen`);
    const tries: Try[] = [{ ms: found.ms, status: found.ok ? 200 : undefined, reason: found.error }];
    rows.push(judge({ label: `${screen.label} screen`, limits: screen.limits, tries }));
  }
  return { rows, output: ran.output };
}

/** Start herald on `db`, time the calls and the screens, and stop herald (every server it started, pass or fail). */
async function measure(ctx: CheckContext, dir: string, db: string, limits: LoadLimits, chrome: string): Promise<Measure> {
  const loadCtx: CheckContext = { ...ctx, env: { ...ctx.env, DATABASE_URL: `sqlite:///${db}` } };
  const notes: string[] = [];
  const servers: Server[] = [];
  const rows: Measured[] = [];
  let launch: Launch = {};
  let problem: string | undefined;
  let playwrightOutput = "";
  let freed = true;
  try {
    launch = await launchHerald(loadCtx, dir, readyLimits(ctx.env), (line) => notes.push(line), servers);
    if (launch.ports && !launch.failure) {
      const base = `http://127.0.0.1:${launch.ports.backend}`;
      for (const call of limits.calls) {
        const tries = await measureCall(base, call);
        rows.push(judge({ label: `GET ${call.path}`, name: call.label, limits: call.limits, tries }));
      }
      const screens = await timeScreens(ctx, dir, launch.ports.frontend, limits, chrome);
      rows.push(...screens.rows);
      problem = screens.problem;
      playwrightOutput = screens.output;
    }
  } finally {
    freed = await stopHerald(servers);
  }
  return { launch, rows, problem, playwrightOutput, freed, notes };
}

/** The check's outcome for a finished measurement: a herald that did not start fails, a missing port or screen problem cannot run, a port still in use fails, and any broken call or screen fails. */
function verdict(base: { name: string; command: string }, started: number, genOutput: string, m: Measure): CheckResult {
  const lines = [genOutput.trimEnd(), "--- calls and screens, slowest first (the warm-up is not timed) ---", ...evidenceLines(m.rows)];
  if (m.problem) lines.push(`--- screens could not run: ${m.problem} ---`, m.playwrightOutput);
  if (m.launch.failure) lines.push(failureOutput(m.launch.failure, m.notes));
  const output = lines.join("\n");
  const durationMs = Date.now() - started;
  const stop = (status: CheckResult["status"], exitCode: number | null, message: string): CheckResult => ({
    ...base,
    durationMs,
    status,
    exitCode,
    output,
    message,
  });
  if (m.launch.failure) return stop("fail", 1, m.launch.failure.message);
  if (!m.launch.ports) return stop("could-not-run", null, "no free port on 127.0.0.1");
  if (m.problem) return stop("could-not-run", null, m.problem);
  if (!m.freed) return stop("fail", 1, `a port was still in use after stopping (${m.launch.ports.backend}, ${m.launch.ports.frontend})`);
  const failed = m.rows.some((r) => r.outcome === "broken");
  return stop(failed ? "fail" : "pass", failed ? 1 : 0, summary(m.rows));
}

/** The load check, run with the clean environment in ctx. */
async function run(ctx: CheckContext): Promise<CheckResult> {
  const base = { name: "load", command: `${PYTHON} ${GENERATOR} <db>; playwright test ${SCREEN_SPEC}`, durationMs: 0 };
  if (!ctx.full) return { ...base, status: "pass", exitCode: 0, output: "", message: "skipped (only with --full)" };
  const started = Date.now();
  const cannot = (message: string): CheckResult => ({ ...base, durationMs: Date.now() - started, status: "could-not-run", exitCode: null, output: "", message });
  if (!existsSync(join(ctx.root, PYTHON))) return cannot(`${PYTHON} is missing; run: ${VENV_SETUP}`);
  if (!existsSync(join(ctx.root, PLAYWRIGHT_PACKAGE)) || !existsSync(join(ctx.root, PLAYWRIGHT))) {
    return cannot(`@playwright/test is missing; run: ${SETUP}`);
  }
  const chrome = ctx.env.VERIFY_CHROME || DEFAULT_CHROME;
  if (!existsSync(chrome)) return cannot(`Google Chrome is missing at ${chrome}; install it or set VERIFY_CHROME`);
  const missing = heraldMissing(ctx.root);
  if (missing) return cannot(missing);
  const limits = loadLimits(ctx.env);
  const dir = join(ctx.evidenceDir, DIR);
  mkdirSync(dir, { recursive: true });
  const db = join(ctx.runDir, DB_FILE);
  const generated = await generate(ctx, limits, db);
  if (generated.code === 2 && !generated.timedOut) {
    const reason = generated.output.split("\n").filter((l) => l.trim() !== "").pop()?.replace(/^refused: /, "") ?? "no reason given";
    return { ...base, durationMs: Date.now() - started, status: "could-not-run", exitCode: null, output: generated.output, message: `the generator refused: ${reason}` };
  }
  if (generated.code !== 0 || generated.timedOut) {
    const reason = generated.timedOut ? "timed out" : `exited with ${generated.code ?? "no code"}`;
    return { ...base, durationMs: Date.now() - started, status: "fail", exitCode: 1, output: generated.output, message: `the generator ${reason}` };
  }
  const measured = await measure(ctx, dir, db, limits, chrome);
  return verdict(base, started, generated.output, measured);
}

/** The load check. */
export const check: Check = { name: "load", run };
