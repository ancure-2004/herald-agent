"""
Dental Clinic Engine Adapter
----------------------------
Interfaces directly with the Next.js multi-template Dental Clinic Engine
located at `engines/dental-clinic-engine/`.
"""

import json
import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..config import DENTAL_ENGINE_DIR

logger = logging.getLogger("personal_os.autopilot.clinic_engine")


class ClinicEngineAdapter:
    """Manages dossier persistence and validation execution for the Next.js engine."""

    def __init__(self, engine_dir: Optional[Path] = None):
        self.engine_dir = Path(engine_dir or DENTAL_ENGINE_DIR).resolve()
        self.clinics_dir = self.engine_dir / "data" / "clinics"
        self.public_clinics_dir = self.engine_dir / "public" / "clinics"

    def list_clinic_slugs(self) -> List[str]:
        """Lists all existing clinic slugs present in the engine data folder."""
        if not self.clinics_dir.exists():
            return []
        slugs = []
        for item in self.clinics_dir.iterdir():
            try:
                if item.is_dir() and not item.name.startswith("."):
                    slugs.append(item.name)
            except OSError:
                continue
        return sorted(slugs)

    def load_clinic_dossier(self, slug: str) -> Optional[Dict[str, Any]]:
        """Loads all dossier JSON files for a given clinic slug."""
        target_dir = self.clinics_dir / slug
        if not target_dir.exists():
            return None

        dossier: Dict[str, Any] = {}
        for key in ["clinic", "claims", "services", "faqs"]:
            file_path = target_dir / f"{key}.json"
            if file_path.exists():
                try:
                    dossier[key] = json.loads(file_path.read_text(encoding="utf-8"))
                except Exception as e:
                    logger.warning(f"Failed to read {file_path}: {e}")

        templates_dir = target_dir / "templates"
        if templates_dir.exists():
            dossier["templates"] = {}
            for tpl in ["modern", "premium", "warm"]:
                tpl_path = templates_dir / f"{tpl}.json"
                if tpl_path.exists():
                    try:
                        dossier["templates"][tpl] = json.loads(tpl_path.read_text(encoding="utf-8"))
                    except Exception as e:
                        logger.warning(f"Failed to read {tpl_path}: {e}")

        return dossier

    def save_clinic_dossier(self, slug: str, payload: Dict[str, Any]) -> Dict[str, str]:
        """
        Saves a clinic dossier structure matching the engine's TypeScript schema:
        data/clinics/{slug}/
          ├── clinic.json
          ├── claims.json
          ├── services.json
          ├── faqs.json
          └── templates/{modern,premium,warm}.json
        public/clinics/{slug}/
          └── manifest.json
        """
        clinic_dir = self.clinics_dir / slug
        clinic_dir.mkdir(parents=True, exist_ok=True)
        templates_dir = clinic_dir / "templates"
        templates_dir.mkdir(parents=True, exist_ok=True)

        written_files = {}

        # 1. Base files
        for key in ["clinic", "claims", "services", "faqs"]:
            content = payload.get(key)
            if content is not None:
                target_file = clinic_dir / f"{key}.json"
                target_file.write_text(json.dumps(content, indent=2) + "\n", encoding="utf-8")
                written_files[key] = str(target_file)

        # 2. Template variants
        templates_data = payload.get("templates", {})
        for tpl_name in ["modern", "premium", "warm"]:
            tpl_content = templates_data.get(tpl_name)
            if tpl_content is not None:
                tpl_file = templates_dir / f"{tpl_name}.json"
                tpl_file.write_text(json.dumps(tpl_content, indent=2) + "\n", encoding="utf-8")
                written_files[f"template_{tpl_name}"] = str(tpl_file)

        # 3. Public manifest if provided
        manifest_data = payload.get("manifest")
        if manifest_data:
            pub_dir = self.public_clinics_dir / slug
            pub_dir.mkdir(parents=True, exist_ok=True)
            manifest_file = pub_dir / "manifest.json"
            manifest_file.write_text(json.dumps(manifest_data, indent=2) + "\n", encoding="utf-8")
            written_files["manifest"] = str(manifest_file)

        logger.info(f"Saved clinic dossier for '{slug}' with {len(written_files)} files.")
        return written_files

    def validate_clinics(self) -> Tuple[bool, str]:
        """
        Executes the TypeScript validator (`scripts/validate.ts`) inside the engine directory.
        Returns (success_flag, output_stdout).
        """
        try:
            res = subprocess.run(
                ["npx", "tsx", "scripts/validate.ts"],
                cwd=str(self.engine_dir),
                capture_output=True,
                text=True,
                timeout=60,
            )
            is_valid = res.returncode == 0
            return is_valid, res.stdout + ("\n" + res.stderr if res.stderr else "")
        except subprocess.TimeoutExpired:
            return False, "Validation timed out after 60 seconds."
        except Exception as e:
            return False, f"Failed to run validator: {e}"


# Default singleton instance
default_clinic_engine = ClinicEngineAdapter()
