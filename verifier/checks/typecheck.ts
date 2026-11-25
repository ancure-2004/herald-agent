/**
 * The frontend typecheck: `npm run typecheck` in frontend/. Exit 0 passes;
 * any other exit fails. Without frontend/node_modules it cannot run at all.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";

/** Longest the typecheck may take before it is stopped. */
const TIMEOUT_MS = 600_000;

/** Run the typecheck with the clean environment; returns its result. */
function run(ctx: CheckContext): CheckResult {
  const cwd = join(ctx.root, "frontend");
  const command = "npm run typecheck";
  const base = { name: "typecheck", command, durationMs: 0 };
  if (!existsSync(join(cwd, "node_modules"))) {
    return { ...base, status: "could-not-run", exitCode: null, output: "", message: "frontend/node_modules is missing; run: cd frontend && npm ci" };
  }
  const started = Date.now();
  const r = spawnSync("npm", ["run", "typecheck"], { cwd, env: ctx.env, encoding: "utf8", timeout: TIMEOUT_MS });
  const durationMs = Date.now() - started;
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.error) return { ...base, durationMs, status: "could-not-run", exitCode: null, output, message: r.error.message };
  return { ...base, durationMs, status: r.status === 0 ? "pass" : "fail", exitCode: r.status, output, message: "" };
}

/** The typecheck check. */
export const check: Check = { name: "typecheck", run };
