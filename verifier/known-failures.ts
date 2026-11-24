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

/**
 * The id a summary line names, or undefined for any other line. A `FAILED <id> -
 * <reason>` or `ERROR <id> - <reason>` line names the id before the first ` - `;
 * a set-up crash (an ERROR with no test id) names its file the same way. A
 * `SKIPPED [n] path:line: reason` line (pytest's `-rs`, with the count in
 * brackets) names its location `path:line`, the text before the first `: `,
 * because a skipped test has no id in the summary. Keep that location in the list.
 */
function summaryId(line: string): string | undefined {
  if (line.startsWith("SKIPPED ") && line.slice("SKIPPED ".length).startsWith("[")) {
    const rest = line.slice("SKIPPED ".length).replace(/^\[\d+\]\s*/, "");
    return rest.split(": ")[0].trim();
  }
  if (!line.startsWith("FAILED ") && !line.startsWith("ERROR ") && !line.startsWith("SKIPPED ")) return undefined;
  const rest = line.slice(line.indexOf(" ") + 1);
  const dash = rest.indexOf(" - ");
  return (dash < 0 ? rest : rest.slice(0, dash)).trim();
}

/** The ids of every test that is not passing, as its summary lines name them, once each. */
function nonPassingIds(output: string): string[] {
  const ids = output.split("\n").map(summaryId).filter((id): id is string => id !== undefined && id !== "");
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
