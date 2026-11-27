import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LINT_SCRIPT = ROOT / "checks" / "lint-immutability"
BAD_EXAMPLE = ROOT / "checks" / "examples" / "bad_immutability.py"
GOOD_EXAMPLE = ROOT / "checks" / "examples" / "good_immutability.py"


def test_lint_immutability_rejects_bad_example():
    res = subprocess.run([sys.executable, str(LINT_SCRIPT), str(BAD_EXAMPLE)], capture_output=True, text=True)
    assert res.returncode == 1, f"Expected bad example to be flagged, got {res.returncode}: {res.stdout} {res.stderr}"


def test_lint_immutability_accepts_good_example():
    res = subprocess.run([sys.executable, str(LINT_SCRIPT), str(GOOD_EXAMPLE)], capture_output=True, text=True)
    assert res.returncode == 0, f"Expected good example to pass, got {res.returncode}: {res.stdout} {res.stderr}"


def test_lint_immutability_passes_on_backend_app_with_shrink_only_allowlist():
    res = subprocess.run([sys.executable, str(LINT_SCRIPT)], capture_output=True, text=True)
    assert res.returncode == 0, f"lint-immutability failed on backend/app:\n{res.stderr}"
