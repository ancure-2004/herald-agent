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

Every check runs with a clean environment (PATH, HOME, LANG, TERM, TMPDIR, `CI=1`, `DATABASE_URL`, and the caller's `VERIFY_*` variables) and a throwaway SQLite database, `DATABASE_URL=sqlite:///<temp folder>/verify.db`. The temp folder is removed at the end of the run, pass or fail. npm adds its own variables (`npm_*` and a few others) to the scripts it runs.

## Evidence

Each run writes to `VERIFY_EVIDENCE_DIR` if set, else to a new temp folder:

- `<check>.log`: command, status, exit code, duration and full output.
- `summary.json`: each check's name, status (`pass`, `fail` or `could-not-run`), exit code and duration, plus the overall exit code.

The last stdout line is `evidence: <absolute path>`. Evidence survives the database cleanup.

## Tests

```sh
cd verifier && npm ci && npm test
```

`npm test` typechecks the Verifier and runs the Seam tests in `tests/`. The tests copy `verify` and `verifier/` into a fixture folder and assert only on exit codes, stdout and Evidence files.
