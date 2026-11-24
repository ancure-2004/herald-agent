/**
 * The locked rules for one Feature map entry: its fields, its files, its
 * sub-features (ids unique across the map) and its proofs. Each break names
 * the entry, so a Worker knows which entry to fix, and list items by number.
 */
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Feature } from "./feature-map.ts";
import { kindOf } from "./feature-fs.ts";
import { checkProofs } from "./feature-proof.ts";
import { checkList, isRecord, isText } from "./feature-shape.ts";

/** Ids already used by earlier entries: entry ids, and sub-feature ids across the whole map. */
export type Seen = { entries: Set<string>; subs: Set<string> };

/**
 * Check one entry (the `index`th item of `features`). Returns its breaks and,
 * when it is an object, the feature as far as it is well formed.
 */
export function checkEntry(root: string, raw: unknown, index: number, seen: Seen): { feature?: Feature; breaks: string[] } {
  if (!isRecord(raw)) return { breaks: [`entry #${index + 1}: not an object`] };
  const breaks: string[] = [];
  const id = isText(raw.id) ? raw.id : `entry #${index + 1}`;
  const bad = (message: string): void => {
    breaks.push(`${id}: ${message}`);
  };
  if (!isText(raw.id)) bad("id must be a non-empty string");
  else if (seen.entries.has(raw.id)) bad("duplicate entry id");
  else seen.entries.add(raw.id);
  if (!isText(raw.name)) bad("name must be a non-empty string");
  checkList(raw.reach, "reach", 1, isText, bad, "a non-empty string");
  const files = checkFiles(root, raw.files, bad);
  const subIds = checkSubFeatures(raw.subFeatures, seen, bad);
  checkList(raw.handles, "handles", 0, (x) => typeof x === "string", bad, "a string");
  if (!isText(raw.endState)) bad("endState must be a non-empty string");
  checkList(raw.gotchas, "gotchas", 0, (x) => typeof x === "string", bad, "a string");
  const proofs = checkProofs(root, raw.proof, subIds, bad);
  return { feature: { id, subIds, files, proofs }, breaks };
}

/**
 * `files`: at least one path. Each is relative, inside herald and not the root
 * itself, and must exist (a file or a folder). Returns the text paths.
 */
function checkFiles(root: string, value: unknown, bad: (m: string) => void): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    bad("files must list at least one path");
    return [];
  }
  const paths: string[] = [];
  value.forEach((path: unknown, i: number) => {
    const at = `files[${i + 1}]`;
    if (!isText(path)) {
      bad(`${at} must be a non-empty path`);
      return;
    }
    paths.push(path);
    const rel = relative(root, resolve(root, path));
    if (isAbsolute(path) || rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      bad(`${at} "${path}" must be a path inside herald (relative, not the root itself)`);
      return;
    }
    const kind = kindOf(join(root, path));
    if ("error" in kind) bad(`${at} "${path}" cannot be read: ${kind.error}`);
    else if (kind.kind === "missing") bad(`${at} "${path}" does not exist`);
  });
  return paths;
}

/** `subFeatures`: at least one `{ id, what }`; ids unique across the map. Returns the valid ids. */
function checkSubFeatures(value: unknown, seen: Seen, bad: (m: string) => void): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    bad("subFeatures must list at least one { id, what }");
    return [];
  }
  const ids: string[] = [];
  value.forEach((sub: unknown, i: number) => {
    const at = `subFeatures[${i + 1}]`;
    if (!isRecord(sub) || !isText(sub.id) || !isText(sub.what)) {
      bad(`${at} must be { id, what } with non-empty text`);
      return;
    }
    if (seen.subs.has(sub.id)) bad(`${at} "${sub.id}" is used more than once in the map`);
    seen.subs.add(sub.id);
    ids.push(sub.id);
  });
  return ids;
}
