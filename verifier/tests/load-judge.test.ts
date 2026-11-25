/**
 * Unit tests for the load check's judging (load/judge.ts): the median, the
 * fast, slow and broken outcomes against the limits, the status line's wording
 * and the order of the Evidence lines. Expected values are the spec's, worked by hand.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evidenceLines, judge, median, summary } from "../load/judge.ts";

const LIMITS = { targetMs: 500, hardMs: 10_000 };

/** Five tries that each answered 200 in the given milliseconds. */
const ok = (...ms: number[]) => ms.map((n) => ({ ms: n, status: 200 }));

test("the median of an odd count is the middle value; of an even count, the mean of the two middle values", () => {
  assert.equal(median([300, 100, 200]), 200);
  assert.equal(median([100, 200, 300, 400]), 250);
  assert.equal(median([]), 0);
});

test("a median within the target is fast; over it, but every try answered in time, is slow", () => {
  assert.equal(judge({ label: "GET /a", limits: LIMITS, tries: ok(100, 120, 110, 90, 130) }).outcome, "fast");
  assert.equal(judge({ label: "GET /a", limits: LIMITS, tries: ok(600, 620, 610, 590, 630) }).outcome, "slow");
});

test("a try with no answer by the hard limit, or a non-2xx answer, is broken and says why", () => {
  const timedOut = judge({ label: "GET /a", limits: LIMITS, tries: [...ok(100, 100, 100, 100), { ms: 10_000, reason: "timeout" }] });
  assert.equal(timedOut.outcome, "broken");
  assert.equal(timedOut.problem, "no answer within 10 s");
  const status = judge({ label: "GET /a", limits: LIMITS, tries: [...ok(100, 100, 100, 100), { ms: 80, status: 500 }] });
  assert.equal(status.outcome, "broken");
  assert.equal(status.problem, "HTTP 500");
});

test("an answer that came after the hard limit is broken, even with a 200", () => {
  const late = judge({ label: "Leads Table screen", limits: LIMITS, tries: [{ ms: 10_500, status: 200 }] });
  assert.equal(late.outcome, "broken");
  assert.equal(late.problem, "answered after 10 s");
});

test("the status line lists the slow ones with their medians, and names each broken one", () => {
  const slow = judge({ label: "GET /api/leads", limits: LIMITS, tries: ok(2300, 2310, 2320, 2290, 2330) });
  const fast = judge({ label: "GET /api/x", limits: LIMITS, tries: ok(10, 10, 10, 10, 10) });
  assert.equal(summary([fast, slow]), "1 fast, 1 slow; slow: GET /api/leads 2.31 s (target 0.5 s)");
  const broken = judge({ label: "GET /api/y", limits: LIMITS, tries: [...ok(10, 10, 10, 10), { ms: 10_000, reason: "timeout" }] });
  assert.equal(summary([fast, broken]), "broken: GET /api/y (no answer within 10 s); 1 fast, 0 slow");
});

test("the Evidence lines run slowest median first, each with its result, timings and median", () => {
  const fast = judge({ label: "GET /a", name: "a", limits: LIMITS, tries: ok(10, 20, 30, 40, 50) });
  const slow = judge({ label: "GET /b", limits: LIMITS, tries: ok(700, 700, 700, 700, 700) });
  const [first, second] = evidenceLines([fast, slow]);
  assert.equal(first, "slow   GET /b: median 700 ms; timings 700 ms, 700 ms, 700 ms, 700 ms, 700 ms; target 0.5 s, hard 10 s");
  assert.equal(second, "fast   GET /a (a): median 30 ms; timings 10 ms, 20 ms, 30 ms, 40 ms, 50 ms; target 0.5 s, hard 10 s");
});
