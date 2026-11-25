/**
 * Seam tests for changed-feature selection: `verify` run as a program on a git
 * fixture. A test commits a base, changes files, and reads which files and
 * features the run reports in its output, summary.json and changed.log.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, commitAll, gitIn, makeFixture, readEvidence, runVerify } from "./fixture.ts";

after(cleanup);

/** The `changed` object of a run's summary.json. */
function changedOf(evidence: string | undefined): { base: string | null; files: string[]; features: string[]; allFeatures: boolean; reason: string | null } {
  assert.ok(evidence, "run printed an Evidence path");
  return JSON.parse(readEvidence(evidence, "summary.json")).changed;
}

/** Write a file into a fixture, creating its folders. */
function put(root: string, path: string, text = "changed\n"): void {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text);
}

/** A git fixture with the one-entry demo map, its base commit made, and the run's fake checks passing. */
function gitFixture(files: Record<string, string> = {}) {
  return makeFixture({ typecheck: "exit 0", git: true, files });
}

test("a changed file a feature claims selects that feature, and the output and summary name both", () => {
  const root = gitFixture();
  put(root, "frontend/src/features/demo/index.tsx");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^ {2}frontend\/src\/features\/demo\/index\.tsx$/m);
  assert.match(r.stdout, /^changed features: demo$/m);
  const changed = changedOf(r.evidence);
  assert.deepEqual(changed.files, ["frontend/src/features/demo/index.tsx"]);
  assert.deepEqual(changed.features, ["demo"]);
  assert.equal(changed.allFeatures, false);
});

test("a new untracked file in a claimed folder counts as changed", () => {
  const root = gitFixture();
  put(root, "frontend/src/features/demo/new.tsx");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.deepEqual(changedOf(r.evidence).features, ["demo"]);
});

test("a committed change counts when VERIFY_BASE names the base commit", () => {
  const root = gitFixture();
  const base = gitIn(root, ["rev-parse", "HEAD"]);
  put(root, "frontend/src/features/demo/index.tsx");
  commitAll(root, "change demo");
  const r = runVerify(root, [], { VERIFY_BASE: base });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(changedOf(r.evidence).base, base);
  assert.deepEqual(changedOf(r.evidence).features, ["demo"]);
});

test("without VERIFY_BASE the base is the merge-base with main, so a commit on main itself changes nothing", () => {
  const root = gitFixture();
  put(root, "frontend/src/features/demo/index.tsx");
  commitAll(root, "change demo");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.deepEqual(changedOf(r.evidence).files, []);
  assert.deepEqual(changedOf(r.evidence).features, []);
});

test("a renamed file lists its old path too, so the old folder's feature is changed as well", () => {
  const root = gitFixture({ "frontend/src/features/demo/old.tsx": "export const a = 1;\n" });
  const base = gitIn(root, ["rev-parse", "HEAD"]);
  gitIn(root, ["mv", "frontend/src/features/demo/old.tsx", "frontend/src/features/demo/new.tsx"]);
  commitAll(root, "rename");
  const r = runVerify(root, [], { VERIFY_BASE: base });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.deepEqual(changedOf(r.evidence).files, ["frontend/src/features/demo/new.tsx", "frontend/src/features/demo/old.tsx"]);
});

test("a changed journey file selects the feature its name gives, so editing a journey runs it in the fast set", () => {
  const root = gitFixture();
  put(root, "verifier/journeys/demo.journey.ts", "// journey\n");
  const r = runVerify(root);
  assert.deepEqual(changedOf(r.evidence).features, ["demo"]);
  assert.equal(changedOf(r.evidence).allFeatures, false);
});

test("a change only under docs/, tests/ or verifier/ selects no feature", () => {
  const root = gitFixture();
  put(root, "docs/notes.md");
  put(root, "tests/backend/test_x.py", "def test_x():\n    pass\n");
  put(root, "verifier/notes.txt");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(changedOf(r.evidence).files.length, 3);
  assert.deepEqual(changedOf(r.evidence).features, []);
  assert.equal(changedOf(r.evidence).allFeatures, false);
  assert.match(r.stdout, /^changed features: none$/m);
});

test("a changed frontend file no feature claims makes every feature changed, and the reason names it", () => {
  const root = gitFixture();
  put(root, "frontend/src/shared/Button.tsx");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const changed = changedOf(r.evidence);
  assert.equal(changed.allFeatures, true);
  assert.match(changed.reason ?? "", /frontend\/src\/shared\/Button\.tsx/);
  assert.match(r.stdout, /^changed features: all features: frontend\/src\/shared\/Button\.tsx/m);
});

test("with no git repository every feature counts as changed, and the reason starts `no base:`", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const changed = changedOf(r.evidence);
  assert.equal(changed.allFeatures, true);
  assert.match(changed.reason ?? "", /^no base: /);
});

test("a VERIFY_BASE that is not a commit makes every feature changed, and the reason names the ref", () => {
  const root = gitFixture();
  const r = runVerify(root, [], { VERIFY_BASE: "no-such-ref" });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const changed = changedOf(r.evidence);
  assert.equal(changed.allFeatures, true);
  assert.match(changed.reason ?? "", /^no base: .*no-such-ref/);
});

test("changed.log in Evidence lists every changed file and the reason", () => {
  const root = gitFixture();
  put(root, "frontend/src/features/demo/index.tsx");
  put(root, "docs/a.md");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const log = readEvidence(r.evidence ?? "", "changed.log");
  assert.match(log, /^frontend\/src\/features\/demo\/index\.tsx$/m);
  assert.match(log, /^docs\/a\.md$/m);
  assert.match(log, /^features: demo$/m);
});

test("the run itself writes nothing into the repository", () => {
  const root = gitFixture();
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(gitIn(root, ["status", "--porcelain"]), "");
});
