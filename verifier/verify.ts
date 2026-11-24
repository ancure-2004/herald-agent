/**
 * The Verifier's entry: runs every check in CHECKS with a clean environment
 * and a throwaway database, writes Evidence, and exits 0, 1 or 2.
 */
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Check, CheckResult } from "./check.ts";
import { evidenceDir, writeLog, writeSummary } from "./evidence.ts";
import { cleanEnv, refusals } from "./safety.ts";

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
  if (args.length > 0) {
    console.log(`usage: ./verify  (no options; unknown argument: ${args.join(" ")})`);
    return 2;
  }
  const checks = await loadChecks();
  const dbDir = mkdtempSync(join(tmpdir(), "verify-db-"));
  try {
    const env = cleanEnv(process.env, dbDir);
    const results = checks.map((c) => c.run({ root: ROOT, env }));
    const exitCode = exitCodeFor(results);
    const dir = evidenceDir(process.env);
    for (const r of results) {
      writeLog(dir, r);
      report(r);
    }
    writeSummary(dir, results, exitCode);
    console.log(`evidence: ${dir}`);
    return exitCode;
  } finally {
    rmSync(dbDir, { recursive: true, force: true });
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

process.exitCode = await start();
