/**
 * Seam tests for the fake-data generator (verifier/seed/generate.py). Each test
 * runs the real generator with herald's backend venv on a temp SQLite file,
 * then reads the result with node:sqlite. Nothing here imports the generator.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

/** The real herald root (the folder holding `verify`), two levels above verifier/tests. */
const REPO = join(import.meta.dirname, "..", "..");
const PY = join(REPO, "backend", ".venv", "bin", "python");
const GEN = join(REPO, "verifier", "seed", "generate.py");
const SKIP = existsSync(PY) ? false : "backend/.venv is missing";

const made: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "seed-gen-"));
  made.push(dir);
  return dir;
}

after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

/** A refusal is exit 2 with its reason on stderr, not Python failing to find the script. (Leads 9 is the least herald accepts, so a path test is not refused for leads.) */
function assertRefused(r: { status: number | null; stderr: string }, reason: RegExp): void {
  assert.equal(r.status, 2, r.stderr);
  assert.doesNotMatch(r.stderr, /can't open file|No such file/);
  assert.match(r.stderr, reason, "the reason for the refusal, on stderr");
}

function gen(db: string, args: string[] = []) {
  const env = { ...process.env };
  delete env.VERIFY_SEED_ALLOW_ANY;
  return spawnSync(PY, [GEN, db, ...args], { encoding: "utf8", env, timeout: 120_000 });
}

/** Opens a generated file read-only. */
function open(db: string): DatabaseSync {
  return new DatabaseSync(db, { readOnly: true });
}

function count(db: DatabaseSync, sql: string): number {
  const row = db.prepare(sql).get() as { n: number };
  return Number(row.n);
}

/** Every table's rows, ordered by primary key, so two files compare by content. */
function dump(db: DatabaseSync): Record<string, unknown[]> {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  const out: Record<string, unknown[]> = {};
  for (const { name } of tables) {
    const cols = db.prepare(`PRAGMA table_info("${name}")`).all() as { name: string; pk: number }[];
    const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => `"${c.name}"`);
    const order = pk.length > 0 ? pk.join(", ") : cols.map((c) => `"${c.name}"`).join(", ");
    out[name] = db.prepare(`SELECT * FROM "${name}" ORDER BY ${order}`).all();
  }
  return out;
}

function tableNames(db: DatabaseSync): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((r) => r.name);
}

