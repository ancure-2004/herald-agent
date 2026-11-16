from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.lead_controller import LeadController
from app.schemas.call import CallBriefOut, CallCreate, CallOut
from app.schemas.lead import CompleteTaskRequest, LeadCreate, LeadOut, LeadUpdate

router = APIRouter(tags=["Leads"])


@router.get("/leads", response_model=List[LeadOut])
def list_leads(
    hustle_id: Optional[int] = Query(None),
    stage_slug: Optional[str] = Query(None),
    smart_view: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return LeadController.list_leads(
        db=db,
        hustle_id=hustle_id,
        stage_slug=stage_slug,
        smart_view=smart_view,
        include_archived=include_archived,
        search=search,
        status=status,
    )


@router.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    return LeadController.create_lead(db, payload)


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    return LeadController.update_lead(db, lead_id, payload)


@router.post("/leads/{lead_id}/complete-task", response_model=LeadOut)
def complete_lead_task(lead_id: int, payload: CompleteTaskRequest, db: Session = Depends(get_db)):
    return LeadController.complete_task(db, lead_id, payload)


@router.delete("/leads/{lead_id}")
def delete_lead_blocked():
    LeadController.delete_lead_blocked()


@router.post("/leads/{lead_id}/archive", response_model=LeadOut)
def archive_lead(lead_id: int, reason: str = Query("Archived by user"), db: Session = Depends(get_db)):
    return LeadController.archive_lead(db, lead_id, reason)


@router.get("/leads/export/csv")
def export_leads_csv(hustle_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    output = LeadController.export_csv(db, hustle_id)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"},
    )


@router.get("/leads/{lead_id}/copilot")
def get_reply_copilot(lead_id: int, db: Session = Depends(get_db)):
    return LeadController.get_copilot(db, lead_id)


@router.get("/leads/{lead_id}/reply-copilot")
def get_reply_copilot_list(lead_id: int, db: Session = Depends(get_db)):
    return LeadController.get_reply_copilot_list(db, lead_id)


@router.post("/leads/{lead_id}/approve-send")
def approve_and_send_lead_shortcut(lead_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return LeadController.approve_and_send_shortcut(db, lead_id, payload)


@router.post("/leads/{lead_id}/post-call-draft")
def generate_post_call_draft(lead_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    return LeadController.post_call_draft(db, lead_id, payload)


@router.get("/leads/{lead_id}/recording/status")
def get_lead_recording_status(lead_id: int, db: Session = Depends(get_db)):
    return LeadController.get_recording_status(db, lead_id)


@router.get("/leads/{lead_id}/recording")
def get_lead_recording(lead_id: int, db: Session = Depends(get_db)):
    return LeadController.get_recording_response(db, lead_id)


@router.post("/leads/{lead_id}/copy-video")
def copy_lead_video(lead_id: int, db: Session = Depends(get_db)):
    """Copies the lead's walkthrough video file to system clipboard and returns file paths."""
    return LeadController.copy_lead_video(db, lead_id)


@router.post("/leads/{lead_id}/calls", response_model=CallOut, status_code=201)
def log_lead_call(lead_id: int, payload: CallCreate, db: Session = Depends(get_db)):
    """Logs raw call text, structures into 5 sections + prep brief in <10s, and updates lead."""
    return LeadController.log_call(db, lead_id, payload)


@router.get("/leads/{lead_id}/call-brief", response_model=CallBriefOut)
def get_lead_call_brief(
    lead_id: int,
    force_regenerate: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    """Returns pre-call 'what to talk about' briefing card combining call notes and chat history."""
    return LeadController.get_call_brief(db, lead_id, force_regenerate=force_regenerate)


@router.post("/admin/wipe-leads")
def wipe_leads(
    db: Session = Depends(get_db),
    x_confirm_wipe: Optional[str] = Header(default=None, alias="X-Confirm-Wipe"),
):
    """Permanently deletes all leads, messages, and packages.

    Requires the header ``X-Confirm-Wipe: PERMANENTLY_DELETE_ALL`` to prevent
    accidental calls (Item 1).
    """
    if x_confirm_wipe != "PERMANENTLY_DELETE_ALL":
        raise HTTPException(
            status_code=403,
            detail=(
                "Safety interlock: you must pass the header "
                "'X-Confirm-Wipe: PERMANENTLY_DELETE_ALL' to execute this operation."
            ),
        )
    return LeadController.wipe_leads(db)
