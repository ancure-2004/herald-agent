/**
 * One pytest-based check, built from its settings: both backend-tests and e2e
 * run a program from herald's backend venv and judge its summary lines with
 * the shared quarantine (known-failures.ts). Each check file is only its settings.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "./check.ts";
import { judgePytest } from "./known-failures.ts";

/** The command that builds herald's backend venv; every pytest check names it when its program is missing. */
export const VENV_SETUP = 'cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]" -r requirements.txt';

/** What makes one pytest check: its name, program, arguments, folder, time limit, and which listed ids are its own. */
export type PytestSettings = {
  name: string;
  /** The program, relative to herald's root (e.g. backend/.venv/bin/pytest). */
  program: string;
  args: string[];
  /** The folder it runs in, relative to herald's root ("" for the root). */
  cwd: string;
  timeoutMs: number;
  owns: (id: string) => boolean;
};

/** A check that runs `settings.program` with the clean environment and judges it by the shared quarantine. */
export function pytestCheck(settings: PytestSettings): Check {
  const command = [settings.program, ...settings.args].join(" ");
  const base = { name: settings.name, command, durationMs: 0 };
  function run(ctx: CheckContext): CheckResult {
    const program = join(ctx.root, settings.program);
    if (!existsSync(program)) {
      return { ...base, status: "could-not-run", exitCode: null, output: "", message: `${settings.program} is missing; run: ${VENV_SETUP}` };
    }
    const started = Date.now();
    const r = spawnSync(program, settings.args, { cwd: join(ctx.root, settings.cwd), env: ctx.env, encoding: "utf8", timeout: settings.timeoutMs });
    const durationMs = Date.now() - started;
    const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    if (r.error) return { ...base, durationMs, status: "could-not-run", exitCode: null, output, message: r.error.message };
    /** A killed run has no exit status, only a signal name. */
    const ended = r.status ?? `signal ${r.signal ?? "unknown"}`;
    return { ...base, durationMs, exitCode: r.status, output, ...judgePytest(ctx.root, ended, output, settings.owns) };
  }
  return { name: settings.name, run };
}
