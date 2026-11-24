/**
 * The Verifier's entry: runs every check in CHECKS with a clean environment
 * and a throwaway database, writes Evidence, and exits 0, 1 or 2.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Check, CheckResult } from "./check.ts";
import { evidenceDir, writeLog, writeSummary } from "./evidence.ts";
import { typecheck } from "./checks/typecheck.ts";

/** The herald root: the folder holding `verify`, the parent of verifier/. */
const ROOT = join(import.meta.dirname, "..");

/** Every check, in run order. A new check is a file in checks/ and one line here. */
const CHECKS: Check[] = [typecheck];

/** Lines of a failing check's output shown on stdout. */
const SHOWN_LINES = 10;

/** Print one check's line, and for a failure its first output lines. */
function report(r: CheckResult): void {
  const tail = r.message ? ` (${r.message})` : "";
  console.log(`${r.name}: ${r.status}${tail}`);
  if (r.status === "fail") {
    for (const line of r.output.split("\n").filter((l) => l.trim() !== "").slice(0, SHOWN_LINES)) console.log(`  ${line}`);
  }
}

/** Run the checks; returns the overall exit code. */
function main(): number {
  const dbDir = mkdtempSync(join(tmpdir(), "verify-db-"));
  try {
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      LANG: process.env.LANG ?? "C",
      TERM: process.env.TERM ?? "dumb",
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
      CI: "1",
      DATABASE_URL: `sqlite:///${join(dbDir, "verify.db")}`,
    };
    const results = CHECKS.map((c) => c.run({ root: ROOT, env, dbDir }));
    const exitCode = results.some((r) => r.status === "could-not-run") ? 2 : results.some((r) => r.status === "fail") ? 1 : 0;
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

process.exitCode = main();
