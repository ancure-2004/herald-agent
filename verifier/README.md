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

Before anything else (even reading its arguments), `verify` exits 2 if any of these exists in the checkout it lives in: `backend/.env` (or a symlink by that name, even a broken one), any `backend/personal_os.db*` file, any file whose name starts with `.env` directly in `frontend/`, or in an `engines/*/` folder (e.g. `engines/demo/.env`). It only checks that the file exists; it never opens, copies or reads it. Run it in a clean worktree instead.

## Checks

Each check is one file in `checks/` exporting `check` (a name and a run function, which may be async). `verify` finds them there and runs them in file-name order, one after another; a new check is a new file, with no list to edit. Current checks:

- `typecheck`: `npm run typecheck` in `frontend/`. Needs `frontend/node_modules`; without it the check cannot run (run `cd frontend && npm ci`).
- `backend-tests`: `backend/.venv/bin/pytest -q -p no:cacheprovider -rf` in `backend/`. Needs the venv; without it the check cannot run. Set it up once per worktree:

  ```sh
  cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]" -r requirements.txt
  ```

  Exit 0 passes. Exit 1 passes only if every failing test is listed in `verifier/known-failures.txt`; an unlisted failure fails the check and its id is named. Errors (set-up crashes) and skips count as failures too unless listed, so a skip on exit 0 still fails. Any other pytest exit (collection error, crash, timeout) fails it.
