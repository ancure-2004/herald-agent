from pathlib import Path

from app.core.config import get_settings

settings = get_settings()

BACKEND_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
MONOREPO_ROOT: Path = BACKEND_DIR.parent
PROJECTS_ROOT: Path = MONOREPO_ROOT.parent
ENGINES_DIR: Path = MONOREPO_ROOT / "engines"

# Resolved Engine Directories (derived dynamically from core settings)
DENTAL_ENGINE_DIR: Path = Path(settings.DENTAL_ENGINE_DIR).resolve()
DENTAL_RECORDER_DIR: Path = Path(settings.DENTAL_RECORDER_DIR).resolve()

# Compatibility Aliases for legacy references
PROJECT_ROOT: Path = PROJECTS_ROOT
BATCH_RECORDER_DIR: Path = DENTAL_RECORDER_DIR
BATCH_JSON_PATH: Path = DENTAL_RECORDER_DIR / "batch.json"
CLINICS_DATA_DIR: Path = DENTAL_ENGINE_DIR / "data" / "clinics"
