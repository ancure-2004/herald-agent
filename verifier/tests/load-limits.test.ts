/**
 * Unit tests for the load check's limits file (load-limits.ts): the real numbers
 * the spec sets (the source of truth), and the scale the Seam tests use to shrink them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { limitsNote, loadLimits } from "../load-limits.ts";

test("the real limits: 2000 leads with seed 42; calls target 500 ms and hard 10 s; screens target 5 s and hard 30 s", () => {
  const limits = loadLimits({});
  assert.equal(limits.leads, 2000);
  assert.equal(limits.seed, 42);
  assert.equal(limits.calls.length, 5);
  for (const call of limits.calls) {
    assert.deepEqual(call.limits, { targetMs: 500, hardMs: 10_000 }, call.label);
    assert.ok(call.path.startsWith("/api/"), call.path);
  }
  assert.deepEqual(
    limits.screens.map((s) => s.label),
    ["Management Overview", "Leads Table"],
  );
  for (const screen of limits.screens) assert.deepEqual(screen.limits, { targetMs: 5_000, hardMs: 30_000 }, screen.label);
});

test("VERIFY_LOAD_LIMITS_SCALE multiplies every target and hard limit; an unset or bad value leaves them as they are", () => {
  const scaled = loadLimits({ VERIFY_LOAD_LIMITS_SCALE: "0.5" });
  assert.deepEqual(scaled.calls[0]!.limits, { targetMs: 250, hardMs: 5_000 });
  assert.deepEqual(scaled.screens[1]!.limits, { targetMs: 2_500, hardMs: 15_000 });
  for (const bad of ["", "0", "-2", "x"]) {
    assert.deepEqual(loadLimits({ VERIFY_LOAD_LIMITS_SCALE: bad }).calls[0]!.limits, { targetMs: 500, hardMs: 10_000 }, bad);
  }
});

test("every call is a GET path under /api/ with a source line in the frontend", () => {
  for (const call of loadLimits({}).calls) {
    assert.match(call.source, /^frontend\/src\/.*:\d+$|^frontend\/src\/.*\(reads/, call.source);
  }
});

test("limitsNote names a scale other than 1 as a test setting; it is empty at 1 or unset", () => {
  assert.equal(limitsNote({ VERIFY_LOAD_LIMITS_SCALE: "0.1" }), "limits scaled ×0.1 (test setting)");
  assert.equal(limitsNote({ VERIFY_LOAD_LIMITS_SCALE: "1" }), "");
  assert.equal(limitsNote({}), "");
});
