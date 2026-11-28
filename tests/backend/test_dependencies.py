import pathlib
import tomllib


def test_requirements_txt_does_not_exist():
    repo_root = pathlib.Path(__file__).resolve().parent.parent.parent
    requirements_file = repo_root / "backend" / "requirements.txt"
    assert not requirements_file.exists(), f"{requirements_file} should not exist"


def test_pyproject_toml_dependencies_and_pins():
    repo_root = pathlib.Path(__file__).resolve().parent.parent.parent
    pyproject_path = repo_root / "backend" / "pyproject.toml"
    assert pyproject_path.exists()

    with open(pyproject_path, "rb") as f:
        data = tomllib.load(f)

    project = data.get("project", {})
    deps = project.get("dependencies", [])

    expected_pkgs = [
        "httpx",
        "python-multipart",
        "ddgs",
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "python-dotenv",
        "psycopg2-binary",
    ]

    dep_names = []
    dep_dict = {}
    for dep in deps:
        # extract pkg name before >=, ==, [, etc.
        pkg_name = dep.split(">=")[0].split("==")[0].split("[")[0].strip()
        dep_names.append(pkg_name)
        dep_dict[pkg_name] = dep

    for expected in expected_pkgs:
        assert expected in dep_names, f"Expected {expected} in project.dependencies"

    # Specific version checks mentioned in acceptance criteria / what to build:
    # httpx>=0.27.2, python-multipart>=0.0.12, ddgs>=9.16.0, pydantic>=2.9.0, sqlalchemy>=2.0.35
    assert "httpx>=0.27.2" in dep_dict.get("httpx", "")
    assert "python-multipart>=0.0.12" in dep_dict.get("python-multipart", "")
    assert "ddgs>=9.16.0" in dep_dict.get("ddgs", "")
    assert "pydantic>=2.9.0" in dep_dict.get("pydantic", "")
    assert "sqlalchemy>=2.0.35" in dep_dict.get("sqlalchemy", "")

    # dev dependencies check
    dev_deps = project.get("optional-dependencies", {}).get("dev", [])
    dev_dep_names = [d.split(">=")[0].split("==")[0].split("[")[0].strip() for d in dev_deps]
    assert "httpx" not in dev_dep_names, "httpx should not be in dev dependencies"
    dev_pytest = [d for d in dev_deps if d.startswith("pytest")]
    assert len(dev_pytest) == 1
    assert "pytest>=8.3.0" in dev_pytest[0]

    # requires-python == "==3.14.*"
    assert project.get("requires-python") == "==3.14.*"

    # .python-version holds 3.14
    python_version_file = repo_root / ".python-version"
    assert python_version_file.exists(), ".python-version must exist"
    assert python_version_file.read_text(encoding="utf-8").strip() == "3.14"


def test_no_references_to_dash_r_requirements_txt():
    repo_root = pathlib.Path(__file__).resolve().parent.parent.parent

    # no file in the repo outside node_modules and .venv contains -r requirements.txt except ./setup
    ignored_parts = {"node_modules", ".venv", ".git", "__pycache__"}
    matches = []

    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue
        # Check if path contains ignored parts
        if any(part in path.parts for part in ignored_parts):
            continue
        rel_path = path.relative_to(repo_root)
        if rel_path == pathlib.Path("setup") or rel_path.parts[0] == "verifier" or rel_path == pathlib.Path("tests/backend/test_dependencies.py"):
            continue

        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            needle = "-r " + "requirements.txt"
            if needle in content:
                matches.append(str(rel_path))
        except OSError:
            continue

    assert not matches, f"Found -r requirements.txt in files: {matches}"
