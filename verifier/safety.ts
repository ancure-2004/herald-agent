/**
 * Safety before any check runs: refuse where live data could be touched, and
 * hand each check a clean environment, a throwaway database, and stubs that
 * refuse in place of paid AI commands (agy, gemini, claude).
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The live files that must not sit in the checkout `verify` runs from: names
 * only, existence only; they are never opened, copied or read.
 * Returns each one found, relative to the root (e.g. "backend/.env").
 */
export function refusals(root: string): string[] {
  const backend = join(root, "backend");
  const found: string[] = [];
  /** lstat, not exists: a dangling symlink to a live file is refused too. */
  if (lstatSync(join(backend, ".env"), { throwIfNoEntry: false })) found.push("backend/.env");
  if (existsSync(backend)) {
    for (const name of readdirSync(backend)) {
      if (name.startsWith("personal_os.db")) found.push(`backend/${name}`);
    }
  }
  found.push(...envFiles(join(root, "frontend"), "frontend"));
  const engines = join(root, "engines");
  if (isFolder(engines)) {
    for (const engine of readdirSync(engines, { withFileTypes: true })) {
      if (engine.isDirectory()) found.push(...envFiles(join(engines, engine.name), `engines/${engine.name}`));
    }
  }
  return found;
}

/** True when the path is a real folder (not a file, not missing). */
function isFolder(path: string): boolean {
  return lstatSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
}

/** A settings template (`.env.example`, `.env.sample`, `.env.template`): tracked, no secrets, never read by Next. */
const TEMPLATE = /\.(example|sample|template)$/;

/**
 * The `.env*` files directly in one folder, as `<label>/<name>`: names only.
 * A missing folder has none.
 */
function envFiles(dir: string, label: string): string[] {
  if (!isFolder(dir)) return [];
  return readdirSync(dir).filter((name) => name.startsWith(".env") && !TEMPLATE.test(name)).map((name) => `${label}/${name}`);
}

/** The paid or account-bound commands every check gets a stub of: a stub refuses at once. */
export const STUB_COMMANDS = ["agy", "gemini", "claude"] as const;

/**
 * Write the stub folder `stub-bin/` inside `runDir`: one executable per paid
 * command, each printing `blocked by verify: <name>` to stderr and exiting 1.
 * Returns the folder's absolute path. It is removed with `runDir`.
 */
export function writeStubs(runDir: string): string {
  const bin = join(runDir, "stub-bin");
  mkdirSync(bin);
  for (const name of STUB_COMMANDS) {
    writeFileSync(join(bin, name), `#!/bin/sh\necho "blocked by verify: ${name}" >&2\nexit 1\n`, { mode: 0o755 });
  }
  return bin;
}

/** The only variables a check may see from the caller; VERIFY_* passes through too. */
const ALLOWED = ["PATH", "HOME", "LANG", "TERM", "TMPDIR"] as const;

/**
 * The clean environment for every check: the allow-listed caller variables
 * as they are, CI=1, the throwaway DATABASE_URL, the Verifier's own VERIFY_*
 * variables, and PATH with the stub folder first. Nothing else passes.
 */
export function cleanEnv(caller: Record<string, string | undefined>, runDir: string, stubDir: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of ALLOWED) {
    const value = caller[name];
    if (value !== undefined) env[name] = value;
  }
  for (const [name, value] of Object.entries(caller)) {
    if (name.startsWith("VERIFY_") && value !== undefined) env[name] = value;
  }
  env.CI = "1";
  env.DATABASE_URL = `sqlite:///${join(runDir, "verify.db")}`;
  env.PATH = [stubDir, env.PATH].filter((p) => p !== undefined && p !== "").join(":");
  return env;
}
