/**
 * Timing the backend calls for the load check (checks/load.ts): one GET that
 * is not counted (the warm-up), then five timed GETs, each with the call's hard
 * limit as its time-out. A call that gets no answer by then counts as the limit.
 */
import type { CallSpec } from "../load-limits.ts";
import type { Try } from "./judge.ts";

/** How many timed GETs each call gets after its warm-up. */
export const TRIES = 5;

/** The error text of anything thrown, for a try that failed for another reason. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One GET, timed to the end of its body: its status when it answered in time, else why it did not (`timeout` at the hard limit). */
export async function timeGet(url: string, hardMs: number): Promise<Try> {
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(hardMs) });
    await res.arrayBuffer();
    return { ms: performance.now() - started, status: res.status };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ms: performance.now() - started, reason: timedOut ? "timeout" : errorText(error) };
  }
}

/** The five timed tries of one call against the backend at `base` (a warm-up GET comes first and is not returned). */
export async function measureCall(base: string, spec: CallSpec): Promise<Try[]> {
  const url = base + spec.path;
  await timeGet(url, spec.limits.hardMs);
  const tries: Try[] = [];
  for (let i = 0; i < TRIES; i++) tries.push(await timeGet(url, spec.limits.hardMs));
  return tries;
}
