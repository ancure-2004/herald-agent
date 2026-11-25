/**
 * Seam tests for the `feature-map` check, part 4: a proof on the known-failures
 * list (a test that fails on every run) covers nothing, so its sub-feature is a
 * gap; the report says why, and the per-feature line counts the known ones.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, makeFixture, runVerify } from "./fixture.ts";
import { GOOD_ENTRY, featureLine, featureLog, map } from "./feature-map-helpers.ts";

after(cleanup);

/** The board entry with one sub-feature and the given proofs; every proof's test file is written by `files`. */
function entryWith(proof: { test: string; covers: string[] }[], subs = ["board.drag"]) {
  return { ...GOOD_ENTRY, subFeatures: subs.map((id) => ({ id, what: id })), proof };
}

/** Run verify on a map with the known-failures list text, and the given test files. */
function knownRun(entry: object, known: string | null, files: Record<string, string> = {}) {
  const base = { "tests/backend/test_board.py": "def test_drag():\n    pass\n\ndef test_other():\n    pass\n" };
  return runVerify(makeFixture({ typecheck: "exit 0", featureMap: map(entry), knownFailures: known, files: { ...base, ...files } }));
}

test("a backend proof on the list is a gap, and the report names it", () => {
  const entry = entryWith([{ test: "tests/backend/test_board.py::test_drag", covers: ["board.drag"] }]);
  const r = knownRun(entry, "test_board.py::test_drag  # rq-test\n");
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(featureLog(r.evidence), /^  board\.drag \(board\) - proof known to fail: tests\/backend\/test_board\.py::test_drag$/m);
});

test("an e2e id is matched in full, and a [param] suffix is ignored on either side", () => {
  const e2e = "def test_w(x):\n    pass\n";
  const onMap = entryWith([{ test: "tests/e2e/test_f.py::test_w[case-1]", covers: ["board.drag"] }]);
  const listed = knownRun(onMap, "tests/e2e/test_f.py::test_w\n", { "tests/e2e/test_f.py": e2e });
  assert.match(featureLog(listed.evidence), /^  board\.drag \(board\) - proof known to fail: tests\/e2e\/test_f\.py::test_w\[case-1\]$/m);
  const onList = entryWith([{ test: "tests/e2e/test_f.py::test_w", covers: ["board.drag"] }]);
  const suffixed = knownRun(onList, "tests/e2e/test_f.py::test_w[case-2]  # rq-test\n", { "tests/e2e/test_f.py": e2e });
  assert.match(featureLog(suffixed.evidence), /^  board\.drag \(board\) - proof known to fail: tests\/e2e\/test_f\.py::test_w$/m);
});

test("every known-failing proof of a gap is listed on its line", () => {
  const entry = entryWith([
    { test: "tests/backend/test_board.py::test_drag", covers: ["board.drag"] },
    { test: "tests/backend/test_board.py::test_other", covers: ["board.drag"] },
  ]);
  const r = knownRun(entry, "test_board.py::test_drag\ntest_board.py::test_other\n");
  assert.match(
    featureLog(r.evidence),
    /^  board\.drag \(board\) - proof known to fail: tests\/backend\/test_board\.py::test_drag, tests\/backend\/test_board\.py::test_other$/m,
  );
});

test("a sub-feature with one known-failing proof and one good proof is not a gap", () => {
  const entry = entryWith([
    { test: "tests/backend/test_board.py::test_drag", covers: ["board.drag"] },
    { test: "tests/backend/test_board.py::test_other", covers: ["board.drag"] },
  ]);
  const r = knownRun(entry, "test_board.py::test_drag\n");
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(featureLog(r.evidence), /^Gaps \(0\)/m);
});

test("the per-feature line counts the proofs and the known ones", () => {
  const entry = entryWith([
    { test: "tests/backend/test_board.py::test_drag", covers: ["board.drag"] },
    { test: "tests/backend/test_board.py::test_other", covers: ["board.drag"] },
  ]);
  const r = knownRun(entry, "test_board.py::test_drag\n");
  assert.match(featureLog(r.evidence), /^  board: 2 proof\(s\), 1 known to fail$/m);
});

test("a known-failing proof never fails the check: the status stays pass", () => {
  const entry = entryWith([{ test: "tests/backend/test_board.py::test_drag", covers: ["board.drag"] }]);
  const r = knownRun(entry, "test_board.py::test_drag\n");
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: pass/);
});

test("a missing known-failures.txt means no known failures, and no break", () => {
  const files = { "tests/backend/test_board.py": "def test_drag():\n    pass\n" };
  const r = runVerify(makeFixture({ typecheck: "exit 0", featureMap: map(GOOD_ENTRY), knownFailures: null, files }));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: pass/);
  assert.match(featureLog(r.evidence), /^  board: 1 proof\(s\), 0 known to fail$/m);
  assert.match(featureLog(r.evidence), /^Gaps \(0\)/m);
});
