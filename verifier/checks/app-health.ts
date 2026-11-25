/**
 * The app-health check: starts herald's backend and frontend on free ports with
 * the clean environment (herald.ts), waits until each answers 200, and stops
 * both. A missing venv or node_modules, or no free port, cannot run (exit 2). A
 * crash on start or a readiness timeout fails (exit 1), with the server's log tail.
 */
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { failureOutput, heraldMissing, launchHerald, readyLimits, stopHerald, type Failure, type HeraldPorts } from "../herald.ts";
import type { Server } from "../launch.ts";

/** The app-health check, run with the clean environment in ctx. */
async function run(ctx: CheckContext): Promise<CheckResult> {
  const command = "uvicorn app.main:app; next dev";
  const base = { name: "app-health", command, durationMs: 0 };
  const missing = heraldMissing(ctx.root);
  if (missing) return { ...base, status: "could-not-run", exitCode: null, output: "", message: missing };
  const started = Date.now();
  const notes: string[] = [];
  const note = (line: string) => notes.push(line);
  const servers: Server[] = [];
  let launch: { ports?: HeraldPorts; failure?: Failure } = {};
  let freed = true;
  try {
    launch = await launchHerald(ctx, ctx.evidenceDir, readyLimits(ctx.env), note, servers);
  } finally {
    freed = await stopHerald(servers);
  }
  const durationMs = Date.now() - started;
  if (!launch.ports) {
    return { ...base, status: "could-not-run", exitCode: null, output: "", message: "no free port on 127.0.0.1" };
  }
  if (launch.failure) {
    return { ...base, durationMs, status: "fail", exitCode: 1, output: failureOutput(launch.failure, notes), message: launch.failure.message };
  }
  if (!freed) {
    const message = `a port was still in use after stopping (${launch.ports.backend}, ${launch.ports.frontend})`;
    return { ...base, durationMs, status: "fail", exitCode: 1, output: notes.join("\n"), message };
  }
  return { ...base, durationMs, status: "pass", exitCode: 0, output: notes.join("\n"), message: "" };
}

/** The app-health check. */
export const check: Check = { name: "app-health", run };
