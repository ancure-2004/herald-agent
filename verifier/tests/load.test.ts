/**
 * Seam tests for the load check (checks/load.ts): `verify --full` run as a
 * program on a fixture with a fake generator, fake herald servers whose delays
 * and statuses the test sets (setRoutes), and a fake Playwright that writes the
 * screens' timings. The limits are shrunk with VERIFY_LOAD_LIMITS_SCALE. Nothing
 * real starts: no generator, no herald, no browser.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { cleanup, exists, makeFixture, playwrightLoadRecordPath, readGenerator, readRecord, runVerify, setRoutes, type FixtureOptions, type RunResult } from "./fixture.ts";

after(cleanup);

/** The limits shrunk 10 times: call target 50 ms, hard 1 s; screen target 500 ms, hard 3 s. */
const SHRUNK = { VERIFY_LOAD_LIMITS_SCALE: "0.1" };

/** A fake Playwright body that writes the screens' timings as the spec would (VERIFY_LOAD_DIR/screens.json), then exits `code`. */
function screensFake(rows: Array<{ screen: string; ms: number; ok?: boolean; error?: string }>, code = 0): string {
  const json = JSON.stringify(rows.map((r) => ({ ok: true, ...r })));
  return `mkdir -p "$VERIFY_LOAD_DIR"; printf '%s' '${json}' > "$VERIFY_LOAD_DIR/screens.json"; exit ${code}`;
}

/** Both screens fast. */
const SCREENS_FAST = screensFake([
  { screen: "Management Overview", ms: 10 },
  { screen: "Leads Table", ms: 10 },
]);

/** A fixture for the load check: the fake Playwright (with its fake Chrome) and the given options. */
function loadFixture(extra: Partial<FixtureOptions> = {}): string {
  return makeFixture({ typecheck: "exit 0", playwright: SCREENS_FAST, ...extra });
}

/** A run with --full, shrunk limits, and the fake Chrome. */
function fullRun(root: string, extra: Record<string, string> = {}): RunResult {
  return runVerify(root, ["--full"], { ...SHRUNK, VERIFY_CHROME: join(root, "fake-chrome"), ...extra });
}

/** What the fake Playwright recorded for the screens run: its arguments and its environment lines. */
function playwrightLoad(root: string): { args: string[]; env: Map<string, string> } {
  const lines = readFileSync(playwrightLoadRecordPath(root), "utf8").split("\n").filter((l) => l !== "");
  const args = lines.filter((l) => l.startsWith("arg ")).map((l) => l.slice(4));
  const env = new Map(
    lines
      .filter((l) => l.startsWith("env "))
      .map((l) => l.slice(4))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)] as const),
  );
  return { args, env };
}

/** True when the process with this PID no longer exists. */
function gone(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

/** The load check's herald started (its logs are in Evidence's load/ folder). */
function loadHerald(evidence: string | undefined): boolean {
  return exists(join(evidence ?? "", "load", "backend.log"));
}

/** The lines of load.log, read from Evidence. */
function loadLog(evidence: string | undefined): string[] {
  return readFileSync(join(evidence ?? "", "load.log"), "utf8").split("\n");
}

test("a scaled run (VERIFY_LOAD_LIMITS_SCALE) says so in the message and in load.log", () => {
  const root = loadFixture();
  const r = fullRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: pass \(7 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.ok(loadLog(r.evidence).includes("limits scaled ×0.1 (test setting)"), "load.log names the scaling");
});

test("plain ./verify skips the load check: pass with the skip message, and no generator or herald starts for it", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: pass \(skipped \(only with --full\)\)$/m);
  assert.deepEqual(readGenerator(root), [], "the generator never ran");
});

