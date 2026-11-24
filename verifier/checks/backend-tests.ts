/**
 * The backend test suite: `pytest` in backend/ with herald's venv. Every
 * failing, errored (-E) or skipped (-s) test must be listed in
 * known-failures.txt to pass; the e2e ids there are not this check's.
 */
import { isE2eId } from "../known-failures.ts";
import { pytestCheck } from "../pytest-check.ts";

/** The backend-tests check: quiet, no cache folder in the repo, a summary line per non-passing test, 15 minutes at most. */
export const check = pytestCheck({
  name: "backend-tests",
  program: "backend/.venv/bin/pytest",
  args: ["-q", "-p", "no:cacheprovider", "-rfEs"],
  cwd: "backend",
  timeoutMs: 900_000,
  owns: (id) => !isE2eId(id),
});
