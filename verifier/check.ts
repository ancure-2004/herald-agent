/**
 * The shape every check shares: a name, and a run function that returns one
 * result, now or after it finishes (a check may wait on a server). A check
 * never decides the exit code; verify.ts does.
 */

/** How a check ended: passed, failed its own test, or could not run at all. */
export type Status = "pass" | "fail" | "could-not-run";

/**
 * Everything a check gets: the herald root, the clean environment it must run
 * with, and the Evidence folder (already created) for logs written during the run.
 */
export type CheckContext = { root: string; env: Record<string, string>; evidenceDir: string };

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
