/**
 * Changed features (Decision 6): the files the branch changed against its base
 * (committed, uncommitted and untracked), and the Feature map features those
 * files belong to. A changed file under frontend/ or backend/ that no feature
 * claims makes every feature changed, since shared code can break anything;
 * a change anywhere else (docs/, tests/, verifier/) selects no feature. With
 * no base to compare with, every feature is changed and the reason says why.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { claimOf, isClaimed } from "./feature-coverage.ts";
import { loadFeatureMap, type Feature } from "./feature-map.ts";

/** What changed: the base used (a commit id, or null), the changed files, the changed feature ids, and why every feature is changed when it is. */
export type Changed = {
  base: string | null;
  files: string[];
  features: string[];
  allFeatures: boolean;
  reason: string | null;
  unclaimed: string[];
};

/** The folders whose changes can touch the app; a change elsewhere selects nothing. */
const APP_ROOTS = ["frontend/", "backend/"];

/** The first non-blank line of a text, trimmed; "" when it has none. */
function firstLine(text: string): string {
  return text.split("\n").find((line) => line.trim() !== "")?.trim() ?? "";
}

/** Run git in `root` with the clean environment: its stdout, or the first line of its error. */
function git(root: string, env: Record<string, string>, args: string[]): { ok: true; out: string } | { ok: false; error: string } {
  const r = spawnSync("git", args, { cwd: root, env, encoding: "utf8" });
  if (r.error) return { ok: false, error: r.error.message };
  if (r.status !== 0) return { ok: false, error: firstLine(r.stderr) || `git exited ${r.status}` };
  return { ok: true, out: r.stdout };
}

/** The commit to compare with: VERIFY_BASE when set, else the merge-base of HEAD and main. Or the reason none exists. */
function baseOf(root: string, env: Record<string, string>): { base: string } | { reason: string } {
  const ref = env.VERIFY_BASE;
  if (ref !== undefined && ref !== "") {
    const r = git(root, env, ["rev-parse", "--verify", "-q", `${ref}^{commit}`]);
    return r.ok && r.out.trim() !== "" ? { base: r.out.trim() } : { reason: `no base: VERIFY_BASE "${ref}" is not a commit` };
  }
  const r = git(root, env, ["merge-base", "HEAD", "main"]);
  return r.ok && r.out.trim() !== "" ? { base: r.out.trim() } : { reason: `no base: no merge-base of HEAD and main (${r.ok ? "none" : r.error})` };
}

/** The changed files against `base`: the diff of the working tree (committed and uncommitted), plus untracked files; sorted, or the git error. */
function filesSince(root: string, env: Record<string, string>, base: string): { ok: true; files: string[] } | { ok: false; error: string } {
  const diff = git(root, env, ["diff", "-z", "--name-only", base]);
  if (!diff.ok) return diff;
  const untracked = git(root, env, ["ls-files", "-z", "--others", "--exclude-standard"]);
  if (!untracked.ok) return untracked;
  const names = `${diff.out}${untracked.out}`.split("\0").filter((name) => name !== "");
  return { ok: true, files: [...new Set(names)].sort() };
}

/** Which features the files select, and which app files no feature claims. */
export function classify(files: string[], features: Feature[]): { features: string[]; unclaimed: string[] } {
  const picked = new Set<string>();
  const unclaimed: string[] = [];
  for (const file of files) {
    if (!APP_ROOTS.some((root) => file.startsWith(root))) continue;
    const owners = features.filter((f) => isClaimed(file, f.files.map(claimOf)));
    if (owners.length === 0) unclaimed.push(file);
    for (const owner of owners) picked.add(owner.id);
  }
  return { features: [...picked].sort(), unclaimed };
}

/** Every feature changed, because the base or the files cannot be known. */
function everything(base: string | null, reason: string, features: Feature[]): Changed {
  return { base, files: [], features: features.map((f) => f.id), allFeatures: true, reason, unclaimed: [] };
}

/** The changed files and features of herald's checkout at `root`, compared with the base the clean environment names. */
export function changedSelection(root: string, env: Record<string, string>): Changed {
  const features = loadFeatureMap(root).features;
  const base = baseOf(root, env);
  if ("reason" in base) return everything(null, base.reason, features);
  const listed = filesSince(root, env, base.base);
  if (!listed.ok) return everything(base.base, `no base: ${listed.error}`, features);
  const { features: picked, unclaimed } = classify(listed.files, features);
  if (unclaimed.length > 0) {
    const more = unclaimed.length > 1 ? ` (and ${unclaimed.length - 1} more)` : "";
    const reason = `${unclaimed[0]} is not claimed by any feature${more}`;
    return { base: base.base, files: listed.files, features: features.map((f) => f.id), allFeatures: true, reason, unclaimed };
  }
  return { base: base.base, files: listed.files, features: picked, allFeatures: false, reason: null, unclaimed };
}

/** The lines verify prints: the changed files, then the changed features (or `all features: <reason>`). */
export function changedLines(changed: Changed): string[] {
  const lines = [`changed files: ${changed.files.length}`, ...changed.files.map((file) => `  ${file}`)];
  if (changed.allFeatures) lines.push(`changed features: all features: ${changed.reason}`);
  else lines.push(`changed features: ${changed.features.length > 0 ? changed.features.join(", ") : "none"}`);
  return lines;
}

/** Write changed.log to Evidence: the base, every changed file, the changed features, and the shared files that changed them all. */
export function writeChangedLog(dir: string, changed: Changed): void {
  const lines = [
    `base: ${changed.base ?? "none"}`,
    "--- files ---",
    ...changed.files,
    "--- features ---",
    `features: ${changed.features.length > 0 ? changed.features.join(", ") : "none"}`,
  ];
  if (changed.allFeatures) lines.push(`all features: ${changed.reason}`);
  for (const file of changed.unclaimed) lines.push(`unclaimed: ${file}`);
  writeFileSync(join(dir, "changed.log"), lines.join("\n") + "\n");
}
