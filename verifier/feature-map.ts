/**
 * The Feature map: verifier/feature-map.json, one entry per user feature. This
 * module loads it and returns every break of the locked rules (entry shape,
 * unique ids, existing files and proof tests); see checks/feature-map.ts.
 * The file's top level is `{ "features": [ ...entries ] }`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkEntry, type Seen } from "./feature-entry.ts";
import { isRecord } from "./feature-shape.ts";

/** The map's path, relative to herald's root. */
export const MAP_FILE = "verifier/feature-map.json";

/** One proof: a pytest id and the sub-features of its entry it covers. */
export type Proof = { test: string; covers: string[] };

/** A well-formed-enough entry: its sub-feature ids, claimed files and proofs. */
export type Feature = { id: string; subIds: string[]; files: string[]; proofs: Proof[] };

/** The loaded map: its features (broken ones included, as far as they parse) and every break found. */
export type LoadedMap = { features: Feature[]; breaks: string[] };

/**
 * Load and validate the map under `root`. A missing or unparseable file, or a
 * top level that is not `{ "features": [...] }`, is one break and no features.
 */
export function loadFeatureMap(root: string): LoadedMap {
  const path = join(root, MAP_FILE);
  if (!existsSync(path)) return { features: [], breaks: [`${MAP_FILE} is missing`] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { features: [], breaks: [`${MAP_FILE} does not parse: ${reason}`] };
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.features)) {
    return { features: [], breaks: [`${MAP_FILE}: the top level must be an object with a "features" list`] };
  }
  const seen: Seen = { entries: new Set(), subs: new Set() };
  const features: Feature[] = [];
  const breaks: string[] = [];
  parsed.features.forEach((raw: unknown, index: number) => {
    const result = checkEntry(root, raw, index, seen);
    if (result.feature) features.push(result.feature);
    breaks.push(...result.breaks);
  });
  return { features, breaks };
}
