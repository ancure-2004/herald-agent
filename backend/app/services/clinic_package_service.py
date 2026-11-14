import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import GoneError, NotFoundError
from app.models.entities import Lead, Package
from app.repositories.lead_repo import LeadRepository
from app.repositories.package_repo import PackageRepository


class ClinicPackageService:
    @staticmethod
    def get_public_clinic_package(db: Session, slug: str) -> Dict[str, Any]:
        """Fetches the latest sealed clinic package for the dental-clinic-engine multi-template frontend."""
        lead = db.query(Lead).filter(Lead.slug == slug).first()
        if not lead:
            raise NotFoundError("Clinic package not found")

        pkg = PackageRepository.get_latest_by_lead_id(db, lead.id)
        if not pkg:
            raise NotFoundError("Clinic package not found")

        payload = (
            json.loads(pkg.clinic_payload)
            if isinstance(pkg.clinic_payload, str)
            else pkg.clinic_payload
        )

        return {
            "lead_id": lead.id,
            "slug": lead.slug,
            "name": lead.name,
            "doctor_name": lead.doctor_name,
            "primary_phone": lead.primary_phone,
            "package_id": pkg.id,
            "clinic_payload": payload,
            "status": pkg.status,
            "expires_at": pkg.expires_at.isoformat() if getattr(pkg, "expires_at", None) else None,
        }

    @staticmethod
    def get_public_demo(db: Session, slug: str) -> Dict[str, Any]:
        """Fetches the public preview demo for a clinic with expiration enforcement."""
        lead = (
            db.query(Lead)
            .options(joinedload(Lead.packages))
            .filter(Lead.slug == slug)
            .first()
        )
        if not lead or not lead.packages:
            raise NotFoundError("Demo package not found.")

        pkg = lead.packages[-1]
        now = datetime.now(timezone.utc)
        if pkg.expires_at:
            exp = (
                pkg.expires_at
                if pkg.expires_at.tzinfo
                else pkg.expires_at.replace(tzinfo=timezone.utc)
            )
            if now > exp:
                pkg.status = "expired"
                db.commit()
                raise GoneError(
                    "This clinic preview link has expired. Reply on WhatsApp to re-open it."
                )

        return {
            "lead_id": lead.id,
            "slug": lead.slug,
            "clinic_name": lead.name,
            "doctor_name": lead.doctor_name,
            "phone": lead.primary_phone,
            "locality": lead.locality,
            "city": lead.city,
            "asset_links": pkg.asset_links,
            "clinic_payload": pkg.clinic_payload,
            "expires_at": pkg.expires_at,
        }
