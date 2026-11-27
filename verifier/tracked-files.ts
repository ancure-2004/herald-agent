/**
 * The tracked-file watch: `git status --porcelain` before and after the
 * checks. Any difference is a warning (not a failure) and is written to
 * Evidence as tracked-changes.txt. A tracked file that was clean before the
 * checks and changed by them is put back (`git checkout --`), so a run leaves
 * the checkout as it found it (Guild's Gate refuses a step that changes the
 * Ticket's files); a file already changed before the checks is left alone.
 * Outside a git repo the watch is skipped.
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

/** The path of a porcelain line: what follows the two status letters and a space. */
function pathOf(line: string): string {
  return line.slice(3);
}

/** Put back the tracked files that were clean before the checks and changed by them; returns their paths. */
export function putBack(root: string, before: string[] | undefined, after: string[] | undefined, env: Record<string, string>): string[] {
  if (!before || !after) return [];
  const dirty = new Set(before.map(pathOf));
  const paths = [...new Set(changedLines(before, after).filter((line) => !line.startsWith("??")).map(pathOf))].filter((p) => !dirty.has(p));
  if (paths.length === 0) return [];
  const r = spawnSync("git", ["checkout", "--", ...paths], { cwd: root, env, encoding: "utf8" });
  return r.error || r.status !== 0 ? [] : paths;
}

/**
 * Compare the two snapshots: when they differ, write the differing lines to
 * `tracked-changes.txt` in the Evidence folder and return the warning to print.
 * Returns no warning when either snapshot is missing or nothing differs.
 */
export function writeTrackedChanges(before: string[] | undefined, after: string[] | undefined, dir: string, putBackPaths: string[] = []): string | undefined {
  if (!before || !after) return undefined;
  const lines = changedLines(before, after);
  if (lines.length === 0) return undefined;
  writeFileSync(join(dir, "tracked-changes.txt"), lines.join("\n") + "\n");
  const paths = [...new Set(lines.map(pathOf))];
  const back = paths.filter((p) => putBackPaths.includes(p));
  const left = paths.filter((p) => !putBackPaths.includes(p));
  return [
    back.length > 0 ? `warning: checks changed tracked files (put back): ${back.join(", ")}` : "",
    left.length > 0 ? `warning: checks changed tracked files: ${left.join(", ")}` : "",
  ].filter((line) => line !== "").join("\n");
}
