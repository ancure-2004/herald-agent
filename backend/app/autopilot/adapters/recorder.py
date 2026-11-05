"""
Dental Batch Recorder Adapter
-----------------------------
Interfaces directly with the Playwright recording engine located at
`engines/dental-batch-recorder/`.
"""

import json
import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..config import BATCH_JSON_PATH, CLINICS_DATA_DIR, DENTAL_RECORDER_DIR
from app.core.config import get_settings

logger = logging.getLogger("personal_os.autopilot.recorder")


class BatchRecorderAdapter:
    """Manages batch.json generation and Playwright recording subprocesses."""

    def __init__(self, recorder_dir: Optional[Path] = None):
        self.recorder_dir = Path(recorder_dir or DENTAL_RECORDER_DIR).resolve()
        self.batch_json_path = self.recorder_dir / "batch.json"
        self.recordings_dir = self.recorder_dir / "recordings"

    def read_batch_json(self, path: Optional[Path] = None) -> List[Dict[str, Any]]:
        """Reads items from batch.json."""
        target_path = Path(path or self.batch_json_path)
        if not target_path.exists():
            return []
        try:
            return json.loads(target_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to read {target_path}: {e}")
            return []

    def write_batch_json(self, items: List[Dict[str, Any]], path: Optional[Path] = None) -> str:
        """Writes items to batch.json."""
        target_path = Path(path or self.batch_json_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(json.dumps(items, indent=2) + "\n", encoding="utf-8")
        logger.info(f"Wrote {len(items)} items to {target_path}")
        return str(target_path)

    def sync_clinics_to_batch(
        self,
        slugs: Optional[List[str]] = None,
        base_url: Optional[str] = None,
        target_template: str = "modern",
    ) -> Dict[str, Any]:
        """
        Reads clinic dossiers from the clinic engine and updates batch.json with
        playable preview URLs for each clinic.
        """
        settings = get_settings()
        base = (base_url or settings.DEMO_ENGINE_BASE_URL).rstrip("/")

        clinics_root = CLINICS_DATA_DIR
        target_slugs = slugs

        if target_slugs is None:
            target_slugs = []
            if clinics_root.exists():
                for d in sorted(clinics_root.iterdir()):
                    try:
                        if d.is_dir() and (d / "clinic.json").exists():
                            target_slugs.append(d.name)
                    except OSError:
                        continue

        batch_items = []
        for slug in target_slugs:
            tpl = target_template
            clinic_file = clinics_root / slug / "clinic.json"
            name = slug.replace("-", " ").title()

            if clinic_file.exists():
                try:
                    cdata = json.loads(clinic_file.read_text(encoding="utf-8"))
                    name = cdata.get("name", name)
                except Exception:
                    pass

            batch_items.append({
                "name": f"Clinic-{slug}",
                "url": f"{base}/{tpl}/{slug}",
                "choice_url": f"{base}/demo/{slug}",
            })

        written_path = self.write_batch_json(batch_items)
        return {
            "synced_count": len(batch_items),
            "batch_json_path": written_path,
            "items": batch_items,
        }

    def run_record_batch(
        self,
        batch_file: Optional[str] = None,
        timeout_seconds: int = 300,
    ) -> Tuple[bool, str]:
        """
        Executes `node record-batch.mjs [batch_file]` inside engines/dental-batch-recorder/.
        Returns (success_flag, output_stdout).
        """
        cmd = ["node", "record-batch.mjs"]
        if batch_file:
            cmd.append(batch_file)

        logger.info(f"Executing recorder: {' '.join(cmd)} in {self.recorder_dir}")
        try:
            res = subprocess.run(
                cmd,
                cwd=str(self.recorder_dir),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            success = res.returncode == 0
            output = res.stdout + ("\n" + res.stderr if res.stderr else "")
            return success, output
        except subprocess.TimeoutExpired:
            return False, f"Recorder execution timed out after {timeout_seconds} seconds."
        except Exception as e:
            return False, f"Failed to execute recorder: {e}"


# Default singleton instance
default_recorder = BatchRecorderAdapter()
