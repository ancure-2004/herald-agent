from typing import Any, Dict, Iterator, Optional

from sqlalchemy.orm import Session

from app.schemas.hustle import ProblemReportCreate, TelegramCommandRequest
from app.services.assistant_service import AssistantService


class AssistantController:
    @staticmethod
    def handle_telegram_command(db: Session, payload: TelegramCommandRequest) -> Dict[str, Any]:
        return AssistantService.handle_telegram_command(db, payload)

    @staticmethod
    def simulate_telegram(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        cmd = payload.get("command") or payload.get("command_text") or "/stock"
        req = TelegramCommandRequest(command_text=cmd)
        return AssistantService.handle_telegram_command(db, req)

    @staticmethod
    def create_problem_report(db: Session, payload: ProblemReportCreate) -> Dict[str, Any]:
        return AssistantService.create_problem_report(db, payload)

    @staticmethod
    def ask_or_do(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        return AssistantService.ask_or_do(db, payload)

    @staticmethod
    def stream_ask_or_do(db: Session, payload: Dict[str, Any]) -> Iterator[str]:
        return AssistantService.stream_ask_or_do(db, payload)

    @staticmethod
    def undo(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return AssistantService.undo_last_action(db, payload)
