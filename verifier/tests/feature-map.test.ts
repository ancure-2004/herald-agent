/**
 * Seam tests for the `feature-map` check: `verify` run as a program against a
 * fixture whose verifier/feature-map.json, feature folders and pytest files the
 * test writes. Asserts only on exit code, stdout and the Evidence files.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, makeFixture, readEvidence, runVerify } from "./fixture.ts";

after(cleanup);

/** A one-entry map: `features` is the list of entries, each given as JSON text. */
function mapOf(...entries: object[]): string {
  return JSON.stringify({ features: entries }, null, 2);
}

/** A well-formed entry for the fixture's demo folder, with one sub-feature and one proof. */
const GOOD_ENTRY = {
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

test("a well-formed map with every proof present passes, and the status line says so", () => {
  const files = { "tests/backend/test_board.py": "def test_drag():\n    assert True\n" };
  const root = makeFixture({ typecheck: "exit 0", featureMap: mapOf(GOOD_ENTRY), files });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^feature-map: pass/m);
  const summary = JSON.parse(readEvidence(r.evidence as string, "summary.json"));
  assert.equal(summary.checks.find((c: { name: string }) => c.name === "feature-map").status, "pass");
});

/** The feature-map line of a run's stdout, with its status and message. */
function featureLine(stdout: string): string {
  const line = stdout.split("\n").find((l) => l.startsWith("feature-map: "));
  assert.ok(line, `stdout has a feature-map line: ${stdout}`);
  return line;
}

/** The feature-map.log text of a run; the Evidence folder is the last stdout line. */
function featureLog(evidence: string | undefined): string {
  assert.ok(evidence, "run printed an Evidence path");
  return readEvidence(evidence, "feature-map.log");
}

/** Run verify on a fixture with this map, the good proof test present, and extra files. */
function runMap(featureMap: string | null, extra: Record<string, string> = {}) {
  const files = { "tests/backend/test_board.py": "def test_drag():\n    assert True\n", ...extra };
  return runVerify(makeFixture({ typecheck: "exit 0", featureMap, files }));
}

/** A map JSON with the given entries. */
const map = (...entries: object[]): string => mapOf(...entries);

test("a missing field fails, and the line names the entry and the field", () => {
  const { endState: _dropped, ...noEndState } = GOOD_ENTRY;
  const r = runMap(map(noEndState));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: fail .*board: endState must be a non-empty string/);
});

test("two entries with the same id fail, and the line names the id", () => {
  const r = runMap(map(GOOD_ENTRY, { ...GOOD_ENTRY, subFeatures: [{ id: "board.other", what: "x" }], proof: [] }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: duplicate entry id/);
});

test("a sub-feature id used by two entries fails, and the line names it", () => {
  const other = { ...GOOD_ENTRY, id: "cockpit", subFeatures: [{ id: "board.drag", what: "same id" }], proof: [] };
  const r = runMap(map(GOOD_ENTRY, other));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /cockpit: sub-feature "board\.drag" is used more than once/);
});

