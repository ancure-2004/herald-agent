from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.agent_controller import AgentController

router = APIRouter(tags=["AI Agents"])


@router.post("/agents/scout/run")
def execute_scout_agent(payload: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    return AgentController.run_scout(db, payload)


@router.post("/agents/auditor/run")
def execute_auditor_agent(payload: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    return AgentController.run_auditor(db, payload)


@router.post("/agents/closer/run")
def execute_closer_agent(payload: Optional[Dict[str, Any]] = None, db: Session = Depends(get_db)):
    return AgentController.run_closer(db, payload)