test("--full with every call and screen fast: pass, the counts, the generator's arguments and database, herald stopped", () => {
  const root = loadFixture();
  const r = fullRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: pass \(7 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
  const gen = readGenerator(root);
  const args = gen.filter((l) => l.startsWith("arg ")).map((l) => l.slice("arg ".length));
  assert.equal(args[0], "verifier/seed/generate.py", gen.join(" | "));
  assert.deepEqual(args.slice(2), ["--leads", "2000", "--seed", "42"], gen.join(" | "));
  const screens = playwrightLoad(root);
  assert.equal(screens.env.get("VERIFY_BASE_URL"), `http://127.0.0.1:${readRecord(root, "frontend").argv[readRecord(root, "frontend").argv.indexOf("--port") + 1]}`);
  assert.ok(screens.env.get("VERIFY_LOAD_DIR")?.endsWith("/load"), "the screens write into the load folder");
  assert.ok(screens.args.includes("verifier/load/screens.load.ts") && screens.args.includes("verifier/load/playwright.load.config.ts"), screens.args.join(" "));
  const db = args[1] ?? "";
  assert.match(db, /\/load\.db$/, "the database is load.db in the run's temp folder");
  const url = `sqlite:///${db}`;
  assert.ok(gen.includes(`env DATABASE_URL=${url}`), "the generator runs on that database");
  const backend = readRecord(root, "backend");
  assert.equal(backend.env.DATABASE_URL, url, "herald starts on the same database");
  assert.ok(gone(backend.pid), "herald was stopped");
  assert.ok(gone(readRecord(root, "frontend").pid), "the frontend was stopped");
});

test("the load check's Evidence: the generator's output first, then every call and screen, each with 5 timings and a median", () => {
  const root = loadFixture({ generator: 'echo "leads 3"; echo "clinics 3"; exit 0' });
  const r = fullRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const lines = loadLog(r.evidence);
  const start = lines.indexOf("--- output ---") + 1;
  assert.equal(lines[start], "leads 3", "the generator's row counts come first, after the log header");
  assert.equal(lines[start + 1], "clinics 3");
  const rows = lines.filter((l) => /^(fast|slow|broken)\s/.test(l));
  assert.equal(rows.length, 7, rows.join("\n"));
  const calls = rows.filter((row) => row.includes(" GET /api/"));
  const screens = rows.filter((row) => row.includes(" screen:"));
  assert.equal(calls.length, 5, rows.join("\n"));
  assert.equal(screens.length, 2, rows.join("\n"));
  for (const row of calls) assert.match(row, /median \d+ ms; timings (\d+ ms, ){4}\d+ ms;/, row);
  for (const row of screens) assert.match(row, /median \d+ ms; timings \d+ ms;/, row);
});

test("a slow call (over its target, answered in time) passes and is named with its real median", () => {
  const root = loadFixture();
  setRoutes(root, { "/api/leads": { delayMs: 200 } });
  const r = fullRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: pass \(6 fast, 1 slow; slow: GET \/api\/leads\?hustle_id=1&smart_view=all_active \d+ ms \(target 0\.05 s\); limits scaled ×0\.1 \(test setting\)\)$/m);
});

test("the slow call is listed slowest first in Evidence", () => {
  const root = loadFixture();
  setRoutes(root, { "/api/leads": { delayMs: 200 } });
  const r = fullRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const rows = loadLog(r.evidence).filter((l) => /^(fast|slow|broken)\s/.test(l));
  assert.match(rows[0] ?? "", /^slow\s+GET \/api\/leads\?hustle_id=1&smart_view=all_active /, rows.join("\n"));
  assert.ok(rows.slice(1).every((row) => /^fast\s/.test(row)), rows.join("\n"));
});

