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

/** Sub-features no proof of their own entry covers, as "sub-id (entry id)". */
export function gapsOf(features: Feature[]): string[] {
  return features.flatMap((f) => f.subIds.filter((sub) => !f.proofs.some((p) => p.covers.includes(sub))).map((sub) => `${sub} (${f.id})`));
}

/**
 * Files under the feature roots (relative to `root`, sorted) that no entry's
 * `files` claims. A folder that cannot be read is a problem (a break), named by
 * its path; the files it would have held are simply not listed.
 */
export function unmappedOf(root: string, features: Feature[]): { unmapped: string[]; problems: string[] } {
  const claims = features.flatMap((f) => f.files).map((c) => normalize(c).replace(/[\\/]+$/, ""));
  const unmapped: string[] = [];
  const problems: string[] = [];
  for (const dir of UNMAPPED_ROOTS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of filesUnder(root, abs, problems)) {
      const rel = relative(root, file).split(sep).join("/");
      if (!claims.some((c) => rel === c || rel.startsWith(`${c}/`))) unmapped.push(rel);
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
