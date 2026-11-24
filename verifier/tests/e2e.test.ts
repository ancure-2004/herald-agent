/**
 * Seam tests for the `e2e` check: `verify` run as a program against a fixture
 * whose backend/.venv/bin/python is a fake script the test controls.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, makeFixture, readEvidence, runVerify } from "./fixture.ts";

after(cleanup);

/** The summary's status for the e2e check. */
function e2eStatus(evidence: string): string {
  const summary = JSON.parse(readEvidence(evidence, "summary.json"));
  return summary.checks.find((c: { name: string }) => c.name === "e2e").status;
}

test("a passing E2E run exits 0 and e2e passes", () => {
  const root = makeFixture({ typecheck: "exit 0", e2e: 'echo "1 passed"; exit 0' });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /e2e: pass/);
  assert.equal(e2eStatus(r.evidence as string), "pass");
});
