#!/usr/bin/env python3
"""
FirstMate Personal OS & CRM - MCP Server (JSON-RPC 2.0 over stdio)
Exposes CRM intelligence, 4-tier lead discovery, and specialized agents (Scout, Auditor, Closer)
to external AI harnesses (Antigravity, Claude Code, Cursor).
"""

# Item 9: mcp_server.py runs as a standalone process (invoked by Claude Code / Cursor).
# It has no guarantee that main.py ran first, so it must load .env itself before any
# app module import triggers os.getenv() at module level.
try:
    from pathlib import Path as _Path
    from dotenv import load_dotenv as _load_dotenv
    _load_dotenv(_Path(__file__).resolve().parent / ".env", override=False)
except Exception:
    pass

import json
import sys
import traceback
from typing import Any, Dict, List

from app.agents import run_auditor_agent, run_closer_agent, run_scout_agent
from app.autopilot import run_live_autopilot_discovery
from app.database import SessionLocal
from app.models import Hustle, Lead, Stage
from app.services.lead_service import sync_lead_stage_and_status  # Item 13 SSOT
from app.services.pipeline_service import _db_assert_no_active_run  # Item 11 DB lock

TOOLS: List[Dict[str, Any]] = [
    {
        "name": "list_leads",
        "description": "List CRM leads with optional filters for stage_id, locality, or search query.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage_id": {"type": "integer", "description": "Optional stage_id filter"},
                "search": {"type": "string", "description": "Optional substring filter on clinic name, doctor, or locality"},
                "limit": {"type": "integer", "description": "Maximum leads to return (default 20)"},
            },
        },
    },
    {
        "name": "get_lead_dossier",
        "description": "Retrieve full dossier, verified facts, packages, and commitments for a specific lead ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "Database ID of the lead"},
            },
            "required": ["lead_id"],
        },
    },
    {
        "name": "move_lead_stage",
        "description": "Move a lead to a new Kanban stage_id and optionally update next_action.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "Database ID of the lead"},
                "stage_id": {"type": "integer", "description": "Target stage ID"},
                "next_action": {"type": "string", "description": "Optional mandatory next action note"},
            },
            "required": ["lead_id", "stage_id"],
        },
    },
    {
        "name": "run_refill_batch",
        "description": "Trigger the 4-Tier Lead Discovery Waterfall (Google Places -> Serper -> Brave -> Playwright) for a hustle.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
                "limit": {"type": "integer", "description": "Number of new verified leads to build (default 2)"},
            },
        },
    },
    {
        "name": "run_scout_agent",
        "description": "Run the Scout Agent to enrich un-enriched leads using the 4-tier Maps/Web waterfall (Instagram disabled for Dental Clinics).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
                "batch_size": {"type": "integer", "description": "Max leads to discover/enrich (default 2)"},
            },
        },
    },
    {
        "name": "run_auditor_agent",
        "description": "Run the Auditor Agent to verify live /demo/<slug> health, sync batch.json, and link MP4 walkthroughs.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
                "record_video": {"type": "boolean", "description": "True to invoke Playwright recorder on 1 clinic"},
            },
        },
    },
    {
        "name": "run_closer_agent",
        "description": "Run the Closer Agent across WhatsApp, Instagram, or Email (defaults to dry_run=true for safety).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
                "channel": {"type": "string", "description": "whatsapp, instagram, or email"},
                "dry_run": {"type": "boolean", "description": "True for dry-run preview, false for live execution"},
            },
        },
    },
]


