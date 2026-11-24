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

test("an unlisted failing test exits 1 and the message names its id", () => {
  const root = makeFixture({ typecheck: "exit 0", pytest: 'echo "FAILED test_x.py::test_a - assert 1 == 2"; exit 1' });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /backend-tests: fail \(unlisted failure: test_x\.py::test_a[ ,|)]/);
  assert.equal(backendStatus(r.evidence as string), "fail");
});

test("only listed failing tests exits 0 and backend-tests passes", () => {
  const files = { "verifier/known-failures.txt": "test_x.py::test_a  # rq-test\n" };
  const root = makeFixture({ typecheck: "exit 0", files, pytest: 'echo "FAILED test_x.py::test_a - assert 1 == 2"; exit 1' });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /backend-tests: pass/);
  assert.equal(backendStatus(r.evidence as string), "pass");
});

test("a listed test that no longer fails exits 0 and prints the remove-it line", () => {
  const files = { "verifier/known-failures.txt": "# only the list shrinks\ntest_x.py::test_gone  # rq-test\n" };
  const root = makeFixture({ typecheck: "exit 0", files, pytest: 'echo "1 passed"; exit 0' });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /fixed: test_x\.py::test_gone; remove it from verifier\/known-failures\.txt/);
  assert.equal(backendStatus(r.evidence as string), "pass");
});

test("pytest exit 2 (collection error) fails the check and exits 1", () => {
  const root = makeFixture({ typecheck: "exit 0", pytest: 'echo "ERROR collecting test_x.py"; exit 2' });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /backend-tests: fail/);
  assert.equal(backendStatus(r.evidence as string), "fail");
});
