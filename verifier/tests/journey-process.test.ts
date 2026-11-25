/**
 * Seam tests for the process group the journeys check runs Playwright in
 * (checks/journeys.ts runProgram). A fake program (sh) starts a long-lived
 * child in the background and then exits or hangs; the child must be gone
 * once runProgram returns, pass or time out. No Playwright, no browser.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runProgram } from "../checks/journeys.ts";
import { cleanup, tempDir } from "./fixture.ts";

after(cleanup);

/** The environment the fake program runs with: just a PATH to find sleep. */
const ENV = { PATH: process.env.PATH ?? "" };

/** True when the process is gone: no such PID, or a zombie nobody has reaped yet. */
function gone(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch {
    return true;
  }
  try {
    return /^\S+ \(.*\) Z /m.test(readFileSync(`/proc/${pid}/stat`, "utf8"));
  } catch {
    return true;
  }
}

/** True once the process is gone, polling for up to two seconds: a SIGKILL is delivered asynchronously. */
async function goneSoon(pid: number): Promise<boolean> {
  for (let i = 0; i < 40; i++) {
    if (gone(pid)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return gone(pid);
}

/** A sh body that starts `sleep 300` in the background, writes its PID to `pidFile`, then runs `rest`. */
function withChild(pidFile: string, rest: string): string {
  return `sleep 300 & echo $! > "${pidFile}"; ${rest}`;
}

/** The PID the fake program wrote for its background child. */
function childPid(pidFile: string): number {
  return Number(readFileSync(pidFile, "utf8").trim());
}

test("a program that exits leaves no child of its own behind", async () => {
  const pidFile = join(tempDir("journey-exit-"), "child.pid");
  const ran = await runProgram("/bin/sh", ["-c", withChild(pidFile, "exit 0")], tempDir("journey-cwd-"), ENV, 10_000);
  assert.equal(ran.code, 0);
  assert.equal(ran.timedOut, false);
  assert.ok(await goneSoon(childPid(pidFile)), "the background child is gone once the program exited");
});

test("a program that hangs is killed at the time limit, and its child with it", async () => {
  const pidFile = join(tempDir("journey-hang-"), "child.pid");
  const ran = await runProgram("/bin/sh", ["-c", withChild(pidFile, "sleep 300")], tempDir("journey-cwd-"), ENV, 1_000);
  assert.equal(ran.timedOut, true);
  assert.ok(await goneSoon(childPid(pidFile)), "the background child is gone after the time limit");
});
