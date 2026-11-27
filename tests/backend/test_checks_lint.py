import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LINT_SCRIPT = str(ROOT / "checks" / "lint")


def test_checks_lint_examples():
    bad_tsx = subprocess.run([LINT_SCRIPT, "checks/examples/bad.tsx"], cwd=ROOT, capture_output=True, text=True)
    assert bad_tsx.returncode == 1
    assert "checks/examples/bad.tsx:2:" in bad_tsx.stdout

    good_tsx = subprocess.run([LINT_SCRIPT, "checks/examples/good.tsx"], cwd=ROOT, capture_output=True, text=True)
    assert good_tsx.returncode == 0, good_tsx.stdout + good_tsx.stderr

    bad_py = subprocess.run([LINT_SCRIPT, "checks/examples/bad.py"], cwd=ROOT, capture_output=True, text=True)
    assert bad_py.returncode == 1
    assert "checks/examples/bad.py:1:" in bad_py.stdout

    good_py = subprocess.run([LINT_SCRIPT, "checks/examples/good.py"], cwd=ROOT, capture_output=True, text=True)
    assert good_py.returncode == 0, good_py.stdout + good_py.stderr

    md = subprocess.run([LINT_SCRIPT, "AGENTS.md"], cwd=ROOT, capture_output=True, text=True)
    assert md.returncode == 0


def test_checks_lint_missing_eslint_exits_nonzero(tmp_path):
    (tmp_path / "frontend").mkdir()
    sample = tmp_path / "frontend" / "sample.tsx"
    sample.write_text("export const x = 1;\n")

    env = os.environ.copy()
    env["HERALD_ROOT"] = str(tmp_path)
    res = subprocess.run([LINT_SCRIPT, str(sample)], cwd=ROOT, env=env, capture_output=True, text=True)
    assert res.returncode == 2
    assert "lint: eslint missing (run ./setup)" in res.stderr


def test_frontend_npm_run_lint_passes_and_enforces_suppressions():
    res = subprocess.run(["npm", "run", "lint"], cwd=ROOT / "frontend", capture_output=True, text=True)
    assert res.returncode == 0, res.stdout + res.stderr
