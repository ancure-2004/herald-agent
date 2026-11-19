#!/usr/bin/env python3
"""
Herald - Multi-Agent Operations Engine - Model Context Protocol (MCP) Server
Protocol Version: 2024-11-05 (JSON-RPC 2.0 over stdio)

Exposes production CRM intelligence, direct lead ingestion, lead communications,
batch autopilot execution, and full read/audit trails cleanly mapped to
FastAPI backend single-source-of-truth (SSOT) services.
"""

import json
import os
from pathlib import Path
import sys
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# Ensure backend root is on sys.path and load environment variables
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(_BACKEND_DIR / ".env", override=False)
except Exception:
    pass

from app.database import SessionLocal
from app.models.entities import (
    Call,
    Hustle,
    Lead,
    LeadFact,
    Message,
    Package,
    RunLog,
    Stage,
    TerminalLog,
    TrackingEvent,
)
from app.schemas.call import CallCreate
from app.schemas.lead import LeadCreate
from app.services.agent_tools import AgentTools
from app.services.call_service import CallService
from app.services.lead_service import LeadService, sync_lead_stage_and_status
from app.services.pipeline_service import _db_assert_no_active_run, PipelineService
from app.services.pipeline_service import PipelineService
from app.autopilot.build.factory_service import DemoFactoryService
from app.agents import run_closer_agent


