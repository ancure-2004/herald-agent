/**
 * herald's E2E suite: `tests/e2e/runner.py` run by the backend venv's python,
 * from herald's root. Exit 0 passes. Exit 1 passes only when every failing,
 * errored or skipped test is listed in known-failures.txt, the same rule as
 * backend-tests. E2E_BASE_URL never reaches it: the clean environment drops it.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { E2E_PREFIX, judgePytest, VENV_SETUP } from "../known-failures.ts";

/** The runner's arguments: `-rfEs` for the failure, error and skip summary lines, and no cache folder in the repo. */
const ARGS = ["tests/e2e/runner.py", "-rfEs", "-pno:cacheprovider"];

/** Longest the E2E suite may take before it is stopped. */
const TIMEOUT_MS = 600_000;

/** Run the E2E suite with the clean environment; returns its result. */
function run(ctx: CheckContext): CheckResult {
  const command = ["backend/.venv/bin/python", ...ARGS].join(" ");
  const base = { name: "e2e", command, durationMs: 0 };
  const python = join(ctx.root, "backend", ".venv", "bin", "python");
  if (!existsSync(python)) {
    const message = `backend/.venv/bin/python is missing; run: ${VENV_SETUP}`;
    return { ...base, status: "could-not-run", exitCode: null, output: "", message };
  }
  const started = Date.now();
  const r = spawnSync(python, ARGS, { cwd: ctx.root, env: ctx.env, encoding: "utf8", timeout: TIMEOUT_MS });
  const durationMs = Date.now() - started;
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.error) return { ...base, durationMs, status: "could-not-run", exitCode: null, output, message: r.error.message };
  const verdict = judgePytest(ctx.root, r.status ?? r.signal ?? "no exit status", output, (id) => id.startsWith(E2E_PREFIX));
  return { ...base, durationMs, exitCode: r.status, output, ...verdict };
}

/** The e2e check. */
export const check: Check = { name: "e2e", run };
