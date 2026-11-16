"""
Dental Batch Recorder Adapter
-----------------------------
Interfaces directly with the Playwright recording engine located at
`engines/dental-batch-recorder/`.
Provides robust process lifecycle management with deterministic teardown
to ensure no orphaned Chromium processes or half-written .mp4 files survive.
"""

import contextlib
import json
import logging
import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple

from app.autopilot.recording.naming import recording_name
from app.core.config import get_settings

from ..config import CLINICS_DATA_DIR, DENTAL_RECORDER_DIR

logger = logging.getLogger("personal_os.autopilot.recorder")


@contextlib.contextmanager
def managed_recorder_process(
    cmd: List[str],
    cwd: Path,
    timeout_seconds: int = 300,
) -> Generator[subprocess.Popen, None, None]:
    """
    Context manager that spawns a recorder subprocess in its own process group
    and deterministically terminates/kills it and any child Chromium processes upon exit or failure.
    """
    # Start in a new process group so SIGTERM/SIGKILL reaches child node/browser processes
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        preexec_fn=os.setsid if hasattr(os, "setsid") else None,
    )
    try:
        yield proc
    finally:
        if proc.poll() is None:
            logger.warning(f"Recorder process {proc.pid} still alive during cleanup; terminating process group...")
            try:
                if hasattr(os, "killpg") and hasattr(os, "getpgid"):
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                else:
                    proc.terminate()
            except Exception as e:
                logger.error(f"Error sending SIGTERM to recorder process {proc.pid}: {e}")

            # Wait briefly then force kill if needed
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                try:
                    if hasattr(os, "killpg") and hasattr(os, "getpgid"):
                        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                    else:
                        proc.kill()
                    proc.wait(timeout=2)
                except Exception as e:
                    logger.error(f"Error sending SIGKILL to recorder process {proc.pid}: {e}")


class BatchRecorderAdapter:
    """Manages batch.json generation, canonical naming, and Playwright recording subprocesses."""

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
        playable preview URLs for each clinic using canonical Clinic-{slug} naming.
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
            clean_name = recording_name(type("LeadStub", (), {"slug": slug})())

            batch_items.append(
                {
                    "name": clean_name,
                    "url": f"{base}/{tpl}/{slug}?recorder=1",
                    "choice_url": f"{base}/demo/{slug}",
                }
            )

        written_path = self.write_batch_json(batch_items)
        return {
            "synced_count": len(batch_items),
            "batch_json_path": written_path,
            "items": batch_items,
        }

    def cleanup_corrupted_recordings(self, min_bytes: int = 1000) -> List[str]:
        """Removes 0-byte or incomplete half-written .mp4 files from the recordings directory."""
        removed: List[str] = []
        if not self.recordings_dir.exists():
            return removed
        for p in self.recordings_dir.glob("*.mp4"):
            try:
                if p.is_file() and p.stat().st_size < min_bytes:
                    p.unlink(missing_ok=True)
                    removed.append(p.name)
                    logger.info(f"Cleaned up half-written recording: {p.name}")
            except Exception as e:
                logger.warning(f"Could not clean up {p.name}: {e}")
        return removed

    def run_record_batch(
        self,
        batch_file: Optional[str] = None,
        timeout_seconds: int = 300,
        output_cb: Optional[Any] = None,
    ) -> Tuple[bool, str]:
        """
        Executes `node record-batch.mjs [batch_file]` inside engines/dental-batch-recorder/.
        Guarantees process group cleanup on timeout or abort, and cleans up half-written files.
        Returns (success_flag, output_stdout).
        """
        cmd = ["node", "record-batch.mjs"]
        if batch_file:
            cmd.append(batch_file)

        logger.info(f"Executing recorder: {' '.join(cmd)} in {self.recorder_dir}")
        output_lines: List[str] = []

        try:
            with managed_recorder_process(cmd, cwd=self.recorder_dir, timeout_seconds=timeout_seconds) as proc:
                deadline = time.time() + timeout_seconds
                if proc.stdout:
                    for line in iter(proc.stdout.readline, ""):
                        clean_l = line.rstrip()
                        if clean_l:
                            output_lines.append(clean_l)
                            if output_cb:
                                try:
                                    output_cb(clean_l)
                                except Exception:
                                    pass
                        if time.time() > deadline:
                            logger.error(f"Recorder execution timed out after {timeout_seconds}s")
                            break

                proc.wait(timeout=5)
                success = proc.returncode == 0
                return success, "\n".join(output_lines)
        except Exception as e:
            logger.error(f"Failed to execute recorder: {e}")
            return False, f"Failed to execute recorder: {e}\n" + "\n".join(output_lines)
        finally:
            self.cleanup_corrupted_recordings()


# Default singleton instance
default_recorder = BatchRecorderAdapter()
