/**
 * Seam tests for the `feature-map` check, part 5: a journey proof
 * (`verifier/journeys/<file>.ts::<title>`) is valid when its file exists under
 * verifier/journeys/ and defines a test with that title; it is never a known
 * failure, so it always covers its sub-feature.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, makeFixture, runVerify } from "./fixture.ts";
import { GOOD_ENTRY, featureLine, featureLog, map } from "./feature-map-helpers.ts";

after(cleanup);

/** A journey file's text: one test with the given title, written the way Playwright tests are. */
const journey = (title: string, quote = '"') => `import { test } from "@playwright/test";\n\ntest(${quote}${title}${quote}, async () => {});\n`;

/**
 * Run verify with the board entry proven by `proofTest`, and the given journey
 * file (null: no file) and known-failures text. Only the feature-map line is
 * asserted: the journeys check may be could-not-run here, as no Playwright is installed.
 */
function run(proofTest: string, file: string | null, known?: string | null) {
  const entry = { ...GOOD_ENTRY, proof: [{ test: proofTest, covers: ["board.drag"] }] };
  const files = file === null ? {} : { "verifier/journeys/board.journey.ts": file };
  return runVerify(makeFixture({ typecheck: "exit 0", featureMap: map(entry), knownFailures: known, files }));
}

test("a journey proof whose file defines the title (double quotes) passes, and leaves no gap", () => {
  const r = run("verifier/journeys/board.journey.ts::adds a lead", journey("adds a lead"));
  assert.match(featureLine(r.stdout), /^feature-map: pass/, r.stdout);
  assert.match(featureLog(r.evidence), /^Gaps \(0\)/m);
});

test("single quotes around the title count too", () => {
  const r = run("verifier/journeys/board.journey.ts::adds a lead", journey("adds a lead", "'"));
  assert.match(featureLine(r.stdout), /^feature-map: pass/, r.stdout);
});

test("a journey proof whose title the file does not define is a break that names the proof", () => {
  const r = run("verifier/journeys/board.journey.ts::removes a lead", journey("adds a lead"));
  assert.match(featureLine(r.stdout), /board: proof\[1\] test ".*::removes a lead": .*has no test "removes a lead"/);
});

test("a journey proof whose file does not exist is a break", () => {
  const r = run("verifier/journeys/board.journey.ts::adds a lead", null);
  assert.match(featureLine(r.stdout), /proof\[1\] test file "verifier\/journeys\/board\.journey\.ts" does not exist/);
});

test("a journey proof outside verifier/journeys/ is a break", () => {
  const r = run("tests/journeys/board.journey.ts::adds a lead", journey("adds a lead"));
  assert.match(featureLine(r.stdout), /proof\[1\] test file "tests\/journeys\/board\.journey\.ts" must be under verifier\/journeys\//);
});

test("a journey proof on known-failures.txt still covers its sub-feature: journeys are never known failures", () => {
  const r = run("verifier/journeys/board.journey.ts::adds a lead", journey("adds a lead"), "verifier/journeys/board.journey.ts::adds a lead\n");
  assert.match(featureLine(r.stdout), /^feature-map: pass/, r.stdout);
  assert.match(featureLog(r.evidence), /^Gaps \(0\)/m);
});
