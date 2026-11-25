/**
 * The shape every check shares: a name, and a run function that returns one
 * result, now or after it finishes (a check may wait on a server). A check
 * never decides the exit code; verify.ts does.
 */
import type { Changed } from "./changed.ts";

/** How a check ended: passed, failed its own test, or could not run at all. */
export type Status = "pass" | "fail" | "could-not-run";

/**
 * Everything a check gets: the herald root, the clean environment it must run
 * with, the Evidence folder (already created) for logs written during the run,
 * the run's temp folder (removed at the end; a throwaway database may live in it),
 * whether this run is `--full` (every journey, and the load check) rather than
 * the fast set, and the changed files and features the fast set is chosen from.
 */
export type CheckContext = { root: string; env: Record<string, string>; evidenceDir: string; runDir: string; full: boolean; changed: Changed };

/** One check's outcome, as written to its log and to summary.json. */
export type CheckResult = {
  name: string;
  status: Status;
  command: string;
  exitCode: number | null;
  durationMs: number;
  output: string;
  message: string;
};

/** A check: one file in checks/ exporting one of these as `check`. */
export type Check = { name: string; run: (ctx: CheckContext) => CheckResult | Promise<CheckResult> };
