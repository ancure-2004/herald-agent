/**
 * The backend test suite: `pytest` in backend/ with the venv herald's setup
 * installs. Exit 0 passes. Exit 1 passes only when every failing test is
 * listed in known-failures.txt (the quarantine); any other exit fails.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { judgePytest, VENV_SETUP } from "../known-failures.ts";

/** pytest's arguments: quiet, no cache folder written into the repo, and a `FAILED <id>` line per failure. */
const ARGS = ["-q", "-p", "no:cacheprovider", "-rf"];

/** Longest the backend suite may take before it is stopped. */
const TIMEOUT_MS = 900_000;

/** Run pytest with the clean environment; returns its result. */
function run(ctx: CheckContext): CheckResult {
  const cwd = join(ctx.root, "backend");
  const command = ["backend/.venv/bin/pytest", ...ARGS].join(" ");
  const base = { name: "backend-tests", command, durationMs: 0 };
  const pytest = join(cwd, ".venv", "bin", "pytest");
  if (!existsSync(pytest)) {
    const message = `backend/.venv/bin/pytest is missing; run: ${VENV_SETUP}`;
    return { ...base, status: "could-not-run", exitCode: null, output: "", message };
  }
  const started = Date.now();
  const r = spawnSync(pytest, ARGS, { cwd, env: ctx.env, encoding: "utf8", timeout: TIMEOUT_MS });
  const durationMs = Date.now() - started;
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.error) return { ...base, durationMs, status: "could-not-run", exitCode: null, output, message: r.error.message };
  const verdict = judgePytest(ctx.root, r.status ?? r.signal ?? "no exit status", output);
  return { ...base, durationMs, exitCode: r.status, output, ...verdict };
}

/** The backend-tests check. */
export const check: Check = { name: "backend-tests", run };
