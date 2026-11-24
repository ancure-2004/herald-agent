/**
 * Launching herald's servers for a check: a free port, a server started in its
 * own process group with its log in Evidence, a wait until it answers 200, and
 * a stop that ends the whole group and confirms the port is free again.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, openSync, readFileSync } from "node:fs";
import { createServer } from "node:net";

/** How often a server that is not ready yet is asked again. */
const POLL_MS = 500;

/** How long one probe waits for an answer before it counts as no answer. */
const PROBE_MS = 2000;

/** How long a stopped server gets after SIGTERM before SIGKILL. */
const TERM_GRACE_MS = 5000;

/** How long a server's group may take to vanish after SIGKILL. */
const KILL_WAIT_MS = 2000;

/** A server the Verifier started: its name, port, process, log file, and whether spawning failed. */
export type Server = { name: string; port: number; child: ChildProcess; logPath: string; failedToStart: boolean };

/** Every server started and not yet stopped, so an interrupted run can still stop them. */
const live = new Set<Server>();

/**
 * Stop every server still running, at once and without waiting (SIGKILL to each
 * whole group). For when the Verifier itself is being stopped from outside,
 * where an orderly stopServer can't finish.
 */
export function killAllNow(): void {
  for (const server of live) signalGroup(server, "SIGKILL");
  live.clear();
}

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A port the system has free on 127.0.0.1 right now: listen on port 0, read the port, close. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

/** True when nothing is listening on the port on 127.0.0.1 (the probe can listen there). */
export function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

/** The inputs for one server: its name and port, the program and arguments, where it runs, its environment and its log file. */
export type ServerSettings = {
  name: string;
  port: number;
  program: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  logPath: string;
};

/**
 * Start a server detached (its own process group, so the group can be
 * stopped), with stdout and stderr going to its log file. Returns at once;
 * use waitReady to learn whether it answers.
 */
export function startServer(settings: ServerSettings): Server {
  const fd = openSync(settings.logPath, "w");
  try {
    const child = spawn(settings.program, settings.args, {
      cwd: settings.cwd,
      env: settings.env,
      detached: true,
      stdio: ["ignore", fd, fd],
    });
    const server: Server = { name: settings.name, port: settings.port, child, logPath: settings.logPath, failedToStart: false };
    live.add(server);
    child.on("error", () => {
      server.failedToStart = true;
    });
    return server;
  } finally {
    closeSync(fd);
  }
}

/** True once the server's process has ended: it exited, was killed, or never started. */
export function ended(server: Server): boolean {
  return server.failedToStart || server.child.exitCode !== null || server.child.signalCode !== null;
}

/** One GET: the HTTP status, or undefined when nothing answered in time. */
async function probe(url: string): Promise<number | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PROBE_MS) });
    await res.body?.cancel();
    return res.status;
  } catch {
    return undefined;
  }
}

/**
 * Poll `url` every 500 ms until it answers 200 (true), the server ends
 * (false, at once), or the timeout passes (false). Every request and its
 * status goes to `note`.
 */
export async function waitReady(server: Server, url: string, timeoutMs: number, note: (line: string) => void): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (ended(server)) {
      note(`${server.name} stopped before it answered`);
      return false;
    }
    const status = await probe(url);
    note(`GET ${url} -> ${status ?? "no answer"}`);
    /** A 200 counts only while our own server is alive: another process may have taken the port. */
    if (status === 200 && !ended(server)) return true;
    if (Date.now() >= deadline) {
      note(`${server.name} did not answer 200 within ${timeoutMs / 1000} s`);
      return false;
    }
    await sleep(POLL_MS);
  }
}

/** Send a signal to the server's whole process group; a group already gone is not an error. */
function signalGroup(server: Server, signal: NodeJS.Signals): void {
  if (server.child.pid === undefined) return;
  try {
    process.kill(-server.child.pid, signal);
  } catch {
    return;
  }
}

/** True while any process in the server's group is alive (signal 0 only probes). */
function groupAlive(server: Server): boolean {
  if (server.child.pid === undefined) return false;
  try {
    process.kill(-server.child.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Wait until the server's group is gone, up to `ms`; true when it is. */
async function waitGone(server: Server, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (groupAlive(server)) {
    if (Date.now() >= deadline) return false;
    await sleep(100);
  }
  return true;
}

/**
 * Stop the server's whole process group: SIGTERM, then SIGKILL after 5 s if
 * anything is still alive. Returns true when its port is free again.
 */
export async function stopServer(server: Server): Promise<boolean> {
  live.delete(server);
  signalGroup(server, "SIGTERM");
  if (!(await waitGone(server, TERM_GRACE_MS))) signalGroup(server, "SIGKILL");
  await waitGone(server, KILL_WAIT_MS);
  return portFree(server.port);
}

/** The last `lines` non-blank lines of a log file. */
export function logTail(logPath: string, lines: number): string[] {
  const text = readFileSync(logPath, "utf8").split("\n").filter((line) => line.trim() !== "");
  return text.slice(-lines);
}
