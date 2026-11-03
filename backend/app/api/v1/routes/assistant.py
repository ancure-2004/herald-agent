from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.assistant_controller import AssistantController
from app.schemas.hustle import ProblemReportCreate, TelegramCommandRequest

router = APIRouter(tags=["Assistant & Telegram"])


@router.post("/assistant/ask-do")
def assistant_ask_or_do(payload: Dict[str, Any], db: Session = Depends(get_db)):
    return AssistantController.ask_or_do(db, payload)


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