describe("fake-data generator", { skip: SKIP }, () => {
  test("50 leads with seed 7: every stage used, facts 2-5, every table filled, counts printed", () => {
    const db = join(tempDir(), "small.db");
    const r = gen(db, ["--leads", "50", "--seed", "7"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^leads: 50$/m);
    for (const t of tableNames(open(db))) {
      assert.match(r.stdout, new RegExp(`^${t}: \\d+$`, "m"), `count line for ${t}`);
    }

    const conn = open(db);
    assert.equal(count(conn, "SELECT COUNT(*) AS n FROM leads"), 50);
    const stageIds = (conn.prepare("SELECT id FROM stages ORDER BY id").all() as { id: number }[]).map((r) => r.id);
    const usedIds = (conn.prepare("SELECT DISTINCT stage_id AS id FROM leads ORDER BY id").all() as { id: number }[]).map(
      (r) => r.id,
    );
    assert.deepEqual(usedIds, stageIds, "every stage has at least one lead");

    const facts = conn
      .prepare("SELECT l.id AS id, COUNT(f.id) AS n FROM leads l LEFT JOIN lead_facts f ON f.lead_id = l.id GROUP BY l.id")
      .all() as { id: number; n: number }[];
    assert.equal(facts.length, 50);
    for (const { id, n } of facts) assert.ok(n >= 2 && n <= 5, `lead ${id} has ${n} facts`);

    const perLead = conn
      .prepare(
        `SELECT l.id AS id,
                (SELECT COUNT(*) FROM messages m WHERE m.lead_id = l.id) AS msgs,
                (SELECT COUNT(*) FROM calls c WHERE c.lead_id = l.id) AS calls,
                (SELECT COUNT(*) FROM commitments k WHERE k.lead_id = l.id) AS commitments
           FROM leads l`,
      )
      .all() as { msgs: number; calls: number; commitments: number }[];
    for (const row of perLead) {
      assert.ok(row.msgs <= 12 && row.calls <= 3 && row.commitments <= 2, JSON.stringify(row));
    }

    for (const table of ["messages", "calls", "commitments", "outbox", "events"]) {
      assert.ok(count(conn, `SELECT COUNT(*) AS n FROM ${table}`) > 0, `${table} is empty`);
    }
    conn.close();
  });

  test("lead 1 is the busy lead: 12 messages, 3 calls, 2 commitments and 5 facts, whatever the seed", () => {
    for (const seed of ["7", "8"]) {
      const db = join(tempDir(), `busy-${seed}.db`);
      assert.equal(gen(db, ["--leads", "50", "--seed", seed]).status, 0);
      const conn = open(db);
      const row = conn
        .prepare(
          `SELECT (SELECT COUNT(*) FROM messages WHERE lead_id = 1) AS msgs,
                  (SELECT COUNT(*) FROM calls WHERE lead_id = 1) AS calls,
                  (SELECT COUNT(*) FROM commitments WHERE lead_id = 1) AS commitments,
                  (SELECT COUNT(*) FROM lead_facts WHERE lead_id = 1) AS facts`,
        )
        .get() as Record<string, number>;
      conn.close();
      assert.deepEqual({ ...row }, { msgs: 12, calls: 3, commitments: 2, facts: 5 }, `seed ${seed}`);
    }
  });

  test("the same seed twice gives identical contents", () => {
    const dir = tempDir();
    const a = join(dir, "a.db");
    const b = join(dir, "b.db");
    assert.equal(gen(a, ["--leads", "50", "--seed", "7"]).status, 0);
    assert.equal(gen(b, ["--leads", "50", "--seed", "7"]).status, 0);
    const ca = open(a);
    const cb = open(b);
    assert.deepEqual(dump(ca), dump(cb));
    ca.close();
    cb.close();
  });

  test("a different seed gives different contents", () => {
    const dir = tempDir();
    const a = join(dir, "a.db");
    const b = join(dir, "b.db");
    assert.equal(gen(a, ["--leads", "50", "--seed", "7"]).status, 0);
    assert.equal(gen(b, ["--leads", "50", "--seed", "8"]).status, 0);
    const ca = open(a);
    const cb = open(b);
    assert.notDeepEqual(dump(ca), dump(cb));
    ca.close();
    cb.close();
  });

  test("refuses a file named personal_os.db (exit 2, nothing created)", () => {
    const db = join(tempDir(), "personal_os.db");
    const r = gen(db, ["--leads", "9"]);
    assertRefused(r, /live database/);
    assert.equal(existsSync(db), false);
  });

  test("refuses a path inside the herald repo (exit 2, no file created)", () => {
    const db = join(REPO, "verifier", "seed", "x.db");
    const r = gen(db, ["--leads", "9"]);
    assertRefused(r, /inside the herald repo/);
    assert.equal(existsSync(db), false);
    assert.equal(existsSync(`${db}-wal`), false);
  });

  test("refuses a path outside the system temp folder, even under the home folder (exit 2, no file created)", () => {
    const db = join(homedir(), `seed-gen-refused-${process.pid}-${Date.now()}.db`);
    try {
      const r = gen(db, ["--leads", "9"]);
      assertRefused(r, /temp folder/);
      assert.equal(existsSync(db), false);
    } finally {
      rmSync(db, { force: true });
    }
  });

  test("VERIFY_SEED_ALLOW_ANY no longer lets a path outside the temp folder through (exit 2, no file created)", () => {
    const db = join(homedir(), `seed-gen-bypass-${process.pid}-${Date.now()}.db`);
    try {
      const r = spawnSync(PY, [GEN, db, "--leads", "9"], { encoding: "utf8", env: { ...process.env, VERIFY_SEED_ALLOW_ANY: "1" }, timeout: 120_000 });
      assertRefused(r, /temp folder/);
      assert.equal(existsSync(db), false);
    } finally {
      rmSync(db, { force: true });
    }
  });

  test("refuses an existing non-empty file (exit 2, file unchanged)", () => {
    const db = join(tempDir(), "taken.db");
    const original = Buffer.from("this file is not a database and must stay as it is");
    writeFileSync(db, original);
    const r = gen(db, ["--leads", "9"]);
    assertRefused(r, /not empty/);
    assert.deepEqual(readFileSync(db), original);
  });

  test("2000 leads finish in under 60 seconds", () => {
    const db = join(tempDir(), "big.db");
    const started = Date.now();
    const r = gen(db, ["--leads", "2000"]);
    const elapsed = Date.now() - started;
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^leads: 2000$/m);
    assert.ok(elapsed < 60_000, `took ${elapsed} ms`);
  });
});
