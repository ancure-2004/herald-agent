# Verifier

Runs herald's checks against a clean worktree and writes Evidence. Start it from herald's root:

```sh
./verify
```

Its only option is `--full` (every journey, see "Journeys" below). Any other argument prints a usage line and exits 2.

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
- `journeys`: runs herald's journeys (`verifier/journeys/<feature id>.journey.ts`) in headless Google Chrome with Playwright Test, against herald the Verifier starts itself (the same launch as `app-health`, in `herald.ts`). Details under "Journeys" below.
- `load`: `--full` only. Generates fake data into a throwaway database, starts herald on it, and times the main backend calls and two screens against fixed limits. Details under "Load check" below.

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

`git status --porcelain` runs before and after the checks. If the two outputs differ, `verify` writes the differing lines to `tracked-changes.txt` in Evidence and prints a warning. A tracked file that was clean before the checks and changed by them is put back with `git checkout --` (`warning: checks changed tracked files (put back): <paths>`), so a run leaves the checkout as it found it; Guild's Gate refuses a step that changes a Ticket's files. A file already changed before the checks is left as it is (`warning: checks changed tracked files: <paths>`). The exit code does not change. Outside a git repo the watch is skipped.

## Fast set and `--full`

`./verify` is the fast set: every check runs as above, but `journeys` runs only the journeys of the changed features. `./verify --full` runs every journey file. The other checks behave the same in both modes.

## Changed features

Before the checks run, `verify` works out what the branch changed:

- The base is `VERIFY_BASE` when it is set (a commit or ref), else `git merge-base HEAD main`.
- The changed files are `git diff --name-only <base>` (committed and uncommitted changes together) plus untracked files that git does not ignore.
- A changed file under `frontend/` or `backend/` belongs to every feature whose `files` claim it (a folder claims everything inside, as in the Feature map).
- A changed file under `frontend/` or `backend/` that no feature claims (shared code, or an unmapped file) makes **every** feature changed. The reason names the first such file, and `changed.log` lists them all.
- A changed journey, `verifier/journeys/<id>.journey.ts`, selects feature `<id>`, so editing a journey runs it.
- A change anywhere else (`docs/`, `tests/`, the rest of `verifier/`, the root) selects no feature.
- Renames count both paths (`git diff --no-renames`), so the feature a file moved out of is selected too.
- With no base (a bad `VERIFY_BASE`, no `main`, or no git repository), every feature is changed, and the reason starts `no base:`.

The output prints `changed files: <n>` with each file, then `changed features: <ids>`, `none`, or `all features: <reason>`. `summary.json` has the same under `changed`, and `changed.log` in Evidence has the full lists. The run writes nothing into the repository, so these lists are never polluted by the Verifier itself.

## Journeys

A journey drives herald the way the Master does and proves the result from a second view. One file per feature: `verifier/journeys/<feature id>.journey.ts`, named after the feature's map id (`global.lead-add.journey.ts`). A journey belongs to the feature with that id.

