/**
 * Seam tests for the `feature-map` check, part 2: how a proof's pytest id is
 * matched against its test file (pytest-id.ts), and an unreadable proof file.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { cleanup, makeFixture, runVerify } from "./fixture.ts";
import { GOOD_ENTRY, featureLine, isRoot, map, runMap } from "./feature-map-helpers.ts";

after(cleanup);

/** Run verify with one proof on `test` and the given test file text; the rest of the map is GOOD_ENTRY. */
function proofRun(test: string, source: string) {
  const proof = [{ test, covers: ["board.drag"] }];
  return runMap(map({ ...GOOD_ENTRY, proof }), { "tests/backend/test_board.py": source });
}

test("a def that is commented out does not count as a definition", () => {
  const r = proofRun("tests/backend/test_board.py::test_drag", "# def test_drag():\n#     pass\n");
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: proof\[1\] test "tests\/backend\/test_board\.py::test_drag": .*has no def test_drag\(/);
});

test("async def counts as a definition", () => {
  const r = proofRun("tests/backend/test_board.py::test_drag", "async def test_drag():\n    pass\n");
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

test("Class::method passes when the method is in that class", () => {
  const source = "class TestBoard:\n    def test_drag(self):\n        pass\n";
  const r = proofRun("tests/backend/test_board.py::TestBoard::test_drag", source);
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

test("Wrong::method fails when the method lives in another class", () => {
  const source = "class TestRight:\n    def test_drag(self):\n        pass\n\nclass TestWrong:\n    def test_other(self):\n        pass\n";
  const r = proofRun("tests/backend/test_board.py::TestWrong::test_drag", source);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: proof\[1\] test ".*::TestWrong::test_drag": .*has no def test_drag\(/);
});

test("a parametrize suffix [...] is ignored when looking up the function", () => {
  const r = proofRun("tests/backend/test_board.py::test_drag[case-1]", "def test_drag(x):\n    pass\n");
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

test("path::TestClass passes when the file defines that class", () => {
  const r = proofRun("tests/backend/test_board.py::TestBoard", "class TestBoard:\n    def test_drag(self):\n        pass\n");
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

test("path::TestClass fails when the file has no such class", () => {
  const r = proofRun("tests/backend/test_board.py::TestGone", "class TestBoard:\n    pass\n");
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: proof\[1\] test ".*::TestGone": .*has no def TestGone\( or class TestGone/);
});


test("an unreadable proof file is a break naming the test, not a crash: exit 1", { skip: isRoot && "root reads everything" }, () => {
  const root = makeFixture({ typecheck: "exit 0", featureMap: map(GOOD_ENTRY), files: { "tests/backend/test_board.py": "def test_drag():\n    pass\n" } });
  const proofFile = join(root, "tests/backend/test_board.py");
  try {
    chmodSync(proofFile, 0o000);
    const r = runVerify(root);
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(featureLine(r.stdout), /board: proof\[1\] test ".*::test_drag": tests\/backend\/test_board\.py cannot be read: /);
  } finally {
    chmodSync(proofFile, 0o644);
  }
});

