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