test("a call that answers past its hard limit is broken: the check fails, names it, and herald is stopped", () => {
  const root = loadFixture();
  setRoutes(root, { "/api/cockpit/attention": { delayMs: 3000 } });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(broken: GET \/api\/cockpit\/attention\?hustle_id=1 \(no answer within 1 s\); 6 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.ok(gone(readRecord(root, "backend").pid), "herald was stopped");
});

test("a call that answers with a non-2xx status is broken: the check fails and names the status", () => {
  const root = loadFixture();
  setRoutes(root, { "/api/leads/1/messages": { status: 500 } });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(broken: GET \/api\/leads\/1\/messages \(HTTP 500\); 6 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
});

test("a broken call fails the check even when the screens left no timings: the call is named, and the screens problem is in the output", () => {
  const root = loadFixture({ playwright: 'rm -f "$VERIFY_LOAD_DIR/screens.json"; exit 1' });
  setRoutes(root, { "/api/leads/1/messages": { status: 500 } });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(broken: GET \/api\/leads\/1\/messages \(HTTP 500\); 4 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.match(loadLog(r.evidence).join("\n"), /playwright wrote no screen timings/);
});

test("a screen whose warm-up failed is broken (warm-up), and the check fails", () => {
  const root = loadFixture({ playwright: screensFake([{ screen: "Management Overview", ms: 10 }, { screen: "Leads Table", ms: 0, ok: false, error: "warm-up failed: timeout" }]) });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(broken: Leads Table screen \(warm-up failed: timeout\); 6 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
});

test("Playwright timed out before the second screen: that screen is broken (no answer), not a could-not-run", () => {
  const timedOut = 'printf \'%s\' \'[{"screen":"Management Overview","ms":10,"ok":true}]\' > "$VERIFY_LOAD_DIR/screens.json"; echo "Test timeout of 400000ms exceeded."; exit 1';
  const root = loadFixture({ playwright: timedOut });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(broken: Leads Table screen \(no answer within 3 s\); 6 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
});

test("a screen that loads past its hard limit is broken; a slow screen is reported and passes", () => {
  const broken = loadFixture({ playwright: screensFake([{ screen: "Management Overview", ms: 10 }, { screen: "Leads Table", ms: 3500 }]) });
  const rb = fullRun(broken);
  assert.equal(rb.code, 1, rb.stdout + rb.stderr);
  assert.match(rb.stdout, /^load: fail \(broken: Leads Table screen \(answered after 3 s\); 6 fast, 0 slow; limits scaled ×0\.1 \(test setting\)\)$/m);
  const slow = loadFixture({ playwright: screensFake([{ screen: "Management Overview", ms: 1000 }, { screen: "Leads Table", ms: 10 }]) });
  const rs = fullRun(slow);
  assert.equal(rs.code, 0, rs.stdout + rs.stderr);
  assert.match(rs.stdout, /^load: pass \(6 fast, 1 slow; slow: Management Overview screen 1 s \(target 0\.5 s\); limits scaled ×0\.1 \(test setting\)\)$/m);
});

test("a generator that exits 1 fails the check with its output, and herald never starts", () => {
  const root = loadFixture({ generator: 'echo "model changed: no such column" >&2; exit 1' });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(the generator exited with 1; limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.match(r.stdout, /model changed: no such column/);
  assert.equal(loadHerald(r.evidence), false, "herald did not start for the load check");
});

test("a generator that refuses (exit 2) makes the load check could-not-run (exit 2) with its refusal line; herald never starts", () => {
  const root = loadFixture({ generator: 'echo "refused: the path is not inside the temp folder (/tmp)" >&2; exit 2' });
  const r = fullRun(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: could-not-run \(the generator refused: the path is not inside the temp folder \(\/tmp\); limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.equal(loadHerald(r.evidence), false, "herald did not start for the load check");
});

test("no backend venv: the load check cannot run (exit 2), names the venv setup, and starts nothing", () => {
  const root = loadFixture({ noVenv: true });
  const r = fullRun(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: could-not-run \(backend\/\.venv\/bin\/python is missing; run: cd backend && python3 -m venv \.venv/m);
  assert.equal(loadHerald(r.evidence), false);
  assert.deepEqual(readGenerator(root), []);
});

test("no @playwright/test installed: the load check cannot run (exit 2) before anything starts", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = fullRun(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: could-not-run \(@playwright\/test is missing; run: cd verifier && npm install; limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.deepEqual(readGenerator(root), []);
});

test("no Chrome at the path: the load check cannot run (exit 2)", () => {
  const root = loadFixture();
  const r = runVerify(root, ["--full"], { ...SHRUNK, VERIFY_CHROME: join(root, "no-such-chrome") });
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: could-not-run \(Google Chrome is missing at .*no-such-chrome/m);
});

test("the screens' run leaves no timings: the load check cannot run (exit 2), and herald is stopped", () => {
  const root = loadFixture({ playwright: 'rm -f "$VERIFY_LOAD_DIR/screens.json"; exit 1' });
  const r = fullRun(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: could-not-run \(playwright wrote no screen timings \(exit 1\); limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.ok(gone(readRecord(root, "backend").pid), "herald was stopped");
});

test("herald that crashes on start fails the load check, names the crash, and leaves nothing running", () => {
  const root = loadFixture({ uvicorn: "crash" });
  const r = fullRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^load: fail \(backend crashed on start; limits scaled ×0\.1 \(test setting\)\)$/m);
  assert.ok(gone(readRecord(root, "frontend").pid), "the frontend was stopped too");
});
