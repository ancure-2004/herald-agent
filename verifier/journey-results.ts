/**
 * What Playwright's JSON report says each journey test did: passed, skipped
 * (test.fixme or test.skip), or failed. The journeys check reads the report the
 * config writes to the journeys' Evidence folder (playwright.config.ts), so a
 * journey that was skipped is never reported as one that ran.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

/** The file name's feature: a journey file minus `.journey.ts` (the same rule as journeys.ts featureOf). */
const SUFFIX = ".journey.ts";

/** One journey test: its feature, and its status in the report. */
export type Outcome = { feature: string; status: string };

/** The `tests` and `specs` and nested `suites` of a report node, as far as the outcomes need them. */
function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Every test in a report's suites, each with the feature of its spec's (or suite's) file. */
function collect(suites: unknown[], inherited: string | undefined, out: Outcome[]): void {
  for (const suite of suites) {
    if (typeof suite !== "object" || suite === null) continue;
    const node = suite as Record<string, unknown>;
    const file = typeof node.file === "string" ? node.file : inherited;
    for (const spec of listOf(node.specs)) {
      if (typeof spec !== "object" || spec === null) continue;
      const specNode = spec as Record<string, unknown>;
      const specFile = typeof specNode.file === "string" ? specNode.file : file;
      for (const test of listOf(specNode.tests)) {
        if (typeof test !== "object" || test === null) continue;
        const status = (test as Record<string, unknown>).status;
        if (typeof status === "string" && specFile !== undefined) out.push({ feature: basename(specFile).replace(SUFFIX, ""), status });
      }
    }
    collect(listOf(node.suites), file, out);
  }
}

/** The outcomes in a report's text: one per journey test; none when the text is not a report. */
export function outcomesOf(text: string): Outcome[] {
  let report: unknown;
  try {
    report = JSON.parse(text);
  } catch {
    return [];
  }
  const out: Outcome[] = [];
  if (typeof report === "object" && report !== null) collect(listOf((report as Record<string, unknown>).suites), undefined, out);
  return out;
}

/** The outcomes in the report file at `path`; none when the file is missing or unreadable. */
export function readOutcomes(path: string): Outcome[] {
  try {
    return outcomesOf(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

/** A passed test (expected or flaky) counts as passed; a skipped test is skipped; anything else failed. */
function passed(outcome: Outcome): boolean {
  return outcome.status === "expected" || outcome.status === "flaky";
}

/**
 * What the run did, in words: `<features> passed`, with `; <features> skipped`
 * for the rest. When nothing passed it says `0 passed, N skipped: <features>`,
 * so a skipped journey is never described as one that ran.
 */
export function summarize(outcomes: Outcome[]): string {
  const passedFeatures = unique(outcomes.filter(passed).map((o) => o.feature));
  const skipped = outcomes.filter((o) => o.status === "skipped");
  const skippedFeatures = unique(skipped.map((o) => o.feature)).filter((f) => !passedFeatures.includes(f));
  if (passedFeatures.length === 0) return `0 passed, ${skipped.length} skipped: ${skippedFeatures.join(", ")}`;
  const parts = [`${passedFeatures.join(", ")} passed`];
  if (skippedFeatures.length > 0) parts.push(`${skippedFeatures.join(", ")} skipped`);
  return parts.join("; ");
}

/** The values once each, in their first order. */
function unique(values: string[]): string[] {
  return [...new Set(values)];
}
