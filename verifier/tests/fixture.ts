/**
 * Seam helpers: each test builds a throwaway copy of herald's shape (the
 * `verify` entry, `verifier/` and a `frontend/` whose `typecheck` script the
 * test controls), then runs `verify` as a program. Nothing here imports the
 * Verifier's own modules.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The real herald root (the folder holding `verify`), two levels above verifier/tests. */
const REAL_ROOT = join(import.meta.dirname, "..", "..");

/** Every fixture and Evidence folder made by a test run; removed once the file's tests finish. */
export const made: string[] = [];

/** A new empty temp folder, registered for cleanup. */
export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}

/** The fake pytest a fixture gets unless a test says otherwise: one passing test. */
const PASSING_PYTEST = 'echo "1 passed"; exit 0';

/** The fake E2E runner a fixture gets unless a test says otherwise: one passing test. */
const PASSING_E2E = 'echo "1 passed"; exit 0';

/**
 * Options for a fixture: what the frontend's typecheck script does, whether
 * node_modules exists, the bodies of the fake backend/.venv/bin/pytest and
 * backend/.venv/bin/python (sh scripts; they run in backend/, and the python
 * one is the E2E runner, run from the root), whether that venv is missing,
 * and extra files.
 */
export type FixtureOptions = { typecheck: string; nodeModules?: boolean; pytest?: string; e2e?: string; noVenv?: boolean; files?: Record<string, string> };

/** A fixture herald-shaped folder: `verify`, `verifier/` (no node_modules, no tests), `frontend/` and `backend/`. */
export function makeFixture(opts: FixtureOptions): string {
  const root = tempDir("verify-fixture-");
  cpSync(join(REAL_ROOT, "verify"), join(root, "verify"));
  cpSync(join(REAL_ROOT, "verifier"), join(root, "verifier"), {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|tests)$/.test(src),
  });
  mkdirSync(join(root, "frontend"));
  const pkg = { name: "frontend", private: true, scripts: { typecheck: opts.typecheck } };
  writeFileSync(join(root, "frontend", "package.json"), JSON.stringify(pkg, null, 2));
  if (opts.nodeModules !== false) mkdirSync(join(root, "frontend", "node_modules"));
  if (opts.noVenv !== true) {
    mkdirSync(join(root, "backend", ".venv", "bin"), { recursive: true });
    const pytest = join(root, "backend", ".venv", "bin", "pytest");
    writeFileSync(pytest, `#!/bin/sh\n${opts.pytest ?? PASSING_PYTEST}\n`, { mode: 0o755 });
    const python = join(root, "backend", ".venv", "bin", "python");
    writeFileSync(python, `#!/bin/sh\n${opts.e2e ?? PASSING_E2E}\n`, { mode: 0o755 });
  }
  for (const [path, text] of Object.entries(opts.files ?? {})) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

/** The result of one `verify` run. */
export type RunResult = { code: number | null; stdout: string; stderr: string; evidence: string | undefined };

/** Run `<root>/verify` with a clean caller environment plus `extra`; returns its exit code and output. */
export function runVerify(root: string, args: string[] = [], extra: Record<string, string> = {}): RunResult {
  const env = { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...extra };
  const r = spawnSync(join(root, "verify"), args, { env, encoding: "utf8", timeout: 120_000 });
  const lines = r.stdout.trimEnd().split("\n");
  const last = lines[lines.length - 1] ?? "";
  const evidence = last.startsWith("evidence: ") ? last.slice("evidence: ".length) : undefined;
  if (evidence) made.push(evidence);
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, evidence };
}

/** Read one Evidence file as text. */
export function readEvidence(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

/** True when a path exists. */
export function exists(path: string): boolean {
  return existsSync(path);
}

/** Remove every registered temp folder. */
export function cleanup(): void {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}
