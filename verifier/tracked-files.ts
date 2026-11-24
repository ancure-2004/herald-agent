/**
 * The tracked-file watch: `git status --porcelain` before and after the
 * checks. Any difference is a warning (not a failure) and is written to
 * Evidence as tracked-changes.txt. Outside a git repo the watch is skipped.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** The `git status --porcelain` lines of root, or undefined when git cannot report (not a repo, no git). */
export function trackedStatus(root: string, env: Record<string, string>): string[] | undefined {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: root, env, encoding: "utf8" });
  if (r.error || r.status !== 0) return undefined;
  return r.stdout.split("\n").filter((line) => line !== "");
}

/** The lines present in one snapshot but not the other, in either direction. */
export function changedLines(before: string[], after: string[]): string[] {
  const was = new Set(before);
  const now = new Set(after);
  return [...after.filter((line) => !was.has(line)), ...before.filter((line) => !now.has(line))];
}

/**
 * Compare the two snapshots: when they differ, write the differing lines to
 * `tracked-changes.txt` in the Evidence folder and return the warning to print.
 * Returns no warning when either snapshot is missing or nothing differs.
 */
export function writeTrackedChanges(before: string[] | undefined, after: string[] | undefined, dir: string): string | undefined {
  if (!before || !after) return undefined;
  const lines = changedLines(before, after);
  if (lines.length === 0) return undefined;
  writeFileSync(join(dir, "tracked-changes.txt"), lines.join("\n") + "\n");
  /** The path is what follows the two status letters and a space. */
  const paths = [...new Set(lines.map((line) => line.slice(3)))];
  return `warning: checks changed tracked files: ${paths.join(", ")}`;
}
