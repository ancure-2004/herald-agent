/**
 * Seam tests for `verify`: run as a program against a fixture, asserting only
 * on exit code, stdout and the Evidence files.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { readFileSync, symlinkSync } from "node:fs";
import { cleanup, exists, makeFixture, readEvidence, runVerify, tempDir } from "./fixture.ts";

after(cleanup);

/** The typecheck's entry in a summary: checks run in file-name order, so it is not always first. */
function typecheckOf(summary: { checks: { name: string }[] }): { name: string; status: string } {
  return summary.checks.find((c) => c.name === "typecheck") as { name: string; status: string };
}

test("a passing typecheck exits 0 and leaves Evidence", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  assert.ok(r.evidence.startsWith("/"), "evidence path is absolute");
  assert.ok(exists(`${r.evidence}/typecheck.log`));
  const summary = JSON.parse(readEvidence(r.evidence, "summary.json"));
  assert.equal(summary.exitCode, 0);
  assert.equal(typecheckOf(summary).name, "typecheck");
  assert.equal(typecheckOf(summary).status, "pass");
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
  assert.equal(typecheckOf(summary).status, "fail");
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
  assert.equal(typecheckOf(summary).status, "could-not-run");
});

/** The typecheck script that leaves a marker file when it runs. */
const MARKER_SCRIPT = "touch ran.marker && exit 0";

for (const file of ["backend/.env", "backend/personal_os.db", "backend/personal_os.db-wal"]) {
  test(`refuses to run when ${file} exists, and runs no check`, () => {
    const root = makeFixture({ typecheck: MARKER_SCRIPT, files: { [file]: "live data\n" } });
    const r = runVerify(root);
    assert.equal(r.code, 2, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(r.stdout, /clean worktree/);
    assert.equal(exists(join(root, "frontend", "ran.marker")), false, "no check ran");
  });
}

test("checks run with only the allowed environment and a throwaway database that is then removed", () => {
  const root = makeFixture({ typecheck: "env > env.txt && exit 0" });
  const r = runVerify(root, [], { SECRET_API_KEY: "x", DIRECT_URL: "y", VERIFY_FOO: "z" });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const vars = new Map(readFileSync(join(root, "frontend", "env.txt"), "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)] as const;
  }));
  assert.equal(vars.has("SECRET_API_KEY"), false);
  assert.equal(vars.has("DIRECT_URL"), false);
  assert.equal(vars.get("VERIFY_FOO"), "z");
  assert.equal(vars.get("CI"), "1");
  /** npm adds its own variables to the scripts it runs; the caller's are the allow list. */
  const allowed = new Set(["PATH", "HOME", "LANG", "TERM", "TMPDIR", "CI", "DATABASE_URL", "COLOR", "EDITOR", "INIT_CWD", "NODE", "PWD"]);
  for (const name of vars.keys()) {
    assert.ok(allowed.has(name) || name.startsWith("VERIFY_") || name.startsWith("npm_"), `unexpected variable ${name}`);
  }
  const url = vars.get("DATABASE_URL") ?? "";
  assert.ok(url.startsWith("sqlite:///"), url);
  const dbFile = url.slice("sqlite://".length);
  assert.equal(exists(dirname(dbFile)), false, "the throwaway database folder is removed after the run");
});

test("VERIFY_EVIDENCE_DIR receives the Evidence and keeps it after the run", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const dir = join(tempDir("verify-evidence-set-"), "kept");
  const r = runVerify(root, [], { VERIFY_EVIDENCE_DIR: dir });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(r.evidence, dir);
  assert.ok(exists(join(dir, "summary.json")));
  assert.ok(exists(join(dir, "typecheck.log")));
});

test("an unknown flag exits 2 with a usage line", () => {
  const root = makeFixture({ typecheck: MARKER_SCRIPT });
  const r = runVerify(root, ["--bogus"]);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^usage: \.\/verify/m);
  assert.equal(exists(join(root, "frontend", "ran.marker")), false, "no check ran");
});

/** A check file a fixture drops into verifier/checks/: it always reports could-not-run. */
const CANNOT_RUN_CHECK = `import type { Check } from "../check.ts";
export const check: Check = {
  name: "cannot",
  run: () => ({ name: "cannot", status: "could-not-run", command: "none", exitCode: null, durationMs: 0, output: "", message: "planted" }),
};
`;

test("checks are found in verifier/checks/, and a check that could not run wins over one that failed: exit 2", () => {
  const root = makeFixture({ typecheck: "exit 1", files: { "verifier/checks/zz-cannot.ts": CANNOT_RUN_CHECK } });
  const r = runVerify(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /typecheck: fail/);
  assert.match(r.stdout, /cannot: could-not-run/);
});

test("a dangling symlink at backend/.env is refused too", () => {
  const root = makeFixture({ typecheck: MARKER_SCRIPT });
  symlinkSync(join(root, "nowhere"), join(root, "backend", ".env"));
  const r = runVerify(root);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /refused: backend\/\.env/);
});

test("the refusal comes before anything else, even an unknown flag", () => {
  const root = makeFixture({ typecheck: MARKER_SCRIPT, files: { "backend/.env": "live\n" } });
  const r = runVerify(root, ["--bogus"]);
  assert.equal(r.code, 2);
  assert.match(r.stdout, /refused: backend\/\.env/);
});

test("npm's own `>` header lines don't push the first error off the shown lines", () => {
  /** From a script file, so npm's echo of the command can't contain the expected text. */
  const noisy = Array.from({ length: 12 }, (_, i) => `echo '> noise ${i}'`).join("\n") + "\necho 'src/b.ts(1,1): error TS1: real'\nexit 1\n";
  const root = makeFixture({ typecheck: "sh noisy.sh", files: { "frontend/noisy.sh": noisy } });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /src\/b\.ts\(1,1\): error TS1: real/);
});
