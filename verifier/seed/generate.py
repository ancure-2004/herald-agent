"""Fill a throwaway herald database with invented clinics, for the Verifier's load check.

Usage: backend/.venv/bin/python verifier/seed/generate.py <sqlite path> [--leads N] [--seed S]

Prints "<table>: <rows>" per table and exits 0. Exits 2 for a refused path or bad
arguments (reason on stderr). Exits 1 when herald's models fail, e.g. after a model change.
"""

import argparse
import os
import sys
import traceback
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent
REPO = SEED_DIR.parents[1]
BACKEND = REPO / "backend"
REFUSED_NAME = "personal_os.db"
ALLOW_ANY = "VERIFY_SEED_ALLOW_ANY"
MIN_LEADS = 9  # herald's seed makes nine stages; build_db checks the real count too
MAX_LEADS = 99999  # the phone number format has five digits


def refuse(reason: str) -> None:
    """Exit 2 with a one-line reason; nothing is created."""
    print(f"refused: {reason}", file=sys.stderr)
    sys.exit(2)


def checked_path(raw: str) -> Path:
    """The target file, or a refusal: never the live database, never inside the repo, never over data."""
    path = Path(raw).expanduser().resolve()
    if path.name.lower() == REFUSED_NAME:
        refuse(f"{REFUSED_NAME} is the Master's live database")
    if os.environ.get(ALLOW_ANY) != "1" and (path == REPO or REPO in path.parents):
        refuse("the path is inside the herald repo")
    if path.is_dir():
        refuse("the path is a folder")
    if path.is_file() and path.stat().st_size > 0:
        refuse("the file exists and is not empty; it is never overwritten")
    return path


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Fill a throwaway herald database with invented clinics.")
    parser.add_argument("db", help="sqlite file to create (new, or an empty file)")
    parser.add_argument("--leads", type=int, default=2000, help="invented leads (default 2000)")
    parser.add_argument("--seed", type=int, default=42, help="random seed (default 42)")
    args = parser.parse_args(argv)
    if not MIN_LEADS <= args.leads <= MAX_LEADS:
        refuse(f"--leads must be from {MIN_LEADS} to {MAX_LEADS}")
    path = checked_path(args.db)

    # Set before herald's app modules load: its engine is built from DATABASE_URL at import.
    os.environ["DATABASE_URL"] = f"sqlite:///{path}"
    sys.path.insert(0, str(BACKEND))
    try:
        import build_db

        counts = build_db.run(args.leads, args.seed)
    except Exception:
        traceback.print_exc()
        print(f"error: the generator could not build the database: {sys.exc_info()[1]}", file=sys.stderr)
        return 1
    for table, rows in counts.items():
        print(f"{table}: {rows}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
