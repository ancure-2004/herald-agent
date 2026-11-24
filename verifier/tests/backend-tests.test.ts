/**
 * Seam tests for the `backend-tests` check: `verify` run as a program against
 * a fixture whose backend/.venv/bin/pytest is a fake script the test controls.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, makeFixture, readEvidence, runVerify } from "./fixture.ts";

after(cleanup);

/** The summary's status for the backend-tests check. */
function backendStatus(evidence: string): string {
  const summary = JSON.parse(readEvidence(evidence, "summary.json"));
  return summary.checks.find((c: { name: string }) => c.name === "backend-tests").status;
}

test("a passing pytest exits 0 and backend-tests passes", () => {
  const root = makeFixture({ typecheck: "exit 0", pytest: 'echo "1 passed"; exit 0' });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /backend-tests: pass/);
  assert.equal(backendStatus(r.evidence as string), "pass");
});

test("a missing backend/.venv exits 2 and names the setup command", () => {
  const root = makeFixture({ typecheck: "exit 0", noVenv: true });
  const r = runVerify(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /backend-tests: could-not-run/);
  assert.match(r.stdout, /cd backend && python3 -m venv \.venv && \.venv\/bin\/pip install -e "\.\[dev\]" -r requirements\.txt/);
  assert.equal(backendStatus(r.evidence as string), "could-not-run");
});
