/**
 * Seam tests for the `feature-map` check, part 3: the locked rules for the
 * map's top level and entry fields, and unreadable folders and map files.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { cleanup, makeFixture, runVerify } from "./fixture.ts";
import { GOOD_ENTRY, checkNames, featureLine, isRoot, map, runMap } from "./feature-map-helpers.ts";

after(cleanup);

test("an unreadable feature folder is a break naming the path, not a crash: exit 1, other checks still run", { skip: isRoot && "root reads everything" }, () => {
  const root = makeFixture({ typecheck: "exit 0", featureMap: map(GOOD_ENTRY), files: { "tests/backend/test_board.py": "def test_drag():\n    pass\n", "frontend/src/features/locked/x.tsx": "export {};\n" } });
  const locked = join(root, "frontend/src/features/locked");
  try {
    chmodSync(locked, 0o000);
    const r = runVerify(root);
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(featureLine(r.stdout), /^feature-map: fail .*frontend\/src\/features\/locked cannot be read: /);
    assert.ok(checkNames(r.evidence).includes("typecheck"), "the other checks are still reported");
  } finally {
    chmodSync(locked, 0o755);
  }
});


test("an unreadable map file is a break naming the file, not a crash: exit 1, not 2", { skip: isRoot && "root reads everything" }, () => {
  const root = makeFixture({ typecheck: "exit 0", featureMap: map(GOOD_ENTRY), files: { "tests/backend/test_board.py": "def test_drag():\n    pass\n" } });
  const mapFile = join(root, "verifier/feature-map.json");
  try {
    chmodSync(mapFile, 0o000);
    const r = runVerify(root);
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(featureLine(r.stdout), /^feature-map: fail .*verifier\/feature-map\.json cannot be read: /);
  } finally {
    chmodSync(mapFile, 0o644);
  }
});


test("a top level that is not { features: [...] } fails, and the line says what it must be", () => {
  const r = runMap(JSON.stringify([GOOD_ENTRY]));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /^feature-map: fail .*the top level must be an object with a "features" list/);
});

test("an object whose features is not a list fails the same way", () => {
  const r = runMap(JSON.stringify({ feature: [GOOD_ENTRY] }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /the top level must be an object with a "features" list/);
});

test("an empty or blank id fails, and the line names the entry by its position", () => {
  const r = runMap(map({ ...GOOD_ENTRY, id: "  " }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /entry #1: id must be a non-empty string/);
});

test("an empty name fails, and the line names the entry", () => {
  const r = runMap(map({ ...GOOD_ENTRY, name: "" }));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(featureLine(r.stdout), /board: name must be a non-empty string/);
});

test("handles or gotchas that is not a list fails, and the line names the field", () => {
  const handles = runMap(map({ ...GOOD_ENTRY, handles: "Kanban Board" }));
  assert.equal(handles.code, 1, handles.stdout + handles.stderr);
  assert.match(featureLine(handles.stdout), /board: handles must be a list/);
  const gotchas = runMap(map({ ...GOOD_ENTRY, gotchas: "watch out" }));
  assert.equal(gotchas.code, 1, gotchas.stdout + gotchas.stderr);
  assert.match(featureLine(gotchas.stdout), /board: gotchas must be a list/);
});

test("missing or empty subFeatures fails, and the line says it needs one { id, what }", () => {
  const { subFeatures: _dropped, ...missing } = GOOD_ENTRY;
  const none = runMap(map(missing));
  assert.equal(none.code, 1, none.stdout + none.stderr);
  assert.match(featureLine(none.stdout), /board: subFeatures must list at least one \{ id, what \}/);
  const empty = runMap(map({ ...GOOD_ENTRY, subFeatures: [] }));
  assert.equal(empty.code, 1, empty.stdout + empty.stderr);
  assert.match(featureLine(empty.stdout), /board: subFeatures must list at least one/);
});

test("a proof with empty or missing covers fails, and the line names the proof", () => {
  const empty = runMap(map({ ...GOOD_ENTRY, proof: [{ test: "tests/backend/test_board.py::test_drag", covers: [] }] }));
  assert.equal(empty.code, 1, empty.stdout + empty.stderr);
  assert.match(featureLine(empty.stdout), /board: proof\[1\] covers must list at least one sub-feature/);
  const missing = runMap(map({ ...GOOD_ENTRY, proof: [{ test: "tests/backend/test_board.py::test_drag" }] }));
  assert.equal(missing.code, 1, missing.stdout + missing.stderr);
  assert.match(featureLine(missing.stdout), /board: proof\[1\] covers must list at least one sub-feature/);
});

