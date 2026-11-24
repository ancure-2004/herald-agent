/**
 * Seam tests for `./verify --full`: the flag is the only option accepted, and
 * it reaches every check through its context. Run as a program on a fixture.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, makeFixture, runVerify } from "./fixture.ts";

after(cleanup);

/** A check file a fixture drops into verifier/checks/: it passes and says which mode it got. */
const MODE_CHECK = `import type { Check } from "../check.ts";
export const check: Check = {
  name: "mode",
  run: (ctx) => ({ name: "mode", status: "pass", command: "none", exitCode: 0, durationMs: 0, output: "", message: \`full=\${ctx.full}\` }),
};
`;

test("./verify --full is accepted, and the check sees full mode", () => {
  const root = makeFixture({ typecheck: "exit 0", files: { "verifier/checks/zz-mode.ts": MODE_CHECK } });
  const r = runVerify(root, ["--full"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^mode: pass \(full=true\)$/m);
});

test("without --full the check sees the fast mode", () => {
  const root = makeFixture({ typecheck: "exit 0", files: { "verifier/checks/zz-mode.ts": MODE_CHECK } });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^mode: pass \(full=false\)$/m);
});

test("--full plus any other argument is refused with exit 2", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root, ["--full", "--bogus"]);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /^usage: \.\/verify/m);
});
