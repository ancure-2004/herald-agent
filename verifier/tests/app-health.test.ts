/**
 * Seam tests for the app-health check: `verify` run as a program against a
 * fixture whose fake uvicorn and next the test controls. No real server starts.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { connect } from "node:net";
import { cleanup, exists, makeFixture, readRecord, recordPath, runVerify } from "./fixture.ts";

after(cleanup);

test("healthy fakes: app-health passes, exit 0, and Evidence has both server logs and its own", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^app-health: pass$/m);
  assert.ok(r.evidence, "last stdout line is `evidence: <path>`");
  for (const file of ["backend.log", "frontend.log", "app-health.log"]) {
    assert.ok(exists(join(r.evidence, file)), file);
  }
});

/** The value after a flag in a recorded argv, or undefined. */
function argAfter(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

test("backend and frontend get their free ports, the CORS and API addresses, telemetry off, and the throwaway database", () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const backend = readRecord(root, "backend");
  const frontend = readRecord(root, "frontend");
  const bp = argAfter(backend.argv, "--port") ?? "";
  const fp = argAfter(frontend.argv, "--port") ?? "";
  assert.match(bp, /^\d+$/);
  assert.match(fp, /^\d+$/);
  assert.notEqual(bp, fp);
  for (const port of [bp, fp]) assert.ok(!["8000", "3000", "3001"].includes(port), `not a reserved port: ${port}`);
  assert.equal(backend.env.CORS_ORIGINS, `http://127.0.0.1:${fp},http://localhost:${fp}`);
  assert.equal(frontend.env.NEXT_PUBLIC_API_BASE_URL, `http://127.0.0.1:${bp}`);
  assert.equal(frontend.env.NEXT_TELEMETRY_DISABLED, "1");
  assert.ok(backend.env.DATABASE_URL?.startsWith("sqlite:///"), String(backend.env.DATABASE_URL));
  assert.ok(backend.env.DATABASE_URL?.endsWith("/verify.db"), String(backend.env.DATABASE_URL));
  assert.equal(frontend.env.DATABASE_URL, backend.env.DATABASE_URL);
});

/** True when nothing accepts a connection on 127.0.0.1 at `port` (the connect is refused). */
function refused(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => resolve(error.code === "ECONNREFUSED"));
  });
}

/** True when the process with this PID no longer exists. */
function gone(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

test("after the run both servers are gone and their ports accept no connection", async () => {
  const root = makeFixture({ typecheck: "exit 0" });
  const r = runVerify(root);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const backend = readRecord(root, "backend");
  const frontend = readRecord(root, "frontend");
  assert.ok(gone(backend.pid), `backend pid ${backend.pid} is gone`);
  assert.ok(gone(frontend.pid), `frontend pid ${frontend.pid} is gone`);
  const backendPort = Number(argAfter(backend.argv, "--port"));
  const frontendPort = Number(argAfter(frontend.argv, "--port"));
  assert.equal(await refused(backendPort), true, `backend port ${backendPort} refuses`);
  assert.equal(await refused(frontendPort), true, `frontend port ${frontendPort} refuses`);
});

test("a backend that crashes on start fails app-health with exit 1, shows its error line, and leaves the frontend stopped", () => {
  const root = makeFixture({ typecheck: "exit 0", uvicorn: "crash" });
  const r = runVerify(root);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /app-health: fail/);
  assert.match(r.stdout, /fake server: startup error: boom/);
  assert.ok(gone(readRecord(root, "frontend").pid), "the frontend was stopped too");
});

test("a frontend that never answers fails app-health within its limit, and both servers are stopped", () => {
  const root = makeFixture({ typecheck: "exit 0", next: "hang" });
  const started = Date.now();
  const r = runVerify(root, [], { VERIFY_FRONTEND_READY_SECONDS: "2" });
  const seconds = (Date.now() - started) / 1000;
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /app-health: fail/);
  assert.ok(seconds < 30, `finished in ${seconds} s`);
  assert.ok(gone(readRecord(root, "backend").pid), "the backend was stopped");
  assert.ok(gone(readRecord(root, "frontend").pid), "the frontend was stopped");
});
