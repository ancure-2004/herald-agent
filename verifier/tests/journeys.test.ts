/**
 * Seam tests for the journeys check: `verify` run as a program on a git
 * fixture with a fake Playwright that records its arguments and environment.
 * No real browser or Playwright runs; herald is the fake app as in app-health.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, exists, makeFixture, playwrightRecordPath, readEvidence, readRecord, runVerify, tempDir, type RunResult } from "./fixture.ts";

after(cleanup);

/** A test status in Playwright's JSON report: expected (passed), unexpected (failed), flaky, or skipped (test.fixme / test.skip). */
type Status = "expected" | "unexpected" | "flaky" | "skipped";

/**
 * A fake Playwright body that writes Playwright's JSON report to
 * VERIFY_JOURNEY_DIR: one test per journey file it was given, with the status
 * `statuses[file name]` (or `fallback`), then exits `code`.
 */
function reporting(statuses: Record<string, Status>, fallback: Status, code: number): string {
  const cases = Object.entries(statuses)
    .map(([name, status]) => `'${name}') s=${status};;`)
    .join(" ");
  return [
    'out="$VERIFY_JOURNEY_DIR/results.json"; sep=""',
    `{ printf '{"suites":['; for a in "$@"; do case "$a" in *.journey.ts) b=$(basename "$a"); case "$b" in ${cases} *) s=${fallback};; esac`,
    `printf '%s{"title":"%s","file":"%s","specs":[{"title":"t","file":"%s","tests":[{"status":"%s"}]}],"suites":[]}' "$sep" "$b" "$b" "$b" "$s"; sep=,;; esac; done; printf ']}'; } > "$out"`,
    `exit ${code}`,
  ].join("\n");
}

/** The fake Playwright's body when a test wants it to pass: every journey it was given passes. */
const PASSING = reporting({}, "expected", 0);

/** A journey file's text: the fixtures only need it to exist. */
const JOURNEY = "// journey\n";

/** The demo feature's journey file, and a second feature's, both in the base commit. */
const JOURNEYS = { "verifier/journeys/demo.journey.ts": JOURNEY, "verifier/journeys/other.journey.ts": JOURNEY };

/** A git fixture with the journeys and a fake Playwright whose body is `body`. */
function journeyFixture(body: string | undefined = PASSING, files: Record<string, string> = JOURNEYS) {
  return makeFixture({ typecheck: "exit 0", git: true, files, ...(body === undefined ? {} : { playwright: body }) });
}

/** Run verify with the fake Chrome path set, so the check never looks for a real Chrome. */
function journeyRun(root: string, args: string[] = [], extra: Record<string, string> = {}): RunResult {
  return runVerify(root, args, { VERIFY_CHROME: join(root, "fake-chrome"), ...extra });
}

/** What the fake Playwright recorded: its arguments, and the environment lines. */
function playwrightRecord(root: string): { args: string[]; env: Map<string, string> } {
  const lines = readFileSync(playwrightRecordPath(root), "utf8").split("\n").filter((l) => l !== "");
  const args = lines.filter((l) => l.startsWith("arg ")).map((l) => l.slice(4));
  const env = new Map(
    lines
      .filter((l) => l.startsWith("env "))
      .map((l) => l.slice(4))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)] as const),
  );
  return { args, env };
}

/** Whether herald was started for the journeys check: its logs are in journeys/ (app-health's are at the top of Evidence). */
function journeyHerald(evidence: string | undefined): boolean {
  return exists(join(evidence ?? "", "journeys", "backend.log"));
}

/** Make a change to the demo feature's claimed folder, so the demo journey is a changed one. */
function changeDemo(root: string): void {
  writeFileSync(join(root, "frontend", "src", "features", "demo", "index.tsx"), "export const changed = 1;\n");
}

/** Write a file into a fixture, creating its folders: a change that selects no feature. */
function changeDocs(root: string): void {
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", "notes.md"), "x\n");
}

