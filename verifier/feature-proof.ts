/**
 * The proof rules for one Feature map entry. Each `proof` item names a pytest
 * test: its file must exist and, when the id names a function, define it.
 * `covers` lists one or more of the entry's own sub-features. Each break names
 * the item by its number, such as `proof[2]`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Proof } from "./feature-map.ts";
import { errorText, kindOf } from "./feature-fs.ts";
import { isRecord, isText } from "./feature-shape.ts";

/** `proof`: may be empty. Each item is `{ test, covers }`; the good ones are returned. */
export function checkProofs(root: string, value: unknown, subIds: string[], bad: (m: string) => void): Proof[] {
  if (!Array.isArray(value)) {
    bad("proof must be a list");
    return [];
  }
  const proofs: Proof[] = [];
  value.forEach((proof: unknown, i: number) => {
    const at = `proof[${i + 1}]`;
    if (!isRecord(proof) || !isText(proof.test)) {
      bad(`${at} must be { test, covers } with a non-empty test`);
      return;
    }
    const test = proof.test;
    checkTest(root, at, test, bad);
    proofs.push({ test, covers: checkCovers(proof.covers, at, subIds, bad) });
  });
  return proofs;
}

/** `covers`: at least one item, each a text sub-feature id of this entry. Returns the valid ids. */
function checkCovers(value: unknown, at: string, subIds: string[], bad: (m: string) => void): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    bad(`${at} covers must list at least one sub-feature`);
    return [];
  }
  const ids: string[] = [];
  value.forEach((id: unknown, i: number) => {
    const where = `${at} covers[${i + 1}]`;
    if (!isText(id)) bad(`${where} must be a non-empty sub-feature id`);
    else if (!subIds.includes(id)) bad(`${where} "${id}" is not one of this entry's sub-features`);
    else ids.push(id);
  });
  return ids;
}

/** A pytest id: `path` must be a file; `path::func` also needs `def func(` (or `async def func(`) in it. */
function checkTest(root: string, at: string, test: string, bad: (m: string) => void): void {
  const [file, ...names] = test.split("::");
  const kind = kindOf(join(root, file));
  if ("error" in kind) {
    bad(`${at} test "${test}": ${file} cannot be read: ${kind.error}`);
    return;
  }
  if (kind.kind !== "file") {
    bad(`${at} test file "${file}" ${kind.kind === "missing" ? "does not exist" : "is not a file"}`);
    return;
  }
  if (names.length === 0) return;
  const func = names[names.length - 1];
  if (func === "") {
    bad(`${at} test "${test}" names no function after ::`);
    return;
  }
  let source: string;
  try {
    source = readFileSync(join(root, file), "utf8");
  } catch (error) {
    bad(`${at} test "${test}": ${file} cannot be read: ${errorText(error)}`);
    return;
  }
  if (!source.includes(`def ${func}(`)) bad(`${at} test "${test}": ${file} has no def ${func}(`);
}
