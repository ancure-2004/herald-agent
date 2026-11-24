/**
 * The feature-map check: verifier/feature-map.json must parse and every entry
 * must be well formed (feature-map.ts, feature-entry.ts). Gaps and unmapped
 * files are listed in the report but never change the status. Reads files
 * only: it runs no program and starts no server.
 */
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { gapsOf, isKnownFailing, unmappedOf } from "../feature-coverage.ts";
import { loadFeatureMap, MAP_FILE, type Feature } from "../feature-map.ts";
import { knownFailures } from "../known-failures.ts";

/** The report: breaks first (so a fail's shown lines include them), then each feature's proof counts, gaps and unmapped files. */
function report(features: Feature[], known: string[], gaps: string[], unmapped: string[], breaks: string[]): string {
  const lines = [`Breaks (${breaks.length})`];
  for (const b of breaks) lines.push(`  ${b}`);
  lines.push("", `features: ${features.length} in ${MAP_FILE}`);
  for (const f of features) {
    const failing = f.proofs.filter((p) => isKnownFailing(p.test, known)).length;
    lines.push(`  ${f.id}: ${f.proofs.length} proof(s), ${failing} known to fail`);
  }
  lines.push("", `Gaps (${gaps.length}): sub-features no proof covers`);
  for (const gap of gaps) lines.push(`  ${gap}`);
  lines.push("", `Unmapped (${unmapped.length}): feature files no entry claims`);
  for (const file of unmapped) lines.push(`  ${file}`);
  return lines.join("\n");
}

/** Run the check: any break fails it (exit 1); gaps and unmapped files are reported only. */
function run(ctx: CheckContext): CheckResult {
  const started = Date.now();
  const loaded = loadFeatureMap(ctx.root);
  const features = loaded.features;
  const known = knownFailures(ctx.root);
  const gaps = gapsOf(features, known);
  const scan = unmappedOf(ctx.root, features);
  const unmapped = scan.unmapped;
  const breaks = [...loaded.breaks, ...scan.problems];
  const failed = breaks.length > 0;
  const message = failed ? breaks.join("; ") : `${gaps.length} gap(s), ${unmapped.length} unmapped file(s): reported, not failing`;
  return {
    name: "feature-map",
    status: failed ? "fail" : "pass",
    command: `read ${MAP_FILE} (no program run)`,
    exitCode: failed ? 1 : 0,
    durationMs: Date.now() - started,
    output: report(features, known, gaps, unmapped, breaks),
    message,
  };
}

/** The feature-map check. */
export const check: Check = { name: "feature-map", run };
