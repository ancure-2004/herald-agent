/**
 * The backend test suite: `pytest` in backend/ with the venv herald's setup
 * installs. Exit 0 passes. Exit 1 passes only when every failing test is
 * listed in known-failures.txt (the quarantine); any other exit fails.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";

/** pytest's arguments: quiet, no cache folder written into the repo, and a `FAILED <id>` line per failure. */
const ARGS = ["-q", "-p", "no:cacheprovider", "-rf"];

/** Longest the backend suite may take before it is stopped. */
const TIMEOUT_MS = 900_000;

/** The test ids pytest named on its `-rf` summary lines (`FAILED <id> - <reason>`), once each. */
function failingIds(output: string): string[] {
  const ids = output.split("\n").filter((l) => l.startsWith("FAILED ")).map((l) => {
    const rest = l.slice("FAILED ".length);
    const dash = rest.indexOf(" - ");
    return (dash < 0 ? rest : rest.slice(0, dash)).trim();
  });
  return [...new Set(ids)];
}

/** The quarantined test ids: one per line, `#` starts a comment, blanks ignored. */
function knownFailures(root: string): string[] {
  const file = join(root, "verifier", "known-failures.txt");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => l.split("#")[0].trim()).filter((id) => id !== "");
}

/** Run pytest with the clean environment; returns its result. */
function run(ctx: CheckContext): CheckResult {
  const cwd = join(ctx.root, "backend");
  const command = ["backend/.venv/bin/pytest", ...ARGS].join(" ");
  const base = { name: "backend-tests", command, durationMs: 0 };
  const pytest = join(cwd, ".venv", "bin", "pytest");
  if (!existsSync(pytest)) {
    const message = "backend/.venv/bin/pytest is missing; run: cd backend && python3 -m venv .venv && .venv/bin/pip install -e \".[dev]\" -r requirements.txt";
    return { ...base, status: "could-not-run", exitCode: null, output: "", message };
  }
  const started = Date.now();
  const r = spawnSync(pytest, ARGS, { cwd, env: ctx.env, encoding: "utf8", timeout: TIMEOUT_MS });
  const durationMs = Date.now() - started;
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.error) return { ...base, durationMs, status: "could-not-run", exitCode: null, output, message: r.error.message };
  const done = { ...base, durationMs, exitCode: r.status, output };
  if (r.status !== 0 && r.status !== 1) {
    return { ...done, status: "fail", message: `pytest ended with ${r.status ?? r.signal}, not a test result` };
  }
  const known = knownFailures(ctx.root);
  const failed = failingIds(output);
  const unlisted = failed.filter((id) => !known.includes(id));
  /** A listed test that did not fail, and pytest really ran: the quarantine can shrink. */
  const fixed = known.filter((id) => !failed.includes(id)).map((id) => `fixed: ${id}; remove it from verifier/known-failures.txt`);
  if (r.status === 1 && failed.length === 0) {
    return { ...done, status: "fail", message: "pytest exited 1 but named no failing test" };
  }
  if (unlisted.length > 0) {
    return { ...done, status: "fail", message: [`unlisted failure: ${unlisted.join(", ")}`, ...fixed].join(" | ") };
  }
  return { ...done, status: "pass", message: fixed.join(" | ") };
}

/** The backend-tests check. */
export const check: Check = { name: "backend-tests", run };
