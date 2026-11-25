/**
 * Seam tests for the `e2e` check: `verify` run as a program against a fixture
 * whose backend/.venv/bin/python is a fake script the test controls.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

test("a missing backend/.venv exits 2 and e2e names the setup command", () => {
  const root = makeFixture({ typecheck: "exit 0", noVenv: true });
  const r = runVerify(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  /** The backend-tests line names the same command too, so the assertion is on the e2e line alone. */
  assert.match(r.stdout, /^e2e: could-not-run \(.*cd backend && python3 -m venv \.venv && \.venv\/bin\/pip install -e "\.\[dev\]" -r requirements\.txt\)$/m);
  assert.equal(e2eStatus(r.evidence as string), "could-not-run");
});

test("an unlisted ERROR line (a set-up crash) with exit 1 fails e2e, and the message names its id", () => {
  const root = makeFixture({ typecheck: "exit 0", e2e: 'echo "ERROR tests/e2e/x.py::test_a - boom"; exit 1' });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^e2e: fail \(unlisted failure: tests\/e2e\/x\.py::test_a[ ,|)]/m);
  assert.equal(e2eStatus(r.evidence as string), "fail");
});

test("an unlisted SKIPPED line with exit 0 still fails e2e (pytest exits 0 when only skips), and the message names it", () => {
  const root = makeFixture({ typecheck: "exit 0", e2e: 'echo "SKIPPED [1] tests/e2e/x.py:12: pending"; exit 0' });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^e2e: fail \(unlisted failure: tests\/e2e\/x\.py:12[ ,|)]/m);
  assert.equal(e2eStatus(r.evidence as string), "fail");
});

test("listed FAILED, ERROR and SKIPPED ids only (exit 1) pass e2e", () => {
  const files = { "verifier/known-failures.txt": "tests/e2e/a.py::t1  # rq-test\ntests/e2e/a.py::t2  # rq-test\ntests/e2e/a.py:12  # rq-test\n" };
  const e2e = 'echo "FAILED tests/e2e/a.py::t1 - x"; echo "ERROR tests/e2e/a.py::t2 - boom"; echo "SKIPPED [1] tests/e2e/a.py:12: pending"; exit 1';
  const root = makeFixture({ typecheck: "exit 0", files, e2e });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^e2e: pass \(still failing \(listed\): tests\/e2e\/a\.py::t1, tests\/e2e\/a\.py::t2, tests\/e2e\/a\.py:12\)$/m);
  assert.equal(e2eStatus(r.evidence as string), "pass");
});

test("a listed id that passed prints the remove-it line and exits 0", () => {
  const files = { "verifier/known-failures.txt": "tests/e2e/x.py::test_gone  # rq-test\n" };
  const root = makeFixture({ typecheck: "exit 0", files, e2e: 'echo "1 passed"; exit 0' });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^e2e: pass \(fixed: tests\/e2e\/x\.py::test_gone; remove it from verifier\/known-failures\.txt\)$/m);
  assert.equal(e2eStatus(r.evidence as string), "pass");
});

test("E2E_BASE_URL set by the caller never reaches the E2E runner", () => {
  const root = makeFixture({ typecheck: "exit 0", e2e: "env > e2e-env.txt; echo \"1 passed\"; exit 0" });
  const r = runVerify(root, [], { E2E_BASE_URL: "http://127.0.0.1:9" });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const dump = readFileSync(join(root, "e2e-env.txt"), "utf8");
  assert.match(dump, /^PATH=/m, "the runner did run and dumped its environment");
  assert.doesNotMatch(dump, /E2E_BASE_URL/);
});

test("each check reports as fixed only its own listed tests, not the other check's", () => {
  const list = "tests/e2e/x.py::test_e2e_listed  # rq\ntest_y.py::test_backend_listed  # rq\n";
  const root = makeFixture({ typecheck: "exit 0", files: { "verifier/known-failures.txt": list } });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const line = (name: string) => r.stdout.split("\n").find((l) => l.startsWith(`${name}: `)) ?? "";
  assert.match(line("e2e"), /fixed: tests\/e2e\/x\.py::test_e2e_listed/);
  assert.doesNotMatch(line("e2e"), /test_backend_listed/);
  assert.match(line("backend-tests"), /fixed: test_y\.py::test_backend_listed/);
  assert.doesNotMatch(line("backend-tests"), /test_e2e_listed/);
});

test("a listed test that still fails is shown on its check's line, and the check still passes", () => {
  const list = "tests/e2e/x.py::test_known  # rq\n";
  const root = makeFixture({
    typecheck: "exit 0",
    e2e: 'echo "FAILED tests/e2e/x.py::test_known - needs a real model"; exit 1',
    files: { "verifier/known-failures.txt": list },
  });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const line = r.stdout.split("\n").find((l) => l.startsWith("e2e: ")) ?? "";
  assert.match(line, /^e2e: pass \(still failing \(listed\): tests\/e2e\/x\.py::test_known\)/);
  assert.doesNotMatch(r.stdout.split("\n").find((l) => l.startsWith("backend-tests: ")) ?? "", /still failing/);
});
