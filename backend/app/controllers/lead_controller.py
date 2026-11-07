import io
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.entities import Lead
from app.schemas.lead import CompleteTaskRequest, LeadCreate, LeadUpdate
from app.services.lead_service import LeadService
from app.services.message_service import MessageService


class LeadController:
    @staticmethod
    def list_leads(
        db: Session,
        hustle_id: Optional[int] = None,
        stage_slug: Optional[str] = None,
        smart_view: Optional[str] = None,
        include_archived: bool = False,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Lead]:
        return LeadService.list_leads(
            db=db,
            hustle_id=hustle_id,
            stage_slug=stage_slug,
            smart_view=smart_view,
            include_archived=include_archived,
            search=search,
            status=status,
        )

    @staticmethod
    def create_lead(db: Session, payload: LeadCreate) -> Lead:
        return LeadService.create_lead(db, payload)

    @staticmethod
    def update_lead(db: Session, lead_id: int, payload: LeadUpdate) -> Lead:
        return LeadService.update_lead(db, lead_id, payload)

    @staticmethod
    def complete_task(db: Session, lead_id: int, payload: CompleteTaskRequest) -> Lead:
        return LeadService.complete_task(db, lead_id, payload)

    @staticmethod
    def delete_lead_blocked() -> None:
        LeadService.delete_lead_blocked()

    @staticmethod
    def archive_lead(db: Session, lead_id: int, reason: str = "Archived by user") -> Lead:
        return LeadService.archive_lead(db, lead_id, reason)

    @staticmethod
    def export_csv(db: Session, hustle_id: Optional[int] = None) -> io.StringIO:
        return LeadService.export_csv(db, hustle_id)

    @staticmethod
    def get_copilot(db: Session, lead_id: int) -> Dict[str, Any]:
        return LeadService.get_reply_copilot(db, lead_id)

    @staticmethod
    def get_reply_copilot_list(db: Session, lead_id: int) -> List[Dict[str, Any]]:
        res = LeadService.get_reply_copilot(db, lead_id)
        return res.get("suggestions", [])

    @staticmethod
    def approve_and_send_shortcut(db: Session, lead_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        lead = LeadService.get_lead(db, lead_id)
        channel = payload.get("channel") or lead.preferred_channel or "whatsapp"
        demo_url = f"http://localhost:3001/demo/{lead.slug}"
        if lead.packages and lead.packages[-1].asset_links:
            demo_url = lead.packages[-1].asset_links.get("choice_page") or demo_url
        pitch_text = (
            f"Hi {lead.doctor_name or 'Doctor'}, we built 3 custom mobile website previews for {lead.name} "
            f"({lead.locality}): {demo_url}"
        )
        from app.schemas.message import OutboxApproveRequest

        req = OutboxApproveRequest(
            lead_id=lead.id,
            channel=channel,
            text=pitch_text,
            step_tag="initial_pitch",
            send_immediately=True,
        )
        return MessageService.approve_and_send_pitch(db=db, payload=req)

    @staticmethod
    def post_call_draft(db: Session, lead_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        return LeadService.post_call_draft(db, lead_id, payload)

    @staticmethod
    def get_recording_status(db: Session, lead_id: int) -> Dict[str, Any]:
        return LeadService.get_recording_status(db, lead_id)

    @staticmethod
    def get_recording_response(db: Session, lead_id: int):
        import os

        from fastapi.responses import FileResponse

        from app.core.exceptions import NotFoundError

        path_str = LeadService.find_lead_recording_path(db, lead_id)
        if not path_str or not os.path.exists(path_str):
            raise NotFoundError("No walkthrough recording found for this lead.")
        media_type = "video/webm" if path_str.endswith(".webm") else "video/mp4"
        return FileResponse(
            path=path_str,
            media_type=media_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Disposition": f'inline; filename="{os.path.basename(path_str)}"',
            },
        )

    @staticmethod
    def wipe_leads(db: Session) -> Dict[str, Any]:
        return LeadService.wipe_leads(db)
