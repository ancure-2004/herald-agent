/**
 * Judging the load check's timings (checks/load.ts): the median of one call's
 * or screen's tries, one outcome against its limits (fast within the target,
 * slow over it but answered in time, broken with no answer by the hard limit or
 * a non-2xx answer), and the wording of the status line and the Evidence lines.
 */
import type { Limits } from "../load-limits.ts";

/** One timed request: its time in ms, its HTTP status (undefined when no answer came back), and the reason it got none. */
export type Try = { ms: number; status?: number; reason?: string };

/** What a call or screen is: fast, slow (reported, passes) or broken (fails the check). */
export type Outcome = "fast" | "slow" | "broken";

/** One timed call or screen, judged: its label, its limits, its tries, the median, the outcome and, when broken, why. */
export type Measured = { label: string; name?: string; limits: Limits; tries: Try[]; median: number; outcome: Outcome; problem: string };

/** The median of the values (the mean of the two middle ones for an even count); 0 for none. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A time in seconds, two decimals at most: `0.5 s`, `2.31 s`. */
export function sec(ms: number): string {
  return `${Number((ms / 1000).toFixed(2))} s`;
}

/** A timing: milliseconds under a second, seconds above it. */
export function timing(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : sec(ms);
}

/** Why a try got no usable answer: no answer by the hard limit, a warm-up that failed (`warm-up failed: ...`), another error, or a non-2xx status. Undefined when the try is fine. */
function problemOf(t: Try, limits: Limits): string | undefined {
  if (t.status === undefined && t.reason?.startsWith("warm-up")) return t.reason;
  if (t.status === undefined) return t.reason === "timeout" ? `no answer within ${sec(limits.hardMs)}` : `no answer (${t.reason ?? "error"})`;
  if (t.status < 200 || t.status >= 300) return `HTTP ${t.status}`;
  if (t.ms > limits.hardMs) return `answered after ${sec(limits.hardMs)}`;
  return undefined;
}

/**
 * Judge one call or screen from its tries: broken when any try has a problem
 * (the first one is named), else fast when the median is within the target, else slow.
 */
export function judge(input: { label: string; name?: string; limits: Limits; tries: Try[] }): Measured {
  const { label, name, limits, tries } = input;
  const med = median(tries.map((t) => t.ms));
  let problem: string | undefined;
  for (const t of tries) {
    problem = problemOf(t, limits);
    if (problem) break;
  }
  if (problem) return { label, name, limits, tries, median: med, outcome: "broken", problem };
  const outcome: Outcome = med <= limits.targetMs ? "fast" : "slow";
  return { label, name, limits, tries, median: med, outcome, problem: "" };
}

/** A broken item in the status line: its label and why. */
function brokenText(r: Measured): string {
  return `${r.label} (${r.problem})`;
}

/** A slow item in the status line: its label, its real median, and the target. */
function slowText(r: Measured): string {
  return `${r.label} ${timing(r.median)} (target ${sec(r.limits.targetMs)})`;
}

/**
 * The status line's message: `broken: <each broken>; N fast, M slow` when any
 * call or screen is broken, else `N fast, M slow` with `; slow: <each slow>`
 * naming the slow ones with their medians.
 */
export function summary(rows: Measured[]): string {
  const broken = rows.filter((r) => r.outcome === "broken");
  const slow = rows.filter((r) => r.outcome === "slow");
  const fast = rows.filter((r) => r.outcome === "fast").length;
  const counts = `${fast} fast, ${slow.length} slow`;
  if (broken.length > 0) return `broken: ${broken.map(brokenText).join("; ")}; ${counts}`;
  return slow.length > 0 ? `${counts}; slow: ${slow.map(slowText).join("; ")}` : counts;
}

/** The Evidence lines: every call and screen, slowest median first, each with its result, its timings and its median. */
export function evidenceLines(rows: Measured[]): string[] {
  return [...rows]
    .sort((a, b) => b.median - a.median)
    .map((r) => {
      const who = r.name && r.name !== r.label ? ` (${r.name})` : "";
      const timings = r.tries.map((t) => timing(t.ms)).join(", ");
      const why = r.problem ? `; ${r.problem}` : "";
      return `${r.outcome.padEnd(6)} ${r.label}${who}: median ${timing(r.median)}; timings ${timings}; target ${sec(r.limits.targetMs)}, hard ${sec(r.limits.hardMs)}${why}`;
    });
}
