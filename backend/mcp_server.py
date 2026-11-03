#!/usr/bin/env python3
"""
FirstMate Personal OS & CRM - MCP Server (JSON-RPC 2.0 over stdio)
Exposes CRM intelligence, 4-tier lead discovery, and specialized agents (Scout, Auditor, Closer)
to external AI harnesses (Antigravity, Claude Code, Cursor).
"""

import json
import sys
import traceback
from typing import Any, Dict, List

from app.database import SessionLocal
from app.models import Hustle, Lead, Stage
from app.agents import run_scout_agent, run_auditor_agent, run_closer_agent
from app.autopilot import run_live_autopilot_discovery


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
            old_stage = lead.stage_id
            lead.stage_id = int(args["stage_id"])
            if args.get("next_action"):
                lead.next_action = args["next_action"]
            db.commit()
            return {
                "ok": True,
                "lead_id": lead.id,
                "name": lead.name,
                "old_stage_id": old_stage,
                "new_stage_id": lead.stage_id,
            }

        if name == "run_refill_batch":
            hustle_id = int(args.get("hustle_id") or 1)
            limit = int(args.get("limit") or 2)
            hustle = db.query(Hustle).filter(Hustle.id == hustle_id).first()
            if not hustle:
                return {"error": f"Hustle #{hustle_id} not found"}
            return run_live_autopilot_discovery(
                db=db,
                hustle=hustle,
                target_count=limit,
            )

        if name == "run_scout_agent":
            return run_scout_agent(
                db=db,
                hustle_id=int(args.get("hustle_id") or 1),
                batch_size=int(args.get("batch_size") or 2),
            )

        if name == "run_auditor_agent":
            return run_auditor_agent(
                db=db,
                hustle_id=int(args.get("hustle_id") or 1),
                record_video=bool(args.get("record_video", False)),
            )

        if name == "run_closer_agent":
            return run_closer_agent(
                db=db,
                hustle_id=int(args.get("hustle_id") or 1),
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
