/**
 * Safety before any check runs: refuse where live data could be touched, and
 * hand each check a clean environment and a throwaway database.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The live files that must not sit in the checkout `verify` runs from: names
 * only, existence only; they are never opened, copied or read.
 * Returns each one found, relative to the root (e.g. "backend/.env").
 */
export function refusals(root: string): string[] {
  const backend = join(root, "backend");
  const found: string[] = [];
  if (existsSync(join(backend, ".env"))) found.push("backend/.env");
  if (existsSync(backend)) {
    for (const name of readdirSync(backend)) {
      if (name.startsWith("personal_os.db")) found.push(`backend/${name}`);
    }
  }
  return found;
}

/** The only variables a check may see from the caller; VERIFY_* passes through too. */
const ALLOWED = ["PATH", "HOME", "LANG", "TERM", "TMPDIR"] as const;

/**
 * The clean environment for every check: the allow-listed caller variables
 * (LANG and TERM default when unset), CI=1, the throwaway DATABASE_URL and the
 * Verifier's own VERIFY_* variables. Nothing else from the caller passes.
 */
export function cleanEnv(caller: Record<string, string | undefined>, dbDir: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of ALLOWED) {
    const value = caller[name] ?? (name === "LANG" ? "C" : name === "TERM" ? "dumb" : name === "TMPDIR" ? dbDir : undefined);
    if (value !== undefined) env[name] = value;
  }
  for (const [name, value] of Object.entries(caller)) {
    if (name.startsWith("VERIFY_") && value !== undefined) env[name] = value;
  }
  env.CI = "1";
  env.DATABASE_URL = `sqlite:///${join(dbDir, "verify.db")}`;
  return env;
}