test("fast mode with a changed feature that has a journey runs that journey, through the Verifier's herald", () => {
  const root = journeyFixture();
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: pass/m);
  assert.equal(journeyHerald(r.evidence), true, "herald started for the journeys");
  const rec = playwrightRecord(root);
  assert.ok(rec.args.includes("verifier/journeys/demo.journey.ts"), rec.args.join(" "));
  assert.ok(!rec.args.includes("verifier/journeys/other.journey.ts"), "the unchanged feature's journey does not run");
  assert.ok(rec.args.includes("--config") && rec.args.includes("verifier/playwright.config.ts"), rec.args.join(" "));
  const frontend = readRecord(root, "frontend");
  const port = frontend.argv[frontend.argv.indexOf("--port") + 1];
  assert.equal(rec.env.get("VERIFY_BASE_URL"), `http://127.0.0.1:${port}`);
  assert.notEqual(port, "3000", "never the Master's herald on 3000");
});

test("a journey that was skipped is never reported as run: zero passed names the skipped journey", () => {
  const root = journeyFixture(reporting({}, "skipped", 0));
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: pass \(0 passed, 1 skipped: demo\)$/m);
  assert.doesNotMatch(r.stdout, /ran /);
});

test("a run with a passed and a skipped journey names each by its outcome", () => {
  const root = journeyFixture(reporting({ "demo.journey.ts": "expected", "other.journey.ts": "skipped" }, "skipped", 0));
  const r = journeyRun(root, ["--full"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: pass \(demo passed; other skipped\)$/m);
});

test("a run that exits 0 but writes no results cannot run, not pass", () => {
  const root = journeyFixture("exit 0");
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: could-not-run/m);
});

test("fast mode with no changed feature that has a journey passes, says so, and starts no herald", () => {
  const root = journeyFixture(undefined);
  changeDocs(root);
  const r = journeyRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: pass \(no changed feature has a journey\)$/m);
  assert.equal(journeyHerald(r.evidence), false, "no herald started for the journeys");
});

test("--full runs every journey file, even when no feature changed", () => {
  const root = journeyFixture();
  const r = journeyRun(root, ["--full"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const rec = playwrightRecord(root);
  assert.ok(rec.args.includes("verifier/journeys/demo.journey.ts"), rec.args.join(" "));
  assert.ok(rec.args.includes("verifier/journeys/other.journey.ts"), rec.args.join(" "));
});

test("--full with no journey files passes with `no journey exists`, and starts no herald", () => {
  const root = makeFixture({ typecheck: "exit 0", playwright: PASSING });
  const r = journeyRun(root, ["--full"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: pass \(no journey exists\)$/m);
  assert.equal(journeyHerald(r.evidence), false, "no herald started for the journeys");
});

test("a journey to run without @playwright/test installed exits 2 and names `cd verifier && npm install`; no herald starts", () => {
  const root = makeFixture({ typecheck: "exit 0", git: true, files: JOURNEYS });
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: could-not-run/m);
  assert.match(r.stdout, /cd verifier && npm install/);
  assert.equal(journeyHerald(r.evidence), false, "no herald started for the journeys");
});

test("a missing Google Chrome exits 2, names the path it looked for, and starts no herald", () => {
  const root = journeyFixture();
  changeDemo(root);
  const r = journeyRun(root, [], { VERIFY_CHROME: join(root, "no-such-chrome") });
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: could-not-run/m);
  assert.match(r.stdout, /no-such-chrome/);
  assert.equal(journeyHerald(r.evidence), false, "no herald started for the journeys");
});

test("a failing journey fails the check with exit 1, and the message names the journey and the failing line", () => {
  const body = 'echo "  1) verifier/journeys/demo.journey.ts:4:5 › demo › adds a lead"; echo "    Error: expect(locator).toBeVisible() failed"; exit 1';
  const root = journeyFixture(body);
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: fail/m);
  assert.match(r.stdout, /verifier\/journeys\/demo\.journey\.ts:4:5 › demo › adds a lead/);
  assert.match(r.stdout, /Error: expect\(locator\)\.toBeVisible\(\) failed/);
});

