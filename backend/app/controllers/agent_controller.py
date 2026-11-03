from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.services.agent_service import AgentService


class AgentController:
    @staticmethod
    def run_scout(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return AgentService.run_scout(db, payload)

    @staticmethod
    def run_auditor(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return AgentService.run_auditor(db, payload)

    @staticmethod
    def run_closer(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return AgentService.run_closer(db, payload)