- `app-health`: starts herald's backend and frontend itself, on two free ports (never 8000, 3000 or 3001), and checks they answer. It needs `backend/.venv/bin/uvicorn` (the venv setup above) and `frontend/node_modules/.bin/next` (`cd frontend && npm ci`); without either it cannot run. Details under "Launching herald" below.
- `e2e`: `backend/.venv/bin/python tests/e2e/runner.py -rfEs -pno:cacheprovider` in the root, under the same venv (without it the check cannot run, and it names the same setup command). The same rule as `backend-tests`, against the same list. `E2E_BASE_URL` never reaches it (it is not on the clean environment's list), so E2E cannot run against a live server.

- `feature-map`: reads `verifier/feature-map.json` and checks every entry is well formed and its files and proof tests exist. Reads files only; starts no program. Details under "Feature map" below.

### Launching herald (`app-health`)

Both servers are started as herald runs them, with the same clean environment as the other checks (throwaway database, stubs), plus:

- backend: `backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port <port>` in `backend/`, with `CORS_ORIGINS=["http://127.0.0.1:<frontend port>","http://localhost:<frontend port>"]` (a JSON list: herald crashes on the comma form its settings describe).
- frontend: `frontend/node_modules/.bin/next dev --webpack --port <port> --hostname 127.0.0.1` (as herald's own `dev` script) in `frontend/`, with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:<backend port>` and `NEXT_TELEMETRY_DISABLED=1`. Next's own `frontend/.env*` files are refused, so none are read (settings templates, `.env.example`, `.env.sample` and `.env.template`, are allowed: they hold no secrets and Next never reads them).

Ports come from the operating system (a listen on port 0), so each run gets new ones. The demo engine is not started.

- Ready means answering: the backend when `GET /api/health` returns 200, the frontend when `GET /` returns 200. Each is polled every 500 ms. Limits: 60 s for the backend, 180 s for the frontend (first compile included). On a slow machine, raise them with `VERIFY_BACKEND_READY_SECONDS` and `VERIFY_FRONTEND_READY_SECONDS` (they pass through like any `VERIFY_*` variable).
- A server that exits before it answers stops the wait at once.
- Outcome: both answer 200 means pass. A crash on start, or a limit passing, fails the check (exit 1) and shows the last 20 lines of that server's log. A missing venv or `node_modules`, or no free port, cannot run (exit 2). If `verify` itself is stopped from outside (Ctrl-C, SIGTERM, SIGHUP), it stops every server it started at once and exits 2, so nothing is left holding a port. A 200 counts only while the server the Verifier started is still alive.
- Stopping: each server runs in its own process group. `verify` sends SIGTERM to the group, then SIGKILL after 5 s if anything is still alive, and confirms the port is free again. This runs on pass and fail alike, even if the check throws. Nothing is stopped by name.
- Evidence: `backend.log` and `frontend.log` (each server's output), and `app-health.log` (every request and its status).

### Quarantine: `known-failures.txt`

One id per line, then `  # <Request id>` naming the Request it belongs to. `#` starts a comment; blank lines are ignored. Both checks share this one list. A `FAILED` or `ERROR` summary line names a test id. A `SKIPPED` line has no id, so list its location, `path:line` (`tests/e2e/x.py:12`), as pytest prints it (backend skips print paths like `../tests/backend/x.py:12`, since that suite runs from `backend/`). A location moves when lines above it change; then the skip shows up unlisted and fails, which is the safe way round. Each check judges only its own ids: those starting `tests/e2e/` are e2e's, the rest backend-tests'. Listed tests that still fail are shown on their check's line as `still failing (listed): <ids>` (the check still passes); their reasons are in `<check>.log`. The list only shrinks: a listed test that now passes is printed as `fixed: <id>; remove it from verifier/known-failures.txt` and does not fail the check, so remove its line. Never add a line to hide a new failure. The Gate (Day 3) will refuse a Worker branch that adds one.

Every check runs with a clean environment (PATH, HOME, LANG, TERM, TMPDIR, `CI=1`, `DATABASE_URL`, and the caller's `VERIFY_*` variables) and a throwaway SQLite database, `DATABASE_URL=sqlite:///<temp folder>/verify.db`. The temp folder is removed at the end of the run, pass or fail. npm adds its own variables (`npm_*` and a few others) to the scripts it runs.

### Stubs

Every check runs with `PATH` starting at a stub folder, `stub-bin/`, inside the run's temp folder. It holds `agy`, `gemini` and `claude`; each prints `blocked by verify: <name>` to stderr and exits 1 at once. A test that reaches a real model or spends quota fails in milliseconds instead. The folder is removed with the temp folder.

### Tracked-file warning

`git status --porcelain` runs before and after the checks. If the two outputs differ, `verify` prints `warning: checks changed tracked files: <paths>` and writes the differing lines to `tracked-changes.txt` in Evidence. This is a warning only: the exit code does not change and nothing is restored. Outside a git repo the watch is skipped.

## Feature map

`verifier/feature-map.json` maps herald's features: how a user reaches each one, which files make it up, and which tests prove it. It is plain JSON, so a Worker can edit it without running code. The top level is `{ "features": [ entry, ... ] }`. Each entry has:

- `id`: unique across the map, `<surface>.<feature>` (`management.board`). The surfaces are `management`, `cockpit` and `global` (reached from anywhere, such as Sprint, the command palette or Autopilot). Settings is its own surface with one entry, whose id is just `settings`. `name`: a non-empty string.
- `reach`: every way in, one per line (at least one), e.g. `"Management sidebar -> Kanban Board"`.
- `files`: files or folders that make up the feature (at least one; each must exist). Paths are relative to herald and inside it; absolute paths, paths outside it, and `.` (the root itself) are breaks. A folder claims every file inside it.
- `subFeatures`: `{ "id", "what" }` (at least one). Sub-feature ids are unique across the whole map.
- `handles`: stable labels a journey should use, such as aria-labels (may be empty).
- `endState`: the visible result that proves the feature works (non-empty).
- `gotchas`: traps for whoever touches the feature (may be empty).
- `proof`: `{ "test", "covers" }` items (may be empty). `test` is a pytest id: `path`, whose file must exist, or `path::name`, whose file must define `def name(` or `async def name(`. `path::Class::name` looks for `name` inside `class Class`; `path::Class` accepts a `class Class` line. Commented-out lines do not count, and a `[...]` parametrize suffix is dropped before the lookup. `covers` lists one or more of this entry's own sub-feature ids.

```json
{
  "id": "management.board",
  "name": "Kanban Board",
  "reach": ["Management sidebar -> Kanban Board", "Cmd+K -> Board"],
  "files": ["frontend/src/features/board", "backend/app/services/lead_service.py"],
  "subFeatures": [
    { "id": "board.drag-stage", "what": "drag a card to another column" },
    { "id": "board.smart-views", "what": "the six smart views" }
  ],
  "handles": ["Kanban Board"],
  "endState": "the card shows in the new column after reload",
  "gotchas": ["Cockpit keys 1-4 mean something else inside Outreach"],
  "proof": [
    { "test": "tests/e2e/tier1_feature_coverage/test_f2_leads_and_channels.py::test_leads_list_returns_active_clinics", "covers": ["board.smart-views"] }
  ]
}
```

**To add a feature:** add an entry with each field above, point `files` at real paths, and add a proof only where an existing test really checks that sub-feature. A sub-feature with no proof is a gap, which is reported, not failed.

**What fails (exit 1):** the file is missing or does not parse, the top level is wrong, or any entry breaks a rule. The `feature-map` line names every break, with the entry `id` and the bad field, path or test. A list item is named by its number (`files[2]`, `proof[1] covers[3]`). An unreadable map, feature folder or proof file is a break too: exit 1, never a crash (exit 2). Renaming a feature file or a proof test without updating the map fails here.

**What is only reported:** gaps (sub-features no proof covers) and unmapped files (files under `frontend/src/features/`, `backend/app/api/v1/routes/`, `backend/app/services/` or `backend/app/autopilot/` that no entry claims; `__init__.py`, `*.pyc` and `__pycache__` are skipped). Both are listed with their counts in `feature-map.log` and never change the status. A proof on `known-failures.txt` (a test that fails on every run) counts as a gap: its sub-feature's gap line names it (`- proof known to fail: <test>`), and the per-feature line shows how many of its proofs are known to fail. Symlinks under the feature roots are neither followed nor counted: the unmapped scan skips them. A `files` entry may name a symlink; it is checked by what it points to.

## Evidence

Each run writes to `VERIFY_EVIDENCE_DIR` if set, else to a new temp folder:

- `<check>.log`: command, status, exit code, duration and full output.
- `summary.json`: each check's name, status (`pass`, `fail` or `could-not-run`), exit code and duration, plus the overall exit code.
- `backend.log`, `frontend.log`: the servers started by `app-health` (see "Launching herald"); `app-health.log` lists each request and its status.
- `tracked-changes.txt`: only when the checks changed tracked files; the differing `git status` lines.

The last stdout line is `evidence: <absolute path>`. Evidence survives the database cleanup.

## Tests

```sh
cd verifier && npm ci && npm test
```

`npm test` typechecks the Verifier and runs the Seam tests in `tests/`. The tests copy `verify` and `verifier/` into a fixture folder, which also gets fake `backend/.venv/bin/pytest` and `backend/.venv/bin/python` scripts the test controls, and assert only on exit codes, stdout and Evidence files. They never run herald's real suite.
