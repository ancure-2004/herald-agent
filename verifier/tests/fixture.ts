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

/** The fake data generator a fixture gets unless a test says otherwise: prints a row count, exits 0. */
const PASSING_GENERATOR = 'echo "leads 3"; exit 0';

/** The feature map a fixture gets unless a test says otherwise: one entry whose folder the fixture makes. */
const DEFAULT_FEATURE_MAP = JSON.stringify(
  {
    features: [
      {
        id: "demo",
        name: "Demo",
        reach: ["Test -> Demo"],
        files: ["frontend/src/features/demo"],
        subFeatures: [{ id: "demo.one", what: "the one part" }],
        handles: [],
        endState: "the demo shows",
        gotchas: [],
        proof: [],
      },
    ],
  },
  null,
  2,
);

/** How a fake herald server behaves: healthy answers 200, crash exits at start, hang never listens, missing has no file. */
export type FakeMode = "healthy" | "crash" | "hang" | "missing";

/** What a fake server writes when it starts: its PID, its argv, and the environment variables the Verifier sets. */
export type FakeRecord = { pid: number; argv: string[]; env: Record<string, string | null> };

/** Where a fixture's fake server writes its record: beside the fixture, never inside it, so git sees nothing. */
export function recordPath(root: string, server: "backend" | "frontend"): string {
  return join(`${root}-records`, `${server}.json`);
}

/** A fake server's record; throws when that server never started. */
export function readRecord(root: string, server: "backend" | "frontend"): FakeRecord {
  return JSON.parse(readFileSync(recordPath(root, server), "utf8"));
}

/**
 * Options for a fixture: what the frontend's typecheck script does, whether
 * node_modules exists, the bodies of the fake backend/.venv/bin/pytest and
 * backend/.venv/bin/python (sh scripts; they run in backend/, and the python
 * one is the E2E runner, run from the root), whether that venv is missing,
 * the modes of the fake uvicorn and next (healthy by default), and extra files.
 */
export type FixtureOptions = {
  typecheck: string;
  nodeModules?: boolean;
  pytest?: string;
  e2e?: string;
  /**
   * The sh body run in place of verifier/seed/generate.py (the fake python runs
   * it for any `*generate.py` argument; its arguments are recorded). Default: prints a row count, exits 0.
   */
  generator?: string;
  noVenv?: boolean;
  uvicorn?: FakeMode;
  next?: FakeMode;
  /** verifier/feature-map.json's text; null writes no map at all. Default: a valid one-entry map. */
  featureMap?: string | null;
  /** verifier/known-failures.txt's text; null removes the file. Default: the copied real list. */
  knownFailures?: string | null;
  files?: Record<string, string>;
  /** Make the fixture a git repository on `main` whose one commit (`base`) holds every file. Default: not a repository. */
  git?: boolean;
  /**
   * Install a fake Playwright (verifier/node_modules/.bin/playwright and the
   * @playwright/test folder) that records its arguments and environment, then
   * runs this sh body; also a fake Chrome file at `fake-chrome`. Absent: not installed.
   * A run of the load check's screens spec (its arguments name screens.load.ts)
   * is recorded apart (playwrightLoadRecordPath) and first writes both screens
   * as fast (screens.json in VERIFY_LOAD_DIR), so the body may overwrite or remove that.
   */
  playwright?: string;
};

/** Write a fake server's sh script: it runs fake-server.mjs in the given mode, recording to `record`. Missing writes nothing. */
function placeFake(path: string, root: string, mode: FakeMode, record: string): void {
  if (mode === "missing") return;
  const script = `#!/bin/sh\nexec node "${join(root, "fake-server.mjs")}" --fake-mode ${mode} --fake-record "${record}" "$@"\n`;
  writeFileSync(path, script, { mode: 0o755 });
}

/** Where the fake python records the arguments and DATABASE_URL of each generator run: one `arg <value>` line each. */
export function generatorRecordPath(root: string): string {
  return join(`${root}-records`, "generator.txt");
}

/** The fake backend/.venv/bin/python: a `*generate.py` run records its arguments and runs the generator body; anything else is the E2E runner body. */
function pythonFake(root: string, opts: FixtureOptions): string {
  const record = `{ for a in "$@"; do echo "arg $a"; done; echo "env DATABASE_URL=$DATABASE_URL"; } > "${generatorRecordPath(root)}"`;
  return `#!/bin/sh\ncase "$1" in *generate.py)\n${record}\n${opts.generator ?? PASSING_GENERATOR}\n;;\n*)\n${opts.e2e ?? PASSING_E2E}\n;;\nesac\n`;
}

/** The lines a fake generator run recorded (see generatorRecordPath). */
export function readGenerator(root: string): string[] {
  if (!existsSync(generatorRecordPath(root))) return [];
  return readFileSync(generatorRecordPath(root), "utf8").split("\n").filter((l) => l !== "");
}

/**
 * Set the delays and statuses the fake herald's paths answer with (routes.json
 * beside the records; the backend's fake reads it on every request).
 */
export function setRoutes(root: string, routes: Record<string, { delayMs?: number; status?: number }>): void {
  writeFileSync(join(`${root}-records`, "routes.json"), JSON.stringify(routes));
}

