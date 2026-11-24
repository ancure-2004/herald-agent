/**
 * The Verifier's entry: runs every check in checks/ with a clean environment,
 * a throwaway database and stubs for paid AI commands, warns when the checks
 * changed tracked files, writes Evidence, and exits 0, 1 or 2.
 */
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Check, CheckResult } from "./check.ts";
import { evidenceDir, writeLog, writeSummary } from "./evidence.ts";
import { killAllNow } from "./launch.ts";
import { cleanEnv, refusals, writeStubs } from "./safety.ts";
import { trackedStatus, writeTrackedChanges } from "./tracked-files.ts";

/** The herald root: the folder holding `verify`, the parent of verifier/. */
const ROOT = join(import.meta.dirname, "..");

/**
 * Every check, found in checks/ and run in file-name order: a new check is a
 * new file there, exporting `check` (no shared list to edit, ADR 0006).
 */
async function loadChecks(): Promise<Check[]> {
  const dir = join(import.meta.dirname, "checks");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts")).sort();
  const modules = await Promise.all(files.map((f) => import(pathToFileURL(join(dir, f)).href) as Promise<{ check: Check }>));
  return modules.map((m) => m.check);
}

/** The overall exit code: 2 if any check could not run, else 1 if any failed, else 0. */
function exitCodeFor(results: CheckResult[]): number {
  if (results.some((r) => r.status === "could-not-run")) return 2;
  return results.some((r) => r.status === "fail") ? 1 : 0;
}

/** Output lines worth showing: not blank, and not npm's own `> script` header lines. */
function shownLines(output: string): string[] {
  return output.split("\n").filter((l) => l.trim() !== "" && !l.startsWith("> ")).slice(0, SHOWN_LINES);
}

/** Lines of a failing check's output shown on stdout. */
const SHOWN_LINES = 10;

/** Print one check's line, and for a failure its first output lines. */
function report(r: CheckResult): void {
  const tail = r.message ? ` (${r.message})` : "";
  console.log(`${r.name}: ${r.status}${tail}`);
  if (r.status === "fail") {
    for (const line of shownLines(r.output)) console.log(`  ${line}`);
  }
}

/** Run the checks; returns the overall exit code. */
async function main(): Promise<number> {
  const found = refusals(ROOT);
  if (found.length > 0) {
    for (const file of found) console.log(`refused: ${file} exists in this checkout; run verify in a clean worktree`);
    return 2;
  }
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--full");
  if (unknown.length > 0) {
    console.log(`usage: ./verify [--full]  (unknown argument: ${unknown.join(" ")})`);
    return 2;
  }
  const full = args.includes("--full");
  const checks = await loadChecks();
  const runDir = mkdtempSync(join(tmpdir(), "verify-run-"));
  try {
    const dir = evidenceDir(process.env);
    const env = cleanEnv(process.env, runDir, writeStubs(runDir));
    const before = trackedStatus(ROOT, env);
    const results: CheckResult[] = [];
    for (const c of checks) results.push(await c.run({ root: ROOT, env, evidenceDir: dir, full }));
    const after = trackedStatus(ROOT, env);
    const exitCode = exitCodeFor(results);
    for (const r of results) {
      writeLog(dir, r);
      report(r);
    }
    const warning = writeTrackedChanges(before, after, dir);
    if (warning) console.log(warning);
    writeSummary(dir, results, exitCode);
    console.log(`evidence: ${dir}`);
    return exitCode;
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
}

/** Run main; anything unexpected means the Verifier could not run, which is exit 2. */
async function start(): Promise<number> {
  try {
    return await main();
  } catch (error) {
    console.log(`verify could not run: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

/**
 * Stopped from outside (Ctrl-C, or a Gate or Runner timeout): a check's own
 * cleanup will never run, so stop every server it started now, then exit 2.
 */
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => {
    killAllNow();
    console.log(`verify stopped by ${signal}; every server it started was stopped`);
    process.exit(2);
  });
}

process.exitCode = await start();
