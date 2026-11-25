/**
 * A fake herald server for the Seam tests: stands in for uvicorn and next.
 * Writes its PID, argv and the environment variables the Verifier sets to the
 * record file, then behaves as its mode says: healthy answers 200 on /api/health,
 * / and every other /api/ path, crash prints an error and exits 3, hang never
 * listens. A `routes.json` beside the record (the test writes it) sets a path's
 * delay in ms and status, read on every request: { "/api/leads": { "delayMs": 200, "status": 500 } }.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);

/** The value after a flag, or undefined when the flag is absent. */
function flag(name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

const mode = flag("--fake-mode") ?? "healthy";
const record = flag("--fake-record");
const port = Number(flag("--port"));
const env = {};
for (const name of ["CORS_ORIGINS", "NEXT_PUBLIC_API_BASE_URL", "NEXT_TELEMETRY_DISABLED", "DATABASE_URL"]) {
  env[name] = process.env[name] ?? null;
}
writeFileSync(record, JSON.stringify({ pid: process.pid, argv, env }, null, 2));

/** The delay and status the test set for one path; none when the file or the path is absent. */
function routeFor(pathname) {
  const file = join(dirname(record), "routes.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"))[pathname] ?? {};
}

if (mode === "crash") {
  console.error("fake server: startup error: boom");
  process.exit(3);
}
if (mode === "hang") {
  setInterval(() => {}, 1000);
} else {
  createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    const ok = pathname === "/" || pathname.startsWith("/api/");
    const { delayMs = 0, status } = routeFor(pathname);
    setTimeout(() => {
      const code = status ?? (ok ? 200 : 404);
      res.writeHead(code, { "content-type": "application/json" });
      res.end(code === 200 ? "[]" : "{}");
    }, delayMs);
  }).listen(port, "127.0.0.1");
}
