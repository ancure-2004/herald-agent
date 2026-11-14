import os
from pathlib import Path
from typing import Any, Optional


def recording_name(lead: Any) -> str:
    """Canonical recording base name (without extension) used across batch.json, recorder, and disk lookup.
    Example: Clinic-{slug}
    """
    slug = (getattr(lead, "slug", "") or "").strip()
    return f"Clinic-{slug}"


def recording_filename(lead: Any) -> str:
    """Canonical .mp4 recording filename: Clinic-{slug}.mp4"""
    return f"{recording_name(lead)}.mp4"


def find_lead_recording_path(lead: Any, recordings_dir: Optional[Path] = None) -> Optional[str]:
    """
    Returns the canonical Clinic-{slug}.mp4 recording path for a lead, or None.
    Strictly matches exact canonical filename Clinic-{slug}.mp4 (and Clinic-{slug}.webm)
    to prevent cross-batch substring collisions. Never falls back to numeric Clinic-{id}.mp4.
    """
    slug = (getattr(lead, "slug", "") or "").strip()
    if not slug:
        return None

    canonical_base = f"Clinic-{slug}"

    # 1. If lead has packages with an existing valid video_file_path
    packages = getattr(lead, "packages", None)
    if packages:
        for pkg in reversed(packages):
            vpath = getattr(pkg, "video_file_path", None)
            if vpath and os.path.exists(vpath) and os.path.getsize(vpath) > 1000:
                return str(vpath)

    # 2. Check specified or default recordings_dir
    target_dir = recordings_dir
    if target_dir is None:
        try:
            from app.autopilot.config import DENTAL_RECORDER_DIR
            target_dir = DENTAL_RECORDER_DIR / "recordings"
        except Exception:
            target_dir = None

    if target_dir and target_dir.exists():
        for ext in [".mp4", ".webm"]:
            cand = target_dir / f"{canonical_base}{ext}"
            if cand.exists() and cand.stat().st_size > 1000:
                return str(cand)

    return None