def execute_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        if name == "list_leads":
            q = db.query(Lead)
            if args.get("stage_id"):
                q = q.filter(Lead.stage_id == int(args["stage_id"]))
            leads = q.order_by(Lead.intent_score.desc(), Lead.fit_score.desc()).all()
            search = (args.get("search") or "").strip().lower()
            if search:
                leads = [
                    l for l in leads
                    if search in (l.name or "").lower()
                    or search in (l.doctor_name or "").lower()
                    or search in (l.locality or "").lower()
                ]
            limit = int(args.get("limit") or 20)
            return {
                "count": len(leads[:limit]),
                "leads": [
                    {
                        "id": l.id,
                        "name": l.name,
                        "slug": l.slug,
                        "doctor_name": l.doctor_name,
                        "locality": l.locality,
                        "primary_phone": l.primary_phone,
                        "stage_id": l.stage_id,
                        "fit_score": l.fit_score,
                        "intent_score": l.intent_score,
                        "demo_url": f"http://localhost:3001/demo/{l.slug}",
                    }
                    for l in leads[:limit]
                ],
            }

        if name == "get_lead_dossier":
            lead = db.query(Lead).filter(Lead.id == int(args["lead_id"])).first()
            if not lead:
                return {"error": f"Lead #{args.get('lead_id')} not found"}
            return {
                "id": lead.id,
                "name": lead.name,
                "slug": lead.slug,
                "doctor_name": lead.doctor_name,
                "locality": lead.locality,
                "primary_phone": lead.primary_phone,
                "email": lead.email,
                "stage_id": lead.stage_id,
                "fit_score": lead.fit_score,
                "intent_score": lead.intent_score,
                "next_action": lead.next_action,
                "facts": [{"field": f.field, "value": f.value, "source": f.source} for f in lead.facts],
                "packages": [
                    {
                        "id": p.id,
                        "status": p.status,
                        "asset_links": p.asset_links,
                        "video_file_path": p.video_file_path,
                    }
                    for p in lead.packages
                ],
            }

        if name == "move_lead_stage":
            lead = db.query(Lead).filter(Lead.id == int(args["lead_id"])).first()
            if not lead:
                return {"error": f"Lead #{args.get('lead_id')} not found"}
            new_stage = db.query(Stage).filter(Stage.id == int(args["stage_id"])).first()
            if not new_stage:
                return {"error": f"Stage #{args.get('stage_id')} not found"}
            old_stage_id = lead.stage_id
            # Item 13: use SSOT helper so stage_id and status stay in sync
            sync_lead_stage_and_status(db, lead, new_stage)
            if args.get("next_action"):
                lead.next_action = args["next_action"]
            db.commit()
            return {
                "ok": True,
                "lead_id": lead.id,
                "name": lead.name,
                "old_stage_id": old_stage_id,
                "new_stage_id": lead.stage_id,
                "new_status": lead.status,
            }

        if name == "run_refill_batch":
            hustle_id = int(args.get("hustle_id") or 1)
            limit = int(args.get("limit") or 2)
            hustle = db.query(Hustle).filter(Hustle.id == hustle_id).first()
            if not hustle:
                return {"error": f"Hustle #{hustle_id} not found"}
            # Item 11: DB-backed lock check (cross-process safe — mcp_server.py is a
            # separate process from the FastAPI server so the in-memory JobManager lock
            # is not visible here; the RunLog table is the only shared state).
            try:
                _db_assert_no_active_run(db)
            except Exception as lock_exc:
                return {"error": str(lock_exc)}
            return run_live_autopilot_discovery(
                db=db,
                hustle=hustle,
                target_count=limit,
            )

        if name == "run_scout_agent":
            _scout_hid = int(args.get("hustle_id") or 1)
            _scout_hustle = db.query(Hustle).filter(Hustle.id == _scout_hid).first()
            if not _scout_hustle:
                return {"error": f"Hustle #{_scout_hid} not found"}
            return run_scout_agent(
                db=db,
                hustle=_scout_hustle,
                batch_size=int(args.get("batch_size") or 2),
            )

        if name == "run_auditor_agent":
            _audit_hid = int(args.get("hustle_id") or 1)
            _audit_hustle = db.query(Hustle).filter(Hustle.id == _audit_hid).first()
            if not _audit_hustle:
                return {"error": f"Hustle #{_audit_hid} not found"}
            return run_auditor_agent(
                db=db,
                hustle=_audit_hustle,
                record_video=bool(args.get("record_video", False)),
            )

        if name == "run_closer_agent":
            _closer_hid = int(args.get("hustle_id") or 1)
            _closer_hustle = db.query(Hustle).filter(Hustle.id == _closer_hid).first()
            if not _closer_hustle:
                return {"error": f"Hustle #{_closer_hid} not found"}
            return run_closer_agent(
                db=db,
                hustle=_closer_hustle,
                channel=str(args.get("channel") or "whatsapp"),
                dry_run=bool(args.get("dry_run", True)),
            )

        return {"error": f"Unknown tool: {name}"}
    finally:
        db.close()


def handle_request(req: Dict[str, Any]) -> Dict[str, Any] | None:
    method = req.get("method")
    req_id = req.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "firstmate-crm-mcp", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        params = req.get("params") or {}
        tool_name = params.get("name", "")
        tool_args = params.get("arguments") or {}
        try:
            payload = execute_tool(tool_name, tool_args)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps(payload, indent=2, default=str)}],
                    "isError": False,
                },
            }
        except Exception as exc:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error: {exc}\n{traceback.format_exc()}"}],
                    "isError": True,
                },
            }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            resp = handle_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            err = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {exc}"},
            }
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
