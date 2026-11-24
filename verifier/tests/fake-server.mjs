/**
 * A fake herald server for the Seam tests: stands in for uvicorn and next.
 * Writes its PID, argv and the environment variables the Verifier sets to the
 * record file, then behaves as its mode says: healthy answers 200 on /api/health
 * and /, crash prints an error and exits 3, hang never listens.
 */
import { writeFileSync } from "node:fs";
import { createServer } from "node:http";

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

if (mode === "crash") {
  console.error("fake server: startup error: boom");
  process.exit(3);
}
if (mode === "hang") {
  setInterval(() => {}, 1000);
} else {
  createServer((req, res) => {
    const ok = req.url === "/api/health" || req.url === "/";
    res.writeHead(ok ? 200 : 404, { "content-type": "text/plain" });
    res.end(ok ? "ok" : "not found");
  }).listen(port, "127.0.0.1");
}