test("a herald that crashes on start fails the journeys with the server's log tail in the check's output", () => {
  const root = makeFixture({ typecheck: "exit 0", git: true, files: JOURNEYS, playwright: PASSING, uvicorn: "crash" });
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: fail \(backend crashed on start\)$/m);
  const output = readEvidence(r.evidence ?? "", "journeys.log");
  assert.match(output, /^--- last 20 lines of backend\.log ---$/m);
  assert.match(output, /fake server: startup error: boom/);
});

test("a failing journey's message names the failing step, from Playwright's header", () => {
  const body = [
    'echo "  1) [chromium] › verifier/journeys/demo.journey.ts:8:5 › jump between screens from Cmd+K › type Full Leads Table and choose it"',
    'echo "    Error: expect(locator).toBeHidden() failed"',
    "exit 1",
  ].join("\n");
  const root = journeyFixture(body);
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: fail \(.*› type Full Leads Table and choose it \| Error: expect\(locator\)\.toBeHidden\(\) failed\)$/m);
});

test("a failing journey still stops the herald it started", () => {
  const body = 'echo "  1) verifier/journeys/demo.journey.ts:4:5 › demo › adds a lead"; echo "    Error: boom"; exit 1';
  const root = journeyFixture(body);
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  for (const server of ["backend", "frontend"] as const) {
    assert.ok(gone(readRecord(root, server).pid), `${server} is stopped after a failing journey`);
  }
});

test("the journey's Evidence folder is journeys/ inside the run's Evidence, and the herald is stopped afterwards", () => {
  const root = journeyFixture();
  changeDemo(root);
  const r = journeyRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(playwrightRecord(root).env.get("VERIFY_JOURNEY_DIR"), join(r.evidence ?? "", "journeys"));
  for (const server of ["backend", "frontend"] as const) {
    assert.ok(gone(readRecord(root, server).pid), `${server} is stopped`);
  }
});

test("the journey gets the clean environment: a caller secret does not reach it, CI=1 does", () => {
  const root = journeyFixture();
  changeDemo(root);
  const r = journeyRun(root, [], { SECRET_API_KEY: "x" });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const env = playwrightRecord(root).env;
  assert.equal(env.has("SECRET_API_KEY"), false);
  assert.equal(env.get("CI"), "1");
});

test("a change that selects no feature passes without Playwright installed: nothing needs it", () => {
  const root = makeFixture({ typecheck: "exit 0", git: true });
  changeDocs(root);
  const r = journeyRun(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^journeys: pass \(no changed feature has a journey\)$/m);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  test(`a Verifier stopped from outside (${signal}) also stops Playwright's process group and its child, and exits 2`, async () => {
    const pidFile = join(tempDir("journey-child-"), "child.pid");
    const root = journeyFixture(`sleep 300 & echo $! > "${pidFile}"; sleep 300`);
    const env = { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", VERIFY_CHROME: join(root, "fake-chrome") };
    const child = spawn(join(root, "verify"), ["--full"], { env, stdio: "ignore" });
    const exited = new Promise<number | null>((resolve) => child.on("exit", (code) => resolve(code)));
    const started = async () => {
      const deadline = Date.now() + 60_000;
      while (!exists(pidFile)) {
        if (Date.now() >= deadline) return false;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return true;
    };
    assert.ok(await started(), "Playwright's child started");
    const pid = Number(readFileSync(pidFile, "utf8").trim());
    child.kill(signal);
    assert.equal(await exited, 2);
    const until = async (ms: number) => {
      const deadline = Date.now() + ms;
      while (!gone(pid)) {
        if (Date.now() >= deadline) return false;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return true;
    };
    assert.ok(await until(3_000), "the background child of Playwright is gone");
  });
}

/** True when the process with this PID no longer exists (or is a zombie nobody has reaped). */
function gone(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch {
    return true;
  }
  try {
    return /^\S+ \(.*\) Z /m.test(readFileSync(`/proc/${pid}/stat`, "utf8"));
  } catch {
    return true;
  }
}