TOOLS: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # 1. Direct Lead Ingestion
    # -------------------------------------------------------------------------
    {
        "name": "add_lead",
        "description": "Ingest a single new lead directly into CRM with duplicate contact checks (phone/IG) and auto-slugging.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Clinic or company name"},
                "doctor_name": {"type": "string", "description": "Doctor or contact person name (defaults to 'Doctor In-Charge')"},
                "locality": {"type": "string", "description": "Locality/neighborhood (e.g. 'Rohini', 'Hauz Khas')"},
                "city": {"type": "string", "description": "City (defaults to 'Delhi')"},
                "address": {"type": "string", "description": "Street address"},
                "primary_phone": {"type": "string", "description": "Primary phone number"},
                "email": {"type": "string", "description": "Contact email address"},
                "instagram_handle": {"type": "string", "description": "Instagram handle (without @)"},
                "preferred_channel": {"type": "string", "description": "Preferred channel: 'whatsapp', 'instagram', 'email' (default 'whatsapp')"},
                "next_action": {"type": "string", "description": "Mandatory next action note (default 'Review lead and prepare pitch')"},
                "deal_value_inr": {"type": "integer", "description": "Estimated deal value in INR (default 25000)"},
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "bulk_add_leads",
        "description": "Bulk ingest multiple leads with deduplication, atomic database commit, and per-lead success/skip reporting.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "leads": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "doctor_name": {"type": "string"},
                            "locality": {"type": "string"},
                            "city": {"type": "string"},
                            "address": {"type": "string"},
                            "primary_phone": {"type": "string"},
                            "email": {"type": "string"},
                            "instagram_handle": {"type": "string"},
                            "preferred_channel": {"type": "string"},
                            "next_action": {"type": "string"},
                            "deal_value_inr": {"type": "integer"},
                        },
                        "required": ["name"],
                    },
                    "description": "List of lead objects to ingest",
                },
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
            },
            "required": ["leads"],
        },
    },

    # -------------------------------------------------------------------------
    # 2. Lead Communications
    # -------------------------------------------------------------------------
    {
        "name": "send_message",
        "description": "Draft or send an external outreach message with explicit safety check (requires confirmed=True to transmit).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "Target lead database ID"},
                "text": {"type": "string", "description": "Message body to send"},
                "channel": {"type": "string", "description": "Channel: 'whatsapp', 'instagram', or 'email' (default 'whatsapp')"},
                "confirmed": {"type": "boolean", "description": "Safety gate: False returns pending confirmation draft, True sends immediately (default False)"},
            },
            "required": ["lead_id", "text"],
        },
    },
    {
        "name": "log_call",
        "description": "Log a completed call note for a lead, automatically generating structured summaries and next steps.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "Database ID of the lead"},
                "raw_text": {"type": "string", "description": "Call notes / transcript or summary of conversation"},
                "duration_seconds": {"type": "integer", "description": "Call duration in seconds (default 120)"},
                "outcome": {"type": "string", "description": "Outcome: 'connected', 'busy', 'no_answer', 'voicemail', 'completed' (default 'connected')"},
            },
            "required": ["lead_id", "raw_text"],
        },
    },

    # -------------------------------------------------------------------------
    # 3. Batch Autopilot Execution
    # -------------------------------------------------------------------------
    {
        "name": "run_discovery",
        "description": "Run lead discovery waterfall (Google Places -> Serper -> Brave -> Playwright) with locality/query targeting and stop_after stages.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "locality": {"type": "string", "description": "Target locality, preset zone, or search query (e.g. 'Rohini', 'Hauz Khas', 'Gurugram')"},
                "limit": {"type": "integer", "description": "Target count of new verified leads to discover (default 2)"},
                "stop_after": {"type": "string", "description": "Optional stage to stop after ('discovery', 'enrichment', 'build')"},
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
            },
        },
    },
    {
        "name": "run_demo_factory",
        "description": "Trigger the Autopilot Demo Factory to scaffold websites, validate gates, and record Playwright demo videos for staged leads.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "batch_id": {"type": "string", "description": "Optional batch identifier (e.g. 'BATCH-01'); defaults to active batch"},
                "batch_size": {"type": "integer", "description": "Number of leads to process in batch (default 5, max 30)"},
                "testing_mode": {"type": "boolean", "description": "Run in fast mock/testing mode without real Playwright recording (default False)"},
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
            },
        },
    },
    {
        "name": "run_batch_outreach",
        "description": "Execute batch outreach across WhatsApp, Instagram, or Email with dry_run safety verification.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "Channel: 'whatsapp', 'instagram', or 'email' (default 'whatsapp')"},
                "batch_id": {"type": "string", "description": "Optional batch ID; defaults to active outreach batch"},
                "dry_run": {"type": "boolean", "description": "True for dry-run simulation and preview, False for live sending (default True)"},
                "clinic_id": {"type": "integer", "description": "Optional single lead ID to target specifically"},
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
            },
        },
    },

    # -------------------------------------------------------------------------
    # 4. Read & History Tools
    # -------------------------------------------------------------------------
    {
        "name": "list_leads",
        "description": "List CRM leads with stage_id, locality, or text search filters ordered by intent and fit scores.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage_id": {"type": "integer", "description": "Optional stage_id filter"},
                "locality": {"type": "string", "description": "Optional locality filter"},
                "search": {"type": "string", "description": "Substring filter on clinic name, doctor, or locality"},
                "limit": {"type": "integer", "description": "Maximum leads to return (default 20)"},
                "hustle_id": {"type": "integer", "description": "Hustle ID (default 1)"},
            },
        },
    },
    {
        "name": "get_lead_dossier",
        "description": "Retrieve comprehensive lead details including verified facts, packages, commitments, and demo URLs.",
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
        "description": "Move a lead to a new Kanban stage with strict SSOT stage/status syncing and optional next action update.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "Database ID of the lead"},
                "stage_id": {"type": "integer", "description": "Target stage ID"},
                "next_action": {"type": "string", "description": "Optional updated next action note"},
            },
            "required": ["lead_id", "stage_id"],
        },
    },
    {
        "name": "get_lead_activity",
        "description": "Retrieve full activity timeline and audit log for a lead: past call logs, message history, tracking events, and terminal logs.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "Database ID of the lead"},
                "limit": {"type": "integer", "description": "Maximum records to return per activity stream (default 25)"},
            },
            "required": ["lead_id"],
        },
    },
]


