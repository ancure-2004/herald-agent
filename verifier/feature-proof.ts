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
import { definesJourneyTest, JOURNEY_DIR, journeyId } from "./journey-id.ts";
import { definesTest, parseTestId } from "./pytest-id.ts";

/** `proof`: may be empty. Each item is `{ test, covers }`; the good ones are returned. */
export function checkProofs(root: string, value: unknown, featureId: string, subIds: string[], bad: (m: string) => void): Proof[] {
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
    checkTest(root, at, test, featureId, bad);
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

/** A test id: a journey proof (see journey-id.ts), else a pytest id: `path` must be a file; a name after `::` must be defined in it (see pytest-id.ts). */
function checkTest(root: string, at: string, test: string, featureId: string, bad: (m: string) => void): void {
  const journey = journeyId(test);
  if (journey) {
    checkJourney(root, at, journey, featureId, bad);
    return;
  }
  const { file, names } = parseTestId(test);
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
  const last = names[names.length - 1];
  if (last === "") {
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
  if (!definesTest(source, names)) bad(`${at} test "${test}": ${file} has no def ${last}( or class ${last}`);
}

/** A journey proof: its file must be under verifier/journeys/, exist, and define a test with its title. */
function checkJourney(root: string, at: string, { file, title }: { file: string; title: string }, featureId: string, bad: (m: string) => void): void {
  if (!file.startsWith(JOURNEY_DIR)) {
    bad(`${at} test file "${file}" must be under ${JOURNEY_DIR}`);
    return;
  }
  /** The fast set selects a journey by its file name, so the file must be this entry's own, with no `..` or other folder. */
  const own = `${JOURNEY_DIR}${featureId}.journey.ts`;
  if (file !== own) {
    bad(`${at} test file "${file}" must be ${own}`);
    return;
  }
  const kind = kindOf(join(root, file));
  if ("error" in kind) {
    bad(`${at} test file "${file}" cannot be read: ${kind.error}`);
    return;
  }
  if (kind.kind !== "file") {
    bad(`${at} test file "${file}" ${kind.kind === "missing" ? "does not exist" : "is not a file"}`);
    return;
  }
  let source: string;
  try {
    source = readFileSync(join(root, file), "utf8");
  } catch (error) {
    bad(`${at} test file "${file}" cannot be read: ${errorText(error)}`);
    return;
  }
  if (!definesJourneyTest(source, title)) bad(`${at} test "${file}::${title}": ${file} has no test "${title}"`);
}
