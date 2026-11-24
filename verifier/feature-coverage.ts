/**
 * Gaps and Unmapped files for the Feature map. Both are reports only: they
 * never fail the check. A gap is a sub-feature no proof covers; an unmapped
 * file is one under a feature root that no entry's `files` claims.
 */
import { existsSync, readdirSync, type Dirent } from "node:fs";
import { join, normalize, relative, sep } from "node:path";
import { errorText } from "./feature-fs.ts";
import type { Feature } from "./feature-map.ts";

/** The folders whose files must be claimed by some entry (the feature code, not shared code). */
export const UNMAPPED_ROOTS = [
  "frontend/src/features",
  "backend/app/api/v1/routes",
  "backend/app/services",
  "backend/app/autopilot",
];

/** A `files` entry as it is compared: no trailing slashes, normalized. */
export function claimOf(path: string): string {
  return normalize(path).replace(/[\\/]+$/, "");
}

/** Whether a file (relative to herald's root, `/`-separated) is claimed: equal to a claim, or inside a folder claim. */
export function isClaimed(rel: string, claims: string[]): boolean {
  return claims.some((c) => rel === c || rel.startsWith(`${c}/`));
}

/** A pytest id without its `[...]` parametrize suffix. */
function bareId(id: string): string {
  return id.replace(/\[.*\]$/, "");
}

/**
 * Whether a proof's test id is on the known-failures list. A map id under
 * `tests/backend/` matches a line equal to the rest of it (pytest's id from
 * backend/); any other map id matches a line equal to it. A `[...]` suffix on
 * either side is ignored.
 */
export function isKnownFailing(test: string, known: string[]): boolean {
  const id = bareId(test);
  const backend = "tests/backend/";
  return known.some((line) => {
    const listed = bareId(line);
    return id.startsWith(backend) ? id.slice(backend.length) === listed : id === listed;
  });
}

/**
 * Sub-features no proof of their own entry covers, as "sub-id (entry id)". A
 * proof on the known-failures list covers nothing; a sub-feature whose only
 * proofs are such is a gap that also names them: "sub-id (entry id) - proof
 * known to fail: test1, test2".
 */
export function gapsOf(features: Feature[], known: string[] = []): string[] {
  return features.flatMap((f) =>
    f.subIds.flatMap((sub) => {
      const covering = f.proofs.filter((p) => p.covers.includes(sub));
      if (covering.some((p) => !isKnownFailing(p.test, known))) return [];
      /** Here every covering proof is known to fail (a good one returned above). */
      const failing = covering.map((p) => p.test);
      const named = failing.length > 0 ? ` - proof known to fail: ${failing.join(", ")}` : "";
      return [`${sub} (${f.id})${named}`];
    }),
  );
}

/**
 * Files under the feature roots (relative to `root`, sorted) that no entry's
 * `files` claims. A folder that cannot be read is a problem (a break), named by
 * its path; the files it would have held are simply not listed.
 */
export function unmappedOf(root: string, features: Feature[]): { unmapped: string[]; problems: string[] } {
  const claims = features.flatMap((f) => f.files).map(claimOf);
  const unmapped: string[] = [];
  const problems: string[] = [];
  for (const dir of UNMAPPED_ROOTS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of filesUnder(root, abs, problems)) {
      const rel = relative(root, file).split(sep).join("/");
      if (!isClaimed(rel, claims)) unmapped.push(rel);
    }
  }
  return { unmapped: unmapped.sort(), problems };
}

/** Every file under `dir`, skipping __pycache__ folders, *.pyc and __init__.py; a folder that cannot be read goes to `problems`. */
function filesUnder(root: string, dir: string, problems: string[]): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    problems.push(`${relative(root, dir).split(sep).join("/")} cannot be read: ${errorText(error)}`);
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "__pycache__") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(root, path, problems));
    else if (entry.isFile() && !entry.name.endsWith(".pyc") && entry.name !== "__init__.py") files.push(path);
  }
  return files;
}
