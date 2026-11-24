/**
 * Helpers shared by the Feature map's Seam test files: a map built from entry
 * objects, the fixture's good entry, and the feature-map line and log of a run.
 * Each test file imports these; the files themselves hold the tests.
 */
import assert from "node:assert/strict";
import { makeFixture, readEvidence, runVerify } from "./fixture.ts";

/** A one-entry map: `features` is the list of entries, each given as JSON text. */
export function mapOf(...entries: object[]): string {
  return JSON.stringify({ features: entries }, null, 2);
}

/** A well-formed entry for the fixture's demo folder, with one sub-feature and one proof. */
export const GOOD_ENTRY = {
  id: "board",
  name: "Board",
  reach: ["Management sidebar -> Kanban Board"],
  files: ["frontend/src/features/demo"],
  subFeatures: [{ id: "board.drag", what: "drag a card" }],
  handles: ["Kanban Board"],
  endState: "the card shows in the new column",
  gotchas: [],
  proof: [{ test: "tests/backend/test_board.py::test_drag", covers: ["board.drag"] }],
};

/** The feature-map line of a run's stdout, with its status and message. */
export function featureLine(stdout: string): string {
  const line = stdout.split("\n").find((l) => l.startsWith("feature-map: "));
  assert.ok(line, `stdout has a feature-map line: ${stdout}`);
  return line;
}

/** The feature-map.log text of a run; the Evidence folder is the last stdout line. */
export function featureLog(evidence: string | undefined): string {
  assert.ok(evidence, "run printed an Evidence path");
  return readEvidence(evidence, "feature-map.log");
}

/** Run verify on a fixture with this map, the good proof test present, and extra files. */
export function runMap(featureMap: string | null, extra: Record<string, string> = {}) {
  const files = { "tests/backend/test_board.py": "def test_drag():\n    assert True\n", ...extra };
  return runVerify(makeFixture({ typecheck: "exit 0", featureMap, files }));
}

/** A map JSON with the given entries. */
export const map = (...entries: object[]): string => mapOf(...entries);


/** True when this run is root, which can read anything, so a chmod 000 test cannot fail. */
export const isRoot = process.getuid?.() === 0;

/** The names of the checks a run's summary.json lists. */
export function checkNames(evidence: string | undefined): string[] {
  assert.ok(evidence, "run printed an Evidence path");
  return JSON.parse(readEvidence(evidence, "summary.json")).checks.map((c: { name: string }) => c.name);
}
