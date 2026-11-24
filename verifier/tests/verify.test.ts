/**
 * Seam tests for `verify`: run as a program against a fixture, asserting only
 * on exit code, stdout and the Evidence files.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, exists, makeFixture, readEvidence, runVerify } from "./fixture.ts";

after(cleanup);

test("a passing typecheck exits 0 and leaves Evidence", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  assert.ok(r.evidence.startsWith("/"), "evidence path is absolute");
  assert.ok(exists(`${r.evidence}/typecheck.log`));
  const summary = JSON.parse(readEvidence(r.evidence, "summary.json"));
  assert.equal(summary.exitCode, 0);
  assert.equal(summary.checks[0].name, "typecheck");
  assert.equal(summary.checks[0].status, "pass");
});

test("a failing typecheck exits 1, names the check and the error line, and records fail", () => {
  const root = makeFixture({ typecheck: "echo 'src/a.ts(3,1): error TS2322: bad' && exit 1" });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /typecheck: fail/);
  assert.match(r.stdout, /src\/a\.ts\(3,1\): error TS2322: bad/);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  const summary = JSON.parse(readEvidence(r.evidence, "summary.json"));
  assert.equal(summary.exitCode, 1);
  assert.equal(summary.checks[0].status, "fail");
});

test("a missing frontend/node_modules exits 2 and names `cd frontend && npm ci`", () => {
  const root = makeFixture({ typecheck: "exit 0", nodeModules: false });
  const r = runVerify(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /typecheck: could-not-run/);
  assert.match(r.stdout, /cd frontend && npm ci/);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  const summary = JSON.parse(readEvidence(r.evidence, "summary.json"));
  assert.equal(summary.exitCode, 2);
  assert.equal(summary.checks[0].status, "could-not-run");
});