def execute_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        # ---------------------------------------------------------------------
        # 1. Direct Lead Ingestion
        # ---------------------------------------------------------------------
        if name == "add_lead":
            hustle_id = int(args.get("hustle_id") or 1)
            clinic_name = (args.get("name") or "").strip()
            if not clinic_name:
                return {"error": "Lead 'name' is required."}

            doc_name = (args.get("doctor_name") or "Doctor In-Charge").strip()
            locality = (args.get("locality") or "Delhi NCR").strip()
            city = (args.get("city") or "Delhi").strip()
            address = (args.get("address") or f"{locality}, {city}").strip()
            primary_phone = (args.get("primary_phone") or "").strip() or None
            email = (args.get("email") or "").strip() or None
            ig_handle = (args.get("instagram_handle") or "").strip().lstrip("@") or None
            pref_channel = (args.get("preferred_channel") or "whatsapp").strip().lower()
            next_action = (args.get("next_action") or "Review lead and prepare pitch").strip()
            deal_val = int(args.get("deal_value_inr") or 25000)

            default_due = datetime.now(timezone.utc) + timedelta(days=2)
            payload = LeadCreate(
                hustle_id=hustle_id,
                name=clinic_name,
                doctor_name=doc_name,
                locality=locality,
                city=city,
                address=address,
                primary_phone=primary_phone,
                email=email,
                instagram_handle=ig_handle,
                preferred_channel=pref_channel,
                next_action=next_action,
                next_action_due_at=default_due,
                deal_value_inr=deal_val,
                automation_enabled=True,
            )

            lead = LeadService.create_lead(db, payload)
            db.commit()
            db.refresh(lead)

            return {
                "ok": True,
                "lead_id": lead.id,
                "name": lead.name,
                "slug": lead.slug,
                "doctor_name": lead.doctor_name,
                "locality": lead.locality,
                "primary_phone": lead.primary_phone,
                "status": lead.status,
                "stage_id": lead.stage_id,
                "demo_url": f"http://localhost:3001/demo/{lead.slug}",
            }

        if name == "bulk_add_leads":
            hustle_id = int(args.get("hustle_id") or 1)
            raw_leads = args.get("leads") or []
            if not isinstance(raw_leads, list) or len(raw_leads) == 0:
                return {"error": "'leads' must be a non-empty list of lead objects."}

            created_leads = []
            skipped_leads = []

            for idx, item in enumerate(raw_leads):
                clinic_name = (item.get("name") or "").strip()
                if not clinic_name:
                    skipped_leads.append({"index": idx, "reason": "Missing 'name'"})
                    continue

                doc_name = (item.get("doctor_name") or "Doctor In-Charge").strip()
                locality = (item.get("locality") or "Delhi NCR").strip()
                city = (item.get("city") or "Delhi").strip()
                address = (item.get("address") or f"{locality}, {city}").strip()
                phone = (item.get("primary_phone") or "").strip() or None
                email = (item.get("email") or "").strip() or None
                ig = (item.get("instagram_handle") or "").strip().lstrip("@") or None
                pref_ch = (item.get("preferred_channel") or "whatsapp").strip().lower()
                next_act = (item.get("next_action") or "Review lead and prepare pitch").strip()
                deal_val = int(item.get("deal_value_inr") or 25000)

                default_due = datetime.now(timezone.utc) + timedelta(days=2)
                payload = LeadCreate(
                    hustle_id=hustle_id,
                    name=clinic_name,
                    doctor_name=doc_name,
                    locality=locality,
                    city=city,
                    address=address,
                    primary_phone=phone,
                    email=email,
                    instagram_handle=ig,
                    preferred_channel=pref_ch,
                    next_action=next_act,
                    next_action_due_at=default_due,
                    deal_value_inr=deal_val,
                    automation_enabled=True,
                )

                try:
                    lead = LeadService.create_lead(db, payload)
                    db.commit()
                    db.refresh(lead)
                    created_leads.append({
                        "lead_id": lead.id,
                        "name": lead.name,
                        "slug": lead.slug,
                        "primary_phone": lead.primary_phone,
                    })
                except Exception as ex:
                    db.rollback()
                    skipped_leads.append({
                        "index": idx,
                        "name": clinic_name,
                        "reason": str(ex),
                    })

            return {
                "ok": True,
                "total_input": len(raw_leads),
                "created_count": len(created_leads),
                "skipped_count": len(skipped_leads),
                "created": created_leads,
                "skipped": skipped_leads,
            }

        # ---------------------------------------------------------------------
        # 2. Lead Communications
        # ---------------------------------------------------------------------
        if name == "send_message":
            lead_id = int(args["lead_id"])
            text = str(args["text"])
            channel = str(args.get("channel") or "whatsapp")
            confirmed = bool(args.get("confirmed", False))

            return AgentTools.draft_or_send_message(
                db=db,
                lead_id=lead_id,
                text=text,
                channel=channel,
                confirmed=confirmed,
            )

        if name == "log_call":
            lead_id = int(args["lead_id"])
            raw_text = str(args["raw_text"])
            duration_s = int(args.get("duration_seconds") or 120)
            outcome = str(args.get("outcome") or "connected")

            return AgentTools.log_call(
                db=db,
                lead_id=lead_id,
                raw_text=raw_text,
                duration_seconds=duration_s,
                outcome=outcome,
            )

        # ---------------------------------------------------------------------
        # 3. Batch Autopilot Execution
        # ---------------------------------------------------------------------
        if name == "run_discovery":
            hustle_id = int(args.get("hustle_id") or 1)
            hustle = db.query(Hustle).filter(Hustle.id == hustle_id).first()
            if not hustle:
                return {"error": f"Hustle #{hustle_id} not found"}

            limit = int(args.get("limit") or 2)
            locality = args.get("locality")
            stop_after = args.get("stop_after")

            try:
                _db_assert_no_active_run(db)
            except Exception as lock_exc:
                return {"error": str(lock_exc)}

            return PipelineService.trigger_refill(
                db=db,
                hustle_id=hustle.id,
                batch_size=limit,
                locality=locality,
                stop_after=stop_after,
                async_mode=False,
            )

        if name == "run_demo_factory":
            hustle_id = int(args.get("hustle_id") or 1)
            hustle = db.query(Hustle).filter(Hustle.id == hustle_id).first()
            if not hustle:
                return {"error": f"Hustle #{hustle_id} not found"}

            try:
                _db_assert_no_active_run(db)
            except Exception as lock_exc:
                return {"error": str(lock_exc)}

            batch_id = args.get("batch_id")
            batch_size = int(args.get("batch_size") or 5)
            testing_mode = bool(args.get("testing_mode", False))

            return DemoFactoryService.build_batch(
                db=db,
                hustle_id=hustle_id,
                batch_id=batch_id,
                batch_size=batch_size,
                testing_mode=testing_mode,
            )

        if name == "run_batch_outreach":
            hustle_id = int(args.get("hustle_id") or 1)
            hustle = db.query(Hustle).filter(Hustle.id == hustle_id).first()
            if not hustle:
                return {"error": f"Hustle #{hustle_id} not found"}

            channel = str(args.get("channel") or "whatsapp").lower().strip()
            dry_run = bool(args.get("dry_run", True))
            batch_id = args.get("batch_id")
            clinic_id = int(args["clinic_id"]) if args.get("clinic_id") else None

            return run_closer_agent(
                db=db,
                hustle=hustle,
                channel=channel,
                dry_run=dry_run,
                batch_id=batch_id,
                clinic_id=clinic_id,
            )

        # ---------------------------------------------------------------------
        # 4. Read & History Tools
        # ---------------------------------------------------------------------
        if name == "list_leads":
            hustle_id = int(args.get("hustle_id") or 1)
            q = db.query(Lead).filter(Lead.hustle_id == hustle_id)

            if args.get("stage_id"):
                q = q.filter(Lead.stage_id == int(args["stage_id"]))
            if args.get("locality"):
                q = q.filter(Lead.locality.ilike(f"%{args['locality'].strip()}%"))

            leads = q.order_by(Lead.intent_score.desc(), Lead.fit_score.desc()).all()

            search = (args.get("search") or "").strip().lower()
            if search:
                leads = [
                    l for l in leads
                    if search in (l.name or "").lower()
                    or search in (l.doctor_name or "").lower()
                    or search in (l.locality or "").lower()
                    or search in (l.primary_phone or "").lower()
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
                        "status": l.status,
                        "fit_score": l.fit_score,
                        "intent_score": l.intent_score,
                        "next_action": l.next_action,
                        "demo_url": f"http://localhost:3001/demo/{l.slug}",
                    }
                    for l in leads[:limit]
                ],
            }

        if name == "get_lead_dossier":
            lead_id = int(args["lead_id"])
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                return {"error": f"Lead #{lead_id} not found"}

            return {
                "id": lead.id,
                "name": lead.name,
                "slug": lead.slug,
                "doctor_name": lead.doctor_name,
                "locality": lead.locality,
                "address": lead.address,
                "primary_phone": lead.primary_phone,
                "email": lead.email,
                "instagram_handle": lead.instagram_handle,
                "preferred_channel": lead.preferred_channel,
                "stage_id": lead.stage_id,
                "status": lead.status,
                "fit_score": lead.fit_score,
                "intent_score": lead.intent_score,
                "next_action": lead.next_action,
                "deal_value_inr": lead.deal_value_inr,
                "demo_url": f"http://localhost:3001/demo/{lead.slug}",
                "facts": [
                    {"field": f.field, "value": f.value, "source": f.source}
                    for f in lead.facts
                ],
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
            lead_id = int(args["lead_id"])
            stage_id = int(args["stage_id"])

            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                return {"error": f"Lead #{lead_id} not found"}

            new_stage = db.query(Stage).filter(Stage.id == stage_id).first()
            if not new_stage:
                return {"error": f"Stage #{stage_id} not found"}

            old_stage_id = lead.stage_id
            old_status = lead.status

            # Atomic SSOT helper ensuring stage_id and status stay aligned
            sync_lead_stage_and_status(db, lead, new_stage)
            if args.get("next_action"):
                lead.next_action = str(args["next_action"]).strip()

            db.commit()
            db.refresh(lead)

            return {
                "ok": True,
                "lead_id": lead.id,
                "name": lead.name,
                "old_stage_id": old_stage_id,
                "old_status": old_status,
                "new_stage_id": lead.stage_id,
                "new_status": lead.status,
                "next_action": lead.next_action,
            }

        if name == "get_lead_activity":
            lead_id = int(args["lead_id"])
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                return {"error": f"Lead #{lead_id} not found"}

            rec_limit = int(args.get("limit") or 25)

            calls = (
                db.query(Call)
                .filter(Call.lead_id == lead_id)
                .order_by(Call.created_at.desc())
                .limit(rec_limit)
                .all()
            )
            messages = (
                db.query(Message)
                .filter(Message.lead_id == lead_id)
                .order_by(Message.created_at.desc())
                .limit(rec_limit)
                .all()
            )
            tracking = (
                db.query(TrackingEvent)
                .filter(TrackingEvent.lead_id == lead_id)
                .order_by(TrackingEvent.created_at.desc())
                .limit(rec_limit)
                .all()
            )
            terminal_logs = (
                db.query(TerminalLog)
                .filter(TerminalLog.lead_id == lead_id)
                .order_by(TerminalLog.created_at.desc())
                .limit(rec_limit)
                .all()
            )

            return {
                "lead_id": lead.id,
                "lead_name": lead.name,
                "counts": {
                    "calls": len(calls),
                    "messages": len(messages),
                    "tracking_events": len(tracking),
                    "terminal_logs": len(terminal_logs),
                },
                "calls": [
                    {
                        "id": c.id,
                        "raw_text": c.raw_text,
                        "summary": c.summary,
                        "outcome": c.outcome,
                        "duration_seconds": c.duration_seconds,
                        "prep_brief": c.prep_brief,
                        "created_at": c.created_at.isoformat() if c.created_at else None,
                    }
                    for c in calls
                ],
                "messages": [
                    {
                        "id": m.id,
                        "channel": m.channel,
                        "direction": m.direction,
                        "status": m.status,
                        "text": m.text,
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                    }
                    for m in messages
                ],
                "tracking_events": [
                    {
                        "id": t.id,
                        "event_type": t.event_type,
                        "payload": t.payload,
                        "created_at": t.created_at.isoformat() if t.created_at else None,
                    }
                    for t in tracking
                ],
                "terminal_logs": [
                    {
                        "id": tl.id,
                        "service": tl.service,
                        "level": tl.level,
                        "message": tl.message,
                        "metadata": tl.metadata_json,
                        "created_at": tl.created_at.isoformat() if tl.created_at else None,
                    }
                    for tl in terminal_logs
                ],
            }

        return {"error": f"Unknown tool: {name}"}
    finally:
        db.close()


def handle_request(req: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    method = req.get("method")
    req_id = req.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "firstmate-crm-mcp", "version": "2.0.0"},
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
                    "isError": False if not (isinstance(payload, dict) and "error" in payload) else True,
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
