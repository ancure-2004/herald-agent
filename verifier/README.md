# Verifier

Runs herald's checks against a clean worktree and writes Evidence. Start it from herald's root:

```sh
./verify
```

It takes no options; any argument prints a usage line and exits 2.

## Exit codes

- `0`: every check passed.
- `1`: at least one check failed and none could not run.
- `2`: the Verifier or a check could not run (refusal, missing dependency, unknown flag, crash). Wins over `1`.

## Refusals

Before anything else (even reading its arguments), `verify` exits 2 if `backend/.env` (or a symlink by that name, even a broken one) or any `backend/personal_os.db*` file exists in the checkout it lives in. It only checks that the file exists; it never opens, copies or reads it. Run it in a clean worktree instead.

## Checks

Each check is one file in `checks/` exporting `check` (a name and a run function). `verify` finds them there and runs them in file-name order; a new check is a new file, with no list to edit. Current checks:

- `typecheck`: `npm run typecheck` in `frontend/`. Needs `frontend/node_modules`; without it the check cannot run (run `cd frontend && npm ci`).
- `backend-tests`: `backend/.venv/bin/pytest -q -p no:cacheprovider -rf` in `backend/`. Needs the venv; without it the check cannot run. Set it up once per worktree:

  ```sh
  cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]" -r requirements.txt
  ```

  Exit 0 passes. Exit 1 passes only if every failing test is listed in `verifier/known-failures.txt`; an unlisted failure fails the check and its id is named. Errors (set-up crashes) and skips count as failures too unless listed, so a skip on exit 0 still fails. Any other pytest exit (collection error, crash, timeout) fails it.
- `e2e`: `backend/.venv/bin/python tests/e2e/runner.py -rfEs -pno:cacheprovider` in the root, under the same venv (without it the check cannot run, and it names the same setup command). The same rule as `backend-tests`, against the same list. `E2E_BASE_URL` never reaches it (it is not on the clean environment's list), so E2E cannot run against a live server.

### Quarantine: `known-failures.txt`

One id per line, then `  # <Request id>` naming the Request it belongs to. `#` starts a comment; blank lines are ignored. Both checks share this one list. A `FAILED` or `ERROR` summary line names a test id. A `SKIPPED` line has no id, so list its location, `path:line` (`tests/e2e/x.py:12`), as pytest prints it (backend skips print paths like `../tests/backend/x.py:12`, since that suite runs from `backend/`). A location moves when lines above it change; then the skip shows up unlisted and fails, which is the safe way round. Each check judges only its own ids: those starting `tests/e2e/` are e2e's, the rest backend-tests'. Listed tests that still fail are shown on their check's line as `still failing (listed): <ids>` (the check still passes); their reasons are in `<check>.log`. The list only shrinks: a listed test that now passes is printed as `fixed: <id>; remove it from verifier/known-failures.txt` and does not fail the check, so remove its line. Never add a line to hide a new failure. The Gate (Day 3) will refuse a Worker branch that adds one.

Every check runs with a clean environment (PATH, HOME, LANG, TERM, TMPDIR, `CI=1`, `DATABASE_URL`, and the caller's `VERIFY_*` variables) and a throwaway SQLite database, `DATABASE_URL=sqlite:///<temp folder>/verify.db`. The temp folder is removed at the end of the run, pass or fail. npm adds its own variables (`npm_*` and a few others) to the scripts it runs.

### Stubs

Every check runs with `PATH` starting at a stub folder, `stub-bin/`, inside the run's temp folder. It holds `agy`, `gemini` and `claude`; each prints `blocked by verify: <name>` to stderr and exits 1 at once. A test that reaches a real model or spends quota fails in milliseconds instead. The folder is removed with the temp folder.

### Tracked-file warning

`git status --porcelain` runs before and after the checks. If the two outputs differ, `verify` prints `warning: checks changed tracked files: <paths>` and writes the differing lines to `tracked-changes.txt` in Evidence. This is a warning only: the exit code does not change and nothing is restored. Outside a git repo the watch is skipped.

## Evidence

Each run writes to `VERIFY_EVIDENCE_DIR` if set, else to a new temp folder:

- `<check>.log`: command, status, exit code, duration and full output.
- `summary.json`: each check's name, status (`pass`, `fail` or `could-not-run`), exit code and duration, plus the overall exit code.
- `tracked-changes.txt`: only when the checks changed tracked files; the differing `git status` lines.

The last stdout line is `evidence: <absolute path>`. Evidence survives the database cleanup.

## Tests

```sh
cd verifier && npm ci && npm test
```

`npm test` typechecks the Verifier and runs the Seam tests in `tests/`. The tests copy `verify` and `verifier/` into a fixture folder, which also gets fake `backend/.venv/bin/pytest` and `backend/.venv/bin/python` scripts the test controls, and assert only on exit codes, stdout and Evidence files. They never run herald's real suite.
