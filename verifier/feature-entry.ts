/**
 * The locked rules for one Feature map entry: its fields, its files, its
 * sub-features (ids unique across the map) and its proofs. Each break names
 * the entry, so a Worker knows which entry to fix.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Feature, Proof } from "./feature-map.ts";

/** Ids already used by earlier entries: entry ids, and sub-feature ids across the whole map. */
export type Seen = { entries: Set<string>; subs: Set<string> };

/** A JSON object (not an array, not null). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Non-empty text: a string with something other than spaces in it. */
function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** A file (not a folder) that exists under `root`. */
function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

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
  checkFiles(root, raw.files, bad);
  const subIds = checkSubFeatures(raw.subFeatures, seen, bad);
  checkList(raw.handles, "handles", 0, (x) => typeof x === "string", bad, "a string");
  if (!isText(raw.endState)) bad("endState must be a non-empty string");
  checkList(raw.gotchas, "gotchas", 0, (x) => typeof x === "string", bad, "a string");
  const proofs = checkProofs(root, raw.proof, subIds, bad);
  const files = Array.isArray(raw.files) ? raw.files.filter(isText) : [];
  return { feature: { id, subIds, files, proofs }, breaks };
}

/** A list field with at least `min` items, each passing `ok`; `what` names the item type in the break. */
function checkList(value: unknown, field: string, min: number, ok: (x: unknown) => boolean, bad: (m: string) => void, what: string): void {
  if (!Array.isArray(value) || value.length < min) {
    bad(min > 0 ? `${field} must list at least ${min} item(s)` : `${field} must be a list`);
    return;
  }
  value.forEach((item, i) => {
    if (!ok(item)) bad(`${field} item ${i + 1} must be ${what}`);
  });
}

/** `files`: at least one path, each one an existing file or folder under the root. */
function checkFiles(root: string, value: unknown, bad: (m: string) => void): void {
  if (!Array.isArray(value) || value.length === 0) {
    bad("files must list at least one path");
    return;
  }
  for (const path of value) {
    if (!isText(path)) bad("files item must be a non-empty path");
    else if (!existsSync(join(root, path))) bad(`files path "${path}" does not exist`);
  }
}

/** `subFeatures`: at least one `{ id, what }`; ids unique across the map. Returns the valid ids. */
function checkSubFeatures(value: unknown, seen: Seen, bad: (m: string) => void): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    bad("subFeatures must list at least one { id, what }");
    return [];
  }
  const ids: string[] = [];
  for (const sub of value) {
    if (!isRecord(sub) || !isText(sub.id) || !isText(sub.what)) {
      bad("subFeatures item must be { id, what } with non-empty text");
      continue;
    }
    if (seen.subs.has(sub.id)) bad(`sub-feature "${sub.id}" is used more than once in the map`);
    seen.subs.add(sub.id);
    ids.push(sub.id);
  }
  return ids;
}

/**
 * `proof`: may be empty. Each item's `test` is a pytest id whose file exists and,
 * when it names a function, defines it; `covers` lists this entry's own sub-features.
 */
function checkProofs(root: string, value: unknown, subIds: string[], bad: (m: string) => void): Proof[] {
  if (!Array.isArray(value)) {
    bad("proof must be a list");
    return [];
  }
  const proofs: Proof[] = [];
  for (const proof of value) {
    if (!isRecord(proof) || !isText(proof.test)) {
      bad("proof item must be { test, covers } with a non-empty test");
      continue;
    }
    const test = proof.test;
    checkTest(root, test, bad);
    const covers = Array.isArray(proof.covers) ? proof.covers.filter(isText) : [];
    if (!Array.isArray(proof.covers) || covers.length === 0) bad(`proof "${test}" must cover at least one sub-feature`);
    for (const id of covers) {
      if (!subIds.includes(id)) bad(`proof "${test}" covers "${id}", which is not one of this entry's sub-features`);
    }
    proofs.push({ test, covers });
  }
  return proofs;
}

/** A pytest id: `path` must be a file; `path::func` also needs `def func(` (or `async def func(`) in it. */
function checkTest(root: string, test: string, bad: (m: string) => void): void {
  const [file, ...names] = test.split("::");
  if (!isFile(join(root, file))) {
    bad(`proof test file "${file}" does not exist`);
    return;
  }
  if (names.length === 0) return;
  const func = names[names.length - 1];
  if (func === "") {
    bad(`proof test "${test}" names no function after ::`);
    return;
  }
  if (!readFileSync(join(root, file), "utf8").includes(`def ${func}(`)) {
    bad(`proof test "${test}": ${file} has no def ${func}(`);
  }
}
