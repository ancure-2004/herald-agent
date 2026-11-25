/**
 * Evidence: one `<check>.log` per check (command, exit code, duration, full
 * output) and a `summary.json`, in VERIFY_EVIDENCE_DIR or a new temp folder.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { CheckResult } from "./check.ts";
import type { Changed } from "./changed.ts";

/** The Evidence folder for this run, as an absolute path, created if needed. */
export function evidenceDir(env: Record<string, string | undefined>): string {
  const configured = env.VERIFY_EVIDENCE_DIR;
  if (configured) {
    const dir = resolve(configured);
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  return mkdtempSync(join(tmpdir(), "verify-evidence-"));
}

/** Write one check's log: its command, exit code, duration and full output. */
export function writeLog(dir: string, r: CheckResult): void {
  const text = [
    `command: ${r.command}`,
    `status: ${r.status}`,
    `exit code: ${r.exitCode ?? "none"}`,
    `duration: ${r.durationMs} ms`,
    r.message ? `message: ${r.message}` : "",
    "--- output ---",
    r.output,
  ].join("\n");
  writeFileSync(join(dir, `${r.name}.log`), text);
}

/** Write summary.json: each check's name, status, exit code and duration, the changed files and features, plus the overall exit code. */
export function writeSummary(dir: string, results: CheckResult[], exitCode: number, changed: Changed): void {
  const checks = results.map(({ name, status, exitCode: code, durationMs }) => ({ name, status, exitCode: code, durationMs }));
  writeFileSync(join(dir, "summary.json"), JSON.stringify({ exitCode, checks, changed }, null, 2) + "\n");
}
