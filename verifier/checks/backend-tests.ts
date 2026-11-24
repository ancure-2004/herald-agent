/**
 * The backend test suite: `pytest` in backend/ with the venv herald's
 * setup installs. Exit 0 passes; any other exit fails (pytest's own exit 1
 * handling comes in the known-failures slice).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";

/** Longest the backend suite may take before it is stopped. */
const TIMEOUT_MS = 900_000;

/** Run pytest with the clean environment; returns its result. */
function run(ctx: CheckContext): CheckResult {
  const cwd = join(ctx.root, "backend");
  const command = "backend/.venv/bin/pytest -q -p no:cacheprovider -rf";
  const base = { name: "backend-tests", command, durationMs: 0 };
  const pytest = join(cwd, ".venv", "bin", "pytest");
  if (!existsSync(pytest)) {
    const message = "backend/.venv/bin/pytest is missing; run: cd backend && python3 -m venv .venv && .venv/bin/pip install -e \".[dev]\" -r requirements.txt";
    return { ...base, status: "could-not-run", exitCode: null, output: "", message };
  }
  const started = Date.now();
  const r = spawnSync(pytest, ["-q", "-p", "no:cacheprovider", "-rf"], { cwd, env: ctx.env, encoding: "utf8", timeout: TIMEOUT_MS });
  const durationMs = Date.now() - started;
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.error) return { ...base, durationMs, status: "could-not-run", exitCode: null, output, message: r.error.message };
  return { ...base, durationMs, status: r.status === 0 ? "pass" : "fail", exitCode: r.status, output, message: "" };
}

/** The backend-tests check. */
export const check: Check = { name: "backend-tests", run };