- Fast mode: the journeys of the changed features. With none (or none changed to a feature that has a journey), the check passes with `journeys: pass (no changed feature has a journey)` and starts no herald. Every changed feature with no journey is simply not run.
- `--full`: every file in `verifier/journeys/`. With none, it passes with `no journey exists`.
- `VERIFY_JOURNEYS` (comma-separated; Guild's "before" run on the base commit): only the `journeys` check runs (no typecheck, tests, e2e, app-health, feature map or load), and only the journey files an entry names: an entry is a screenshot path from an earlier run without its extension (`journeys/results/<feature>.journey-<title>-chromium/<shot>`), and it names feature `<id>` when one of its path parts is `<id>` or starts with `<id>.journey`. Screenshots land at the same paths under `VERIFY_EVIDENCE_DIR`, so the two runs pair up. An entry naming no journey on this commit runs nothing and passes with `no listed journey exists on this commit` (Guild shows that journey as new).
- Herald: started on free ports as in "Launching herald", for this check alone (a second start, with its logs in `journeys/`), and stopped pass or fail.
- Playwright runs `verifier/node_modules/.bin/playwright test <files> --config verifier/playwright.config.ts` with the clean environment plus `VERIFY_BASE_URL` (the Verifier's own herald's frontend), `VERIFY_JOURNEY_DIR` and `VERIFY_CHROME`. Headless, one worker, in the system's Google Chrome (`/usr/bin/google-chrome` unless `VERIFY_CHROME` names another binary).
- Outcome: read from Playwright's `results.json` in Evidence. Pass names what passed and what was skipped (`global.palette passed; global.lead-add skipped`); with nothing passed it says `0 passed, N skipped: <names>`, never "ran". A failing journey fails the check (exit 1); the message names each failing journey line (`N) <file:line> › <title> › <step>`) and its first error line. The full output follows in `journeys.log`. A zero exit with no readable results is could-not-run.
- Timeouts (`playwright.config.ts`): 30 s per action and per `expect`, 120 s per navigation (the first `next dev` compile), 240 s per test.
- Cannot run (exit 2): `verifier/node_modules/@playwright/test` missing, which names the setup command `cd verifier && npm install`, or no Chrome at the path. Nothing is downloaded; the browser is the system's Chrome.
- Evidence: `journeys/report/` (Playwright's HTML report), `journeys/results/` (a screenshot per journey, and a trace for a failed one).

Journeys and `playwright.config.ts` are typechecked with the rest of `verifier/`, so `npm test` needs `cd verifier && npm install` first.

### Writing a journey

- One file per feature: `verifier/journeys/<feature id>.journey.ts`, named after the map id (`global.palette.journey.ts`). The fast set and `--full` pick journeys by that name.
- Use the stable handles from the feature's map entry (`handles`, such as an aria-label or exact button text). Do not match on layout or on text that changes with the data.
- Wrap each user action in `test.step` so a failure names the step that broke.
- Prove a change from a second view: a save message alone is not proof. Reopen the screen the data lands in, or reload, and look for the result there.
- Keep data unique per run (a name with `Date.now()`), so a row from an earlier run can never pass this one.
- Never weaken a journey to pass. A herald bug parks the journey with `test.fixme` and a one-line comment naming the Backlog Request id; unpark it when the bug is fixed. A missing precondition (such as seed data) becomes a gotcha in the map.
- Run with `./verify --full` (every journey) or `./verify` (the changed features' journeys). A journey proof in the map is `verifier/journeys/<file>.ts::<test title>`.
- Evidence under `journeys/`: `report/` (Playwright's HTML report), `results/` (a screenshot per test, a trace for a failed one).

## Load check

`./verify --full` also runs `load`. Plain `./verify` never does: it passes with `skipped (only with --full)` and starts nothing.

- Data: `verifier/seed/generate.py` fills a new SQLite database with invented data (names like `Verifier Clinic 0042`, phones like `+91 90000 00042`), using herald's own models and seed data. The default is 2,000 leads (`LEADS`), seed 42 (`SEED`), in `verifier/load-limits.ts`. The same seed gives the same database, so timings compare fairly. Lead 1 is always the busy lead (12 messages, 3 calls, 2 commitments, 5 facts), so the inbox and call-brief calls always time real rows. Nothing is copied from the Master's database.
- Run: `backend/.venv/bin/python verifier/seed/generate.py <a path> --leads <N> --seed <S>` prints each table's row count. The generator refuses (exit 2) any path outside the system temp folder (`tempfile.gettempdir()`), any path inside the herald repo, a file named `personal_os.db`, and an existing non-empty file. The check uses the run's own temp folder. Running it by hand is for checking the generator: point it at a file in the temp folder, such as `/tmp/x.db`.
- Herald: started on that database (`DATABASE_URL`), as `app-health` starts it, and stopped pass or fail. Its logs are in Evidence's `load/` folder, with the generator's output in `load.log`.
- Calls: five GETs, each after one warm-up that is not counted, each timed to the end of its body. Every call is a GET the main screens make (the list in `load-limits.ts`, with the frontend line that makes it): the leads list (also the Kanban board's data), cockpit state, attention lists, inbox threads (lead 1's messages), call briefs (lead 1's calls). The call brief GET itself is not used: it calls an AI on a cache miss.
- Screens: headless Chrome, the Overview and the Leads Table (`verifier/load/screens.load.ts`). Each is loaded once (the warm-up, not timed), then loaded again and timed. The Overview's time runs from its navigation; the Leads Table's from the click on the sidebar's Leads Table button (the Overview is loaded first, untimed). A timed load ends at the later of two moments: its marker shows, and the last `/api` request in flight finishes. The 500 ms quiet window is waited for, not counted. A screen's time is written after that screen, so a Playwright timeout keeps the earlier one.

Each call and screen gets one result from its median (calls: 5 timings; screens: 1):

| Result | Rule | Effect |
|--------|------|--------|
| fast | median within the target | none |
| slow | median over the target, every try answered within the hard limit | listed under `slow:` in the status line, with its median; passes |
| broken | a try with no answer by the hard limit, a non-2xx answer, a screen not loaded in time, a screen whose warm-up failed (`broken (warm-up)`), or a screen with no timing after a Playwright timeout | `load` fails (exit 1), naming it; a broken call fails it even when the screens could not run |

| | Target | Hard limit |
|---|---|---|
| backend call | 500 ms | 10 s |
| screen | 5 s | 30 s |

Other outcomes: a missing `backend/.venv/bin/python`, `@playwright/test` (`cd verifier && npm install`), Chrome, or herald's install cannot run (exit 2). A generator that exits non-zero fails (exit 1) with its output, since a change to herald's models can cause that.

Evidence: `load.log` has the generator's output, then every call and screen sorted slowest first, each with its result, its timings and its median.

The numbers live in `verifier/load-limits.ts`. `VERIFY_LOAD_LIMITS_SCALE` multiplies every target and hard limit; the Seam tests use it to shrink them, and a real run never sets it.

## Feature map

`verifier/feature-map.json` maps herald's features: how a user reaches each one, which files make it up, and which tests prove it. It is plain JSON, so a Worker can edit it without running code. The top level is `{ "features": [ entry, ... ] }`. Each entry has:

- `id`: unique across the map, `<surface>.<feature>` (`management.board`). The surfaces are `management`, `cockpit` and `global` (reached from anywhere, such as Sprint, the command palette or Autopilot). Settings is its own surface with one entry, whose id is just `settings`. `name`: a non-empty string.
- `reach`: every way in, one per line (at least one), e.g. `"Management sidebar -> Kanban Board"`.
- `files`: files or folders that make up the feature (at least one; each must exist). Paths are relative to herald and inside it; absolute paths, paths outside it, and `.` (the root itself) are breaks. A folder claims every file inside it.
- `subFeatures`: `{ "id", "what" }` (at least one). Sub-feature ids are unique across the whole map.
- `handles`: stable labels a journey should use, such as aria-labels (may be empty).
- `endState`: the visible result that proves the feature works (non-empty).
- `gotchas`: traps for whoever touches the feature (may be empty).
- `proof`: `{ "test", "covers" }` items (may be empty). `test` is a pytest id: `path`, whose file must exist, or `path::name`, whose file must define `def name(` or `async def name(`. A journey proof is `verifier/journeys/<entry id>.journey.ts::<title>`: exactly that path (the entry's own id, no `..`), and the file must define a test with that title that runs: a `test("<title>"` or `test('<title>'` line, not commented, whose body calls no `test.skip(` or `test.fixme(` (a parked journey is no proof). A journey proof is never a known failure. `path::Class::name` looks for `name` inside `class Class`; `path::Class` accepts a `class Class` line. Commented-out lines do not count, and a `[...]` parametrize suffix is dropped before the lookup. `covers` lists one or more of this entry's own sub-feature ids.

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
- `summary.json`: each check's name, status (`pass`, `fail` or `could-not-run`), exit code and duration, the `changed` object (base, files, features, `allFeatures`, reason), plus the overall exit code.
- `backend.log`, `frontend.log`: the servers started by `app-health` (see "Launching herald"); `app-health.log` lists each request and its status.
- `changed.log`: the base, every changed file, the changed features, and any shared file that made every feature changed (see "Changed features").
- `journeys.log` and `journeys/`: the journeys check's output, its herald's logs, Playwright's report and results (see "Journeys").
- `tracked-changes.txt`: only when the checks changed tracked files; the differing `git status` lines.

The last stdout line is `evidence: <absolute path>`. Evidence survives the database cleanup.

## Tests

```sh
cd verifier && npm ci && npm test
```

`npm test` typechecks the Verifier and runs the Seam tests in `tests/`. The journeys check needs `cd verifier && npm install` before it can run a real journey; the Seam tests use a fake Playwright and never need the package. The tests copy `verify` and `verifier/` into a fixture folder, which also gets fake `backend/.venv/bin/pytest` and `backend/.venv/bin/python` scripts the test controls, and assert only on exit codes, stdout and Evidence files. They never run herald's real suite.
