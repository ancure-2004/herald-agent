/**
 * Seam tests for the app-health check: `verify` run as a program against a
 * fixture whose fake uvicorn and next the test controls. No real server starts.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { cleanup, exists, makeFixture, runVerify } from "./fixture.ts";

after(cleanup);

test("healthy fakes: app-health passes, exit 0, and Evidence has both server logs and its own", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^app-health: pass$/m);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  for (const file of ["backend.log", "frontend.log", "app-health.log"]) {
    assert.ok(exists(join(r.evidence, file)), file);
  }
});
