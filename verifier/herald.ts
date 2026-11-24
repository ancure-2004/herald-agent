/**
 * Herald for a check that needs it running: the backend and frontend on free
 * ports (never herald's usual 8000, 3000 or 3001), each started with the clean
 * environment, waited on until it answers 200, and stopped afterwards. The
 * app-health and journeys checks both launch herald this way.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CheckContext } from "./check.ts";
import { ended, freePort, logTail, startServer, stopServer, waitReady, type Server } from "./launch.ts";
import { VENV_SETUP } from "./pytest-check.ts";

/** herald's usual ports (start.sh, the demo engine); the Verifier never takes them. */
const RESERVED_PORTS = [8000, 3000, 3001];

/** How many lines of a failing server's log are shown in a failed check's output. */
const TAIL_LINES = 20;

/** How many free ports are asked for before giving up. */
const PORT_TRIES = 20;

/** The two ports herald's servers listen on. */
export type HeraldPorts = { backend: number; frontend: number };

/** How long each server gets to answer 200, in seconds. */
export type ReadyLimits = { backend: number; frontend: number };

/** Why the launch failed: the server at fault, and a one-line reason. */
export type Failure = { server: Server; message: string };

/** What the launch produced: the ports (none when no free port was found) and the failure, if a server never answered. */
export type Launch = { ports?: HeraldPorts; failure?: Failure };

/** A failed launch's output: its message, the failing server's last log lines, then the requests made (`notes`). */
export function failureOutput(failure: Failure, notes: string[]): string {
  const logName = `${failure.server.name}.log`;
  const tail = logTail(failure.server.logPath, TAIL_LINES);
  return [failure.message, `--- last ${TAIL_LINES} lines of ${logName} ---`, ...tail, "--- requests ---", ...notes].join("\n");
}

/** A free port, other than the reserved ones and any already `taken`; undefined when none is found. */
async function pickPort(taken: number[]): Promise<number | undefined> {
  for (let i = 0; i < PORT_TRIES; i++) {
    const port = await freePort().catch(() => undefined);
    if (port !== undefined && !RESERVED_PORTS.includes(port) && !taken.includes(port)) return port;
  }
  return undefined;
}

/** A readiness limit in seconds from the environment (the VERIFY_* tuning), or the default when unset or not a positive number. */
function seconds(env: Record<string, string>, name: string, fallback: number): number {
  const value = Number(env[name]);
  return env[name] !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

/** The readiness limits: VERIFY_BACKEND_READY_SECONDS (60 by default) and VERIFY_FRONTEND_READY_SECONDS (180). */
export function readyLimits(env: Record<string, string>): ReadyLimits {
  return {
    backend: seconds(env, "VERIFY_BACKEND_READY_SECONDS", 60),
    frontend: seconds(env, "VERIFY_FRONTEND_READY_SECONDS", 180),
  };
}

/** Why herald cannot be started here (its venv or node_modules is missing), with the command that fixes it; undefined when it can. */
export function heraldMissing(root: string): string | undefined {
  if (!existsSync(join(root, "backend", ".venv", "bin", "uvicorn"))) return `backend/.venv/bin/uvicorn is missing; run: ${VENV_SETUP}`;
  if (!existsSync(join(root, "frontend", "node_modules", ".bin", "next"))) return "frontend/node_modules/.bin/next is missing; run: cd frontend && npm ci";
  return undefined;
}

/** Wait for the backend, then the frontend; the first one not ready is the failure, or none when both answer. */
async function readiness(
  backend: Server,
  frontend: Server,
  ports: HeraldPorts,
  limits: ReadyLimits,
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

/**
 * Start herald on free ports and wait until both answer; the servers' logs go
 * to `logDir`. Every server started is pushed onto `servers` at once, so the
 * caller can stop them even if this throws. With no free port, returns no ports
 * and starts nothing.
 */
export async function launchHerald(
  ctx: CheckContext,
  logDir: string,
  limits: ReadyLimits,
  note: (line: string) => void,
  servers: Server[],
): Promise<Launch> {
  const backendPort = await pickPort([]);
  const frontendPort = backendPort === undefined ? undefined : await pickPort([backendPort]);
  if (backendPort === undefined || frontendPort === undefined) return {};
  const ports = { backend: backendPort, frontend: frontendPort };
  const backend = startServer({
    name: "backend",
    port: backendPort,
    program: join(ctx.root, "backend", ".venv", "bin", "uvicorn"),
    args: ["app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
    cwd: join(ctx.root, "backend"),
    /** A JSON list: herald's settings library parses list settings as JSON and crashes on a comma list. */
    env: { ...ctx.env, CORS_ORIGINS: JSON.stringify([`http://127.0.0.1:${frontendPort}`, `http://localhost:${frontendPort}`]) },
    logPath: join(logDir, "backend.log"),
  });
  servers.push(backend);
  const frontend = startServer({
    name: "frontend",
    port: frontendPort,
    program: join(ctx.root, "frontend", "node_modules", ".bin", "next"),
    /** `--webpack` as herald's own dev script (frontend/package.json): Next 16 defaults to Turbopack, which refuses herald's webpack config. */
    args: ["dev", "--webpack", "--port", String(frontendPort), "--hostname", "127.0.0.1"],
    cwd: join(ctx.root, "frontend"),
    env: { ...ctx.env, NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${backendPort}`, NEXT_TELEMETRY_DISABLED: "1" },
    logPath: join(logDir, "frontend.log"),
  });
  servers.push(frontend);
  const failure = await readiness(backend, frontend, ports, limits, note);
  return failure ? { ports, failure } : { ports };
}

/** Stop every server in the list; true when every port is free again. */
export async function stopHerald(servers: Server[]): Promise<boolean> {
  let freed = true;
  for (const server of servers) {
    if (!(await stopServer(server))) freed = false;
  }
  return freed;
}
