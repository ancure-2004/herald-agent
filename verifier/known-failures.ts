/**
 * The pytest rules both checks share: the venv setup command, the quarantine
 * (known-failures.txt), and the verdict on one pytest run. pytest's exit 0 or
 * 1 are test results; any other exit fails. Every test that is not passing is
 * named on a summary line, and each one must be listed to pass.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The command that builds herald's backend venv; both checks name it when a venv is missing. */
export const VENV_SETUP = 'cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]" -r requirements.txt';

/** The verdict on one pytest run: pass or fail, with its message parts joined by ` | `. */
export type PytestVerdict = { status: "pass" | "fail"; message: string };

/** The ids pytest named on its `FAILED <id> - <reason>` summary lines, once each. */
function nonPassingIds(output: string): string[] {
  const ids = output.split("\n").filter((l) => l.startsWith("FAILED ")).map((l) => {
    const rest = l.slice("FAILED ".length);
    const dash = rest.indexOf(" - ");
    return (dash < 0 ? rest : rest.slice(0, dash)).trim();
  });
  return [...new Set(ids)];
}

/** The quarantined ids: one per line, `#` starts a comment, blanks ignored. */
export function knownFailures(root: string): string[] {
  const file = join(root, "verifier", "known-failures.txt");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").map((l) => l.split("#")[0].trim()).filter((id) => id !== "");
}

/**
 * The verdict on one pytest run. `status` is pytest's exit status, or its
 * signal name when it was killed. Exit 1 with no named failure fails, and so
 * does any unlisted id. A listed id that did not come up non-passing is
 * reported as fixed, so the list can shrink; that alone does not fail.
 */
export function judgePytest(root: string, status: number | string, output: string): PytestVerdict {
  if (status !== 0 && status !== 1) {
    return { status: "fail", message: `pytest ended with ${status}, not a test result` };
  }
  const known = knownFailures(root);
  const failed = nonPassingIds(output);
  const unlisted = failed.filter((id) => !known.includes(id));
  /** A listed test that did not fail, and pytest really ran: the quarantine can shrink. */
  const fixed = known.filter((id) => !failed.includes(id)).map((id) => `fixed: ${id}; remove it from verifier/known-failures.txt`);
  if (status === 1 && failed.length === 0) {
    return { status: "fail", message: "pytest exited 1 but named no failing test" };
  }
  if (unlisted.length > 0) {
    return { status: "fail", message: [`unlisted failure: ${unlisted.join(", ")}`, ...fixed].join(" | ") };
  }
  return { status: "pass", message: fixed.join(" | ") };
}