test("a listed file that does not exist fails, and the line names the path", () => {
  const r = runMap(map({ ...GOOD_ENTRY, files: ["frontend/src/features/gone.tsx"] }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: files path "frontend\/src\/features\/gone\.tsx" does not exist/);
});

test("a proof whose test file is missing fails, and the line names the test", () => {
  const r = runVerify(makeFixture({ typecheck: "exit 0", featureMap: map(GOOD_ENTRY) }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: proof test file "tests\/backend\/test_board\.py" does not exist/);
});

test("a proof naming a function the file does not define fails, and the line names the test id", () => {
  const r = runMap(map({ ...GOOD_ENTRY, proof: [{ test: "tests/backend/test_board.py::test_renamed", covers: ["board.drag"] }] }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: proof test "tests\/backend\/test_board\.py::test_renamed": .*no def test_renamed\(/);
});

test("a proof covering another entry's sub-feature fails, and the line names it", () => {
  const foreign = { id: "cockpit", name: "Cockpit", reach: ["Cockpit"], files: ["frontend/src/features/demo"], subFeatures: [{ id: "cockpit.x", what: "x" }], handles: [], endState: "x", gotchas: [], proof: [] };
  const bad = { ...GOOD_ENTRY, proof: [{ test: "tests/backend/test_board.py::test_drag", covers: ["cockpit.x"] }] };
  const r = runMap(map(bad, foreign));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: proof "tests\/backend\/test_board\.py::test_drag" covers "cockpit\.x", which is not one of this entry's sub-features/);
});

test("a missing map fails with exit 1 (not 2), and the line says it is missing", () => {
  const r = runMap(null);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: fail .*verifier\/feature-map\.json is missing/);
});

test("an unparseable map fails with exit 1, and the line says it does not parse", () => {
  const r = runMap("{ not json");
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: fail .*verifier\/feature-map\.json does not parse/);
});

test("several breaks in several entries are all listed, on the line and in the log", () => {
  const second = { ...GOOD_ENTRY, id: "cockpit", subFeatures: [{ id: "cockpit.x", what: "x" }], files: ["frontend/src/features/nope"], proof: [] };
  const broken = { ...GOOD_ENTRY, reach: [], proof: [{ test: "tests/backend/test_board.py::test_gone", covers: ["board.drag"] }] };
  const r = runMap(map(broken, second));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  const line = featureLine(r.stdout);
  assert.match(line, /board: reach must list at least 1 item/);
  assert.match(line, /board: proof test "tests\/backend\/test_board\.py::test_gone": .*no def test_gone\(/);
  assert.match(line, /cockpit: files path "frontend\/src\/features\/nope" does not exist/);
  assert.match(featureLog(r.evidence), /board: reach must list/);
});

test("gaps and unmapped files are listed in the log and do not fail the check", () => {
  const files = {
    "backend/app/services/extra.py": "x = 1\n",
    "backend/app/services/__init__.py": "",
    "backend/app/services/__pycache__/extra.cpython.pyc": "",
    "backend/app/services/old.pyc": "",
  };
  const withGap = { ...GOOD_ENTRY, subFeatures: [{ id: "board.drag", what: "drag" }, { id: "board.filter", what: "filter" }] };
  const r = runMap(map(withGap), files);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: pass/);
  const log = featureLog(r.evidence);
  assert.match(log, /Gaps \(1\)[\s\S]*board\.filter \(board\)/);
  assert.match(log, /Unmapped \(1\)[\s\S]*backend\/app\/services\/extra\.py/);
  assert.doesNotMatch(log, /__init__|\.pyc/);
});

test("a folder entry claims the files inside it, and a file entry claims its one file", () => {
  const files = {
    "frontend/src/features/demo/other.tsx": "export {};\n",
    "backend/app/services/claimed.py": "x = 1\n",
    "backend/app/services/loose.py": "x = 2\n",
  };
  const claim = { ...GOOD_ENTRY, files: ["frontend/src/features/demo", "backend/app/services/claimed.py"] };
  const r = runMap(map(claim), files);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const log = featureLog(r.evidence);
  assert.match(log, /Unmapped \(1\)/);
  assert.match(log, /backend\/app\/services\/loose\.py/);
  assert.doesNotMatch(log, /features\/demo\/other\.tsx|claimed\.py/);
});

test("a passing run writes the full report to feature-map.log, with proof counts", () => {
  const files = { "tests/backend/test_board.py": "def test_drag():\n    assert True\n" };
  const r = runVerify(makeFixture({ typecheck: "exit 0", featureMap: map(GOOD_ENTRY), files }));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const log = featureLog(r.evidence);
  assert.match(log, /features: 1 in verifier\/feature-map\.json/);
  assert.match(log, /board: 1 proof\(s\)/);
  assert.match(log, /Gaps \(0\)/);
  assert.match(log, /Unmapped \(0\)/);
  assert.match(log, /Breaks \(0\)/);
});

test("the Breaks section comes first in the report, so a fail's shown lines include it", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `board.extra${i}`, what: "a gap" }));
  const r = runMap(map({ ...GOOD_ENTRY, subFeatures: [...GOOD_ENTRY.subFeatures, ...many], reach: [] }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.ok(r.stdout.split("\n").includes("  Breaks (1)"), `the shown lines include the Breaks header: ${r.stdout}`);
  const log = featureLog(r.evidence);
  assert.ok(log.indexOf("Breaks (1)") < log.indexOf("features: 1"), "Breaks comes before the feature counts");
  assert.ok(log.indexOf("Breaks (1)") < log.indexOf("Gaps ("), "Breaks comes before the gaps");
});
