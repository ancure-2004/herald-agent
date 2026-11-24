/**
 * The app-health check: starts herald's backend and frontend on free ports with
 * the clean environment, waits until each answers 200, and stops both. A
 * missing venv or node_modules, or no free port, cannot run (exit 2). A crash
 * on start or a readiness timeout fails (exit 1), with the server's log tail.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Check, CheckContext, CheckResult } from "../check.ts";
import { ended, freePort, logTail, startServer, stopServer, waitReady, type Server } from "../launch.ts";
import { VENV_SETUP } from "../pytest-check.ts";

/** herald's usual ports (start.sh, the demo engine); the check never takes them. */
const RESERVED_PORTS = [8000, 3000, 3001];

/** How many lines of a failing server's log are shown. */
const TAIL_LINES = 20;

/** A free port, other than the reserved ones and any already `taken`. */
async function pickPort(taken: number[]): Promise<number> {
  for (;;) {
    const port = await freePort();
    if (!RESERVED_PORTS.includes(port) && !taken.includes(port)) return port;
  }
}

/** A readiness limit in seconds from the environment (the VERIFY_* tuning), or the default when unset or not a positive number. */
function seconds(env: Record<string, string>, name: string, fallback: number): number {
  const value = Number(env[name]);
  return env[name] !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Why the check failed: the server at fault, and a one-line reason. */
type Failure = { server: Server; message: string };

/** Wait for the backend, then the frontend; the first one not ready is the failure, or none when both answer. */
async function readiness(
  backend: Server,
  frontend: Server,
  ports: { backend: number; frontend: number },
  limits: { backend: number; frontend: number },
  note: (line: string) => void,
): Promise<Failure | undefined> {
  const backendUrl = `http://127.0.0.1:${ports.backend}/api/health`;
  if (!(await waitReady(backend, backendUrl, limits.backend * 1000, note))) {
    return { server: backend, message: ended(backend) ? "backend crashed on start" : `backend not ready within ${limits.backend} s` };
  }
  const frontendUrl = `http://127.0.0.1:${ports.frontend}/`;
  if (!(await waitReady(frontend, frontendUrl, limits.frontend * 1000, note))) {
    return { server: frontend, message: ended(frontend) ? "frontend crashed on start" : `frontend not ready within ${limits.frontend} s` };
  }
  return undefined;
}

/** The app-health check, run with the clean environment in ctx. */
async function run(ctx: CheckContext): Promise<CheckResult> {
  const command = "uvicorn app.main:app; next dev";
  const base = { name: "app-health", command, durationMs: 0 };
  const uvicorn = join(ctx.root, "backend", ".venv", "bin", "uvicorn");
  const next = join(ctx.root, "frontend", "node_modules", ".bin", "next");
  if (!existsSync(uvicorn)) {
    return { ...base, status: "could-not-run", exitCode: null, output: "", message: `backend/.venv/bin/uvicorn is missing; run: ${VENV_SETUP}` };
  }
  if (!existsSync(next)) {
    return { ...base, status: "could-not-run", exitCode: null, output: "", message: "frontend/node_modules/.bin/next is missing; run: cd frontend && npm ci" };
  }
  const started = Date.now();
  const notes: string[] = [];
  const note = (line: string) => notes.push(line);
  const limits = {
    backend: seconds(ctx.env, "VERIFY_BACKEND_READY_SECONDS", 60),
    frontend: seconds(ctx.env, "VERIFY_FRONTEND_READY_SECONDS", 180),
  };
  const backendPort = await pickPort([]);
  const frontendPort = await pickPort([backendPort]);
  const ports = { backend: backendPort, frontend: frontendPort };
  const servers: Server[] = [];
  let failure: Failure | undefined;
  let freed = true;
  try {
    const backend = startServer({
      name: "backend",
      port: backendPort,
      program: uvicorn,
      args: ["app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      cwd: join(ctx.root, "backend"),
      env: { ...ctx.env, CORS_ORIGINS: `http://127.0.0.1:${frontendPort},http://localhost:${frontendPort}` },
      logPath: join(ctx.evidenceDir, "backend.log"),
    });
    servers.push(backend);
    const frontend = startServer({
      name: "frontend",
      port: frontendPort,
      program: next,
      args: ["dev", "--port", String(frontendPort), "--hostname", "127.0.0.1"],
      cwd: join(ctx.root, "frontend"),
      env: { ...ctx.env, NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${backendPort}`, NEXT_TELEMETRY_DISABLED: "1" },
      logPath: join(ctx.evidenceDir, "frontend.log"),
    });
    servers.push(frontend);
    failure = await readiness(backend, frontend, ports, limits, note);
  } finally {
    for (const server of servers) {
      if (!(await stopServer(server))) freed = false;
    }
  }
  const durationMs = Date.now() - started;
  if (failure) {
    const logName = `${failure.server.name}.log`;
    const tail = logTail(failure.server.logPath, TAIL_LINES);
    const output = [failure.message, `--- last ${TAIL_LINES} lines of ${logName} ---`, ...tail, "--- requests ---", ...notes].join("\n");
    return { ...base, durationMs, status: "fail", exitCode: 1, output, message: failure.message };
  }
  if (!freed) {
    const message = `a port was still in use after stopping (${backendPort}, ${frontendPort})`;
    return { ...base, durationMs, status: "fail", exitCode: 1, output: notes.join("\n"), message };
  }
  return { ...base, durationMs, status: "pass", exitCode: 0, output: notes.join("\n"), message: "" };
}

/** The app-health check. */
export const check: Check = { name: "app-health", run };
