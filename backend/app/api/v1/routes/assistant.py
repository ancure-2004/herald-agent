from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.assistant_controller import AssistantController
from app.schemas.hustle import ProblemReportCreate, TelegramCommandRequest

router = APIRouter(tags=["Assistant & Telegram"])


@router.post("/assistant/ask-do")
def assistant_ask_or_do(
    payload: Dict[str, Any],
    stream: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    is_stream = bool(stream) if stream is not None else bool(payload.get("stream", False))
    if is_stream:
        return StreamingResponse(
            AssistantController.stream_ask_or_do(db, payload),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    return AssistantController.ask_or_do(db, payload)


@router.post("/assistant/ask-do/stream")
@router.post("/assistant/stream")
def assistant_stream(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
):
    return StreamingResponse(
        AssistantController.stream_ask_or_do(db, payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/assistant/undo")
def assistant_undo(payload: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    return AssistantController.undo(db, payload)


@router.post("/telegram/command")
def handle_telegram_command(payload: TelegramCommandRequest, db: Session = Depends(get_db)):
    return AssistantController.handle_telegram_command(db, payload)


@router.post("/telegram/simulate")
def simulate_telegram(payload: Dict[str, Any], db: Session = Depends(get_db)):
    return AssistantController.simulate_telegram(db, payload)


@router.post("/problem-reports", status_code=201)
@router.post("/diagnostics/capture-problem-brief", status_code=201)
def create_problem_report(payload: ProblemReportCreate, db: Session = Depends(get_db)):
    return AssistantController.create_problem_report(db, payload)
