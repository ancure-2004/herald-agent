/**
 * Gaps and Unmapped files for the Feature map. Both are reports only: they
 * never fail the check. A gap is a sub-feature no proof covers; an unmapped
 * file is one under a feature root that no entry's `files` claims.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, normalize, relative, sep } from "node:path";
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

/** Files under the feature roots (relative to `root`, sorted) that no entry's `files` claims. */
export function unmappedOf(root: string, features: Feature[]): string[] {
  const claims = features.flatMap((f) => f.files).map((c) => normalize(c).replace(/[\\/]+$/, ""));
  const unmapped: string[] = [];
  for (const dir of UNMAPPED_ROOTS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of filesUnder(abs)) {
      const rel = relative(root, file).split(sep).join("/");
      if (!claims.some((c) => rel === c || rel.startsWith(`${c}/`))) unmapped.push(rel);
    }
  }
  return unmapped.sort();
}

/** Every file under `dir`, skipping __pycache__ folders, *.pyc and __init__.py. */
function filesUnder(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__pycache__") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(path));
    else if (entry.isFile() && !entry.name.endsWith(".pyc") && entry.name !== "__init__.py") files.push(path);
  }
  return files;
}
