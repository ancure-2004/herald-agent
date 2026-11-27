from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.controllers.health_controller import HealthController

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return HealthController.get_health(db)


@router.get("/mcp-tools")
def get_mcp_tools() -> Dict[str, Any]:
    from mcp_server import TOOLS

    tools = []
    for tool in TOOLS:
        props = tool.get("inputSchema", {}).get("properties", {})
        required = set(tool.get("inputSchema", {}).get("required", []))
        schema_parts = [f"{k}{'' if k in required else '?'}" for k in props.keys()]
        tools.append(
            {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "schema": ", ".join(schema_parts),
            }
        )
    return {"tools": tools}
