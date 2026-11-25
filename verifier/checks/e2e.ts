/**
 * herald's E2E suite: `tests/e2e/runner.py` run by the backend venv's python
 * from herald's root. Every failing, errored or skipped test must be listed in
 * known-failures.txt to pass. E2E_BASE_URL never reaches it: the clean
 * environment drops it, so it can't run against a live server.
 */
import { isE2eId } from "../known-failures.ts";
import { pytestCheck } from "../pytest-check.ts";

/** The e2e check. The runner passes only `-`-prefixed arguments to pytest, so the cache flag is one word. */
export const check = pytestCheck({
  name: "e2e",
  program: "backend/.venv/bin/python",
  args: ["tests/e2e/runner.py", "-rfEs", "-pno:cacheprovider"],
  cwd: "",
  timeoutMs: 600_000,
  owns: isE2eId,
});