/** A fixture herald-shaped folder: `verify`, `verifier/` (no node_modules, no tests), `frontend/` and `backend/`. */
export function makeFixture(opts: FixtureOptions): string {
  const root = tempDir("verify-fixture-");
  mkdirSync(`${root}-records`);
  made.push(`${root}-records`);
  cpSync(join(REAL_ROOT, "verify"), join(root, "verify"));
  cpSync(join(REAL_ROOT, "verifier"), join(root, "verifier"), {
    recursive: true,
    /** herald's real journeys stay out: a fixture has its own features, and no Playwright install. */
    filter: (src) => !/[\\/](node_modules|tests|journeys|seed)$/.test(src),
  });
  cpSync(join(import.meta.dirname, "fake-server.mjs"), join(root, "fake-server.mjs"));
  mkdirSync(join(root, "frontend"));
  const pkg = { name: "frontend", private: true, scripts: { typecheck: opts.typecheck } };
  writeFileSync(join(root, "frontend", "package.json"), JSON.stringify(pkg, null, 2));
  if (opts.nodeModules !== false) {
    mkdirSync(join(root, "frontend", "node_modules", ".bin"), { recursive: true });
    placeFake(join(root, "frontend", "node_modules", ".bin", "next"), root, opts.next ?? "healthy", recordPath(root, "frontend"));
  }
  if (opts.noVenv !== true) {
    const bin = join(root, "backend", ".venv", "bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "pytest"), `#!/bin/sh\n${opts.pytest ?? PASSING_PYTEST}\n`, { mode: 0o755 });
    writeFileSync(join(bin, "python"), pythonFake(root, opts), { mode: 0o755 });
    placeFake(join(bin, "uvicorn"), root, opts.uvicorn ?? "healthy", recordPath(root, "backend"));
  }
  const mapPath = join(root, "verifier", "feature-map.json");
  if (opts.featureMap === null) rmSync(mapPath, { force: true });
  else writeFileSync(mapPath, opts.featureMap ?? DEFAULT_FEATURE_MAP);
  const knownPath = join(root, "verifier", "known-failures.txt");
  if (opts.knownFailures === null) rmSync(knownPath, { force: true });
  else if (opts.knownFailures !== undefined) writeFileSync(knownPath, opts.knownFailures);
  mkdirSync(join(root, "verifier", "seed"), { recursive: true });
  writeFileSync(join(root, "verifier", "seed", "generate.py"), "# fake data generator for the Seam tests\n");
  mkdirSync(join(root, "frontend", "src", "features", "demo"), { recursive: true });
  writeFileSync(join(root, "frontend", "src", "features", "demo", "index.tsx"), "export {};\n");
  for (const [path, text] of Object.entries(opts.files ?? {})) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  if (opts.playwright !== undefined) placePlaywright(root, opts.playwright);
  if (opts.git) {
    gitIn(root, ["init", "-q", "-b", "main"]);
    commitAll(root, "base");
  }
  return root;
}

/** Where the fake Playwright writes its record of the journeys: one `arg <value>` or `env <NAME=value>` line per item. */
export function playwrightRecordPath(root: string): string {
  return join(`${root}-records`, "playwright.txt");
}

/** Where the fake Playwright records the load check's screens run (the same format as playwrightRecordPath). */
export function playwrightLoadRecordPath(root: string): string {
  return join(`${root}-records`, "playwright-load.txt");
}

/** The screens' timings a fake Playwright writes by default: both screens fast. */
const FAST_SCREENS = '[{"screen":"Management Overview","ms":10,"ok":true},{"screen":"Leads Table","ms":10,"ok":true}]';

/** Install the fake Playwright and its fake Chrome into a fixture (see FixtureOptions.playwright). */
function placePlaywright(root: string, body: string): void {
  const modules = join(root, "verifier", "node_modules");
  mkdirSync(join(modules, "@playwright", "test"), { recursive: true });
  writeFileSync(join(modules, "@playwright", "test", "package.json"), '{"name":"@playwright/test"}\n');
  mkdirSync(join(modules, ".bin"), { recursive: true });
  const dir = `${root}-records`;
  const record = [
    `f="${dir}/playwright.txt"`,
    `case "$*" in *screens.load.ts*) f="${dir}/playwright-load.txt"; mkdir -p "$VERIFY_LOAD_DIR"; printf '%s' '${FAST_SCREENS}' > "$VERIFY_LOAD_DIR/screens.json";; esac`,
    `{ for a in "$@"; do echo "arg $a"; done; env | sed 's/^/env /'; } > "$f"`,
  ].join("; ");
  writeFileSync(join(modules, ".bin", "playwright"), `#!/bin/sh\n${record}\n${body}\n`, { mode: 0o755 });
  writeFileSync(join(root, "fake-chrome"), "chrome\n", { mode: 0o755 });
}

/** Run git in a fixture folder with a fixed identity; returns its trimmed stdout, and throws when git fails. */
export function gitIn(root: string, args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=verify-test", "-c", "user.email=verify-test@example.invalid", ...args], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

/** Stage everything in a fixture folder and commit it (a no-op commit fails, so call it only after a change). */
export function commitAll(root: string, message: string): string {
  gitIn(root, ["add", "-A"]);
  gitIn(root, ["commit", "-q", "-m", message]);
  return gitIn(root, ["rev-parse", "HEAD"]);
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
