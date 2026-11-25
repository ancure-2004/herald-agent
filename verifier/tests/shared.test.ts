/**
 * Seam tests for what every check shares: the stub commands that refuse to
 * spend quota, and the warning when a check changes tracked files.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { cleanup, exists, makeFixture, readEvidence, runVerify } from "./fixture.ts";

after(cleanup);

/** Fake pytest: runs each paid command, records its exit code and the path `command -v` finds, and keeps its stderr. */
const PROBE_PYTEST = 'for c in agy gemini claude; do "$c" 2>> probe-err.txt; echo "$c rc=$?" >> probe.txt; command -v "$c" >> probe.txt; done; echo "1 passed"; exit 0';

test("agy, gemini and claude are stubs that refuse at once, found first on PATH, and removed after the run", () => {
  const root = makeFixture({ typecheck: "exit 0", pytest: PROBE_PYTEST });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const lines = readFileSync(join(root, "backend", "probe.txt"), "utf8").trim().split("\n");
  const err = readFileSync(join(root, "backend", "probe-err.txt"), "utf8");
  for (const name of ["agy", "gemini", "claude"]) {
    assert.ok(lines.includes(`${name} rc=1`), `${name} exits 1: ${lines.join(" / ")}`);
    assert.match(err, new RegExp(`blocked by verify: ${name}`));
    const path = lines[lines.indexOf(`${name} rc=1`) + 1];
    assert.match(path, new RegExp(`stub-bin/${name}$`), `${name} resolves to a stub`);
    assert.equal(exists(dirname(path)), false, `the stub folder is removed after the run: ${dirname(path)}`);
  }
});

/** Run git in a fixture with a fixed identity; fails the test if git fails. */
function git(root: string, ...args: string[]): void {
  const r = spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...args], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
}

test("a check that changes a tracked file prints the warning, writes tracked-changes.txt, and keeps exit 0", () => {
  const root = makeFixture({ typecheck: "exit 0", pytest: 'echo "1 passed" && echo two >> ../data.txt && exit 0', files: { "data.txt": "one\n" } });
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "fixture");
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^warning: checks changed tracked files: data\.txt$/m);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  assert.match(readEvidence(r.evidence, "tracked-changes.txt"), /data\.txt/);
});
