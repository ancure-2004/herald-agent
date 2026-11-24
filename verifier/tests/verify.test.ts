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
