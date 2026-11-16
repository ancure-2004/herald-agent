import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, UnprocessableEntityError
from app.models.entities import (
    AvailabilityDay,
    Hustle,
    Lead,
    Message,
    ProblemReport,
    RunLog,
    Stage,
)
from app.repositories.hustle_repo import HustleRepository
from app.schemas.hustle import ProblemReportCreate, TelegramCommandRequest
from app.services.event_bus import emit_terminal_log
from app.services.lead_service import sync_lead_stage_and_status
from app.utils.safety import compute_stock_plan

logger = logging.getLogger("personal_os.assistant")

ASSISTANT_UNDO_STACK: List[Dict[str, Any]] = []


class AssistantService:
    @staticmethod
    def handle_telegram_command(db: Session, payload: TelegramCommandRequest) -> Dict[str, Any]:
        cmd = payload.command_text.strip()
        today_str = datetime.now(timezone.utc).date().isoformat()
        hustle = db.query(Hustle).order_by(Hustle.id).first()

        if cmd.startswith("/off"):
            parts = cmd.replace("/off", "").strip()
            target_date = parts.split()[0] if parts and re.match(r"\d{4}-\d{2}-\d{2}", parts.split()[0]) else today_str
            row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == target_date).first()
            if not row:
                row = AvailabilityDay(
                    date_str=target_date,
                    mode="off",
                    note=f"Set via Telegram: {cmd}",
                    source="telegram",
                )
                db.add(row)
            else:
                row.mode = "off"
                row.note = f"Set via Telegram: {cmd}"
            db.commit()
            plan = compute_stock_plan(db, hustle) if hustle else {}
            return {
                "reply": f"Day mode set to OFF for {target_date}. Overdue follow-ups will be spread safely across your next normal days. Required stock buffer is now {plan.get('required_ready_packages', 0)} packages."
            }

        if cmd.startswith("/away"):
            row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == today_str).first()
            if not row:
                row = AvailabilityDay(
                    date_str=today_str,
                    mode="away",
                    note="Away mode via Telegram",
                    source="telegram",
                )
                db.add(row)
            else:
                row.mode = "away"
            db.commit()
            return {"reply": f"Day mode set to AWAY for {today_str} (laptop on, autopilot refilling buffer)."}

        if cmd.startswith("/normal"):
            row = db.query(AvailabilityDay).filter(AvailabilityDay.date_str == today_str).first()
            if row:
                row.mode = "normal"
                db.commit()
            return {"reply": f"Day mode restored to NORMAL for {today_str}."}

        if cmd.startswith("/stock") and hustle:
            plan = compute_stock_plan(db, hustle)
            return {
                "reply": f"Stock Report ({hustle.name}): {plan['current_ready_packages']} ready / {plan['required_ready_packages']} required ({plan['effective_buffer_days']} buffer days). Shortfall: {plan['shortfall']}."
            }

        if cmd.startswith("/log"):
            body = cmd.replace("/log", "", 1).strip()
            lead = db.query(Lead).filter(Lead.is_archived == False).order_by(Lead.updated_at.desc()).first()  # noqa: E712
            if not lead:
                return {"reply": "No active lead found to attach log."}
            db.add(
                Message(
                    lead_id=lead.id,
                    channel="telegram_log",
                    direction="internal_note",
                    text=body or "Quick log from Telegram",
                )
            )
            db.commit()
            return {"reply": f"Logged note onto '{lead.name}': {body}"}

        return {"reply": "Available commands: /off [YYYY-MM-DD], /away, /normal, /stock, /log <note>"}

    @staticmethod
    def create_problem_report(db: Session, payload: ProblemReportCreate) -> Dict[str, Any]:
        lead_snapshot = None
        if payload.lead_id:
            lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
            if lead:
                lead_snapshot = {
                    "id": lead.id,
                    "slug": lead.slug,
                    "stage_id": lead.stage_id,
                    "fit_score": lead.fit_score,
                    "intent_score": lead.intent_score,
                    "quoted_messages_data_only": [
                        {"direction": m.direction, "quoted_text": repr(m.text)} for m in lead.messages[-3:]
                    ],
                }

        latest_run = db.query(RunLog).order_by(RunLog.id.desc()).first()
        run_snapshot = None
        if latest_run:
            run_snapshot = {
                "id": latest_run.id,
                "job_type": latest_run.job_type,
                "count_found": latest_run.count_found,
                "count_passed": latest_run.count_passed,
                "count_dropped": latest_run.count_dropped,
                "errors": latest_run.errors,
            }

        brief = {
            "user_words": payload.user_description,
            "page": payload.page,
            "element": payload.element,
            "lead_context": lead_snapshot,
            "run_trace": run_snapshot,
            "safety_note": "Client message text is included strictly as quoted data, never as agent instructions.",
        }

        report = ProblemReport(
            page=payload.page,
            element=payload.element,
            user_description=payload.user_description,
            lead_id=payload.lead_id,
            run_id=payload.run_id or (latest_run.id if latest_run else None),
            context_brief=brief,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        emit_terminal_log("PROBLEM-REPORT", f"Captured issue on [{payload.page}]: {payload.user_description[:60]}")
        return {
            "report_id": report.id,
            "status": "captured",
            "debug_context_brief": json.dumps(brief),
        }

    @staticmethod
    def ask_or_do(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        mode = str(payload.get("mode") or "ask").lower().strip()
        prompt = str(payload.get("prompt") or "").strip()
        hustle_id = int(payload.get("hustle_id") or 1)
        confirmed = bool(payload.get("confirmed", False))
        if not prompt:
            raise UnprocessableEntityError("prompt is required.")

        from app.services.agent_tools import AgentTools
        from app.services.ai_service import AIService
        from app.services.rag_service import HybridRetriever

        # 1. Fetch AI Provider (raises AINotConfiguredError / AIProviderError if unavailable - zero fallbacks)
        provider = AIService.get_provider(db)

        # 2. Hybrid RAG retrieval for relevant CRM chunks
        citations = []
        retrieved_context = "No relevant context found in RAG index."
        try:
            retriever = HybridRetriever()
            rag_docs = retriever.retrieve(prompt, top_k=4)
            if rag_docs:
                context_blocks = []
                for idx, doc in enumerate(rag_docs, start=1):
                    doc_type = doc.get("doc_type", "doc")
                    lead_id = doc.get("lead_id")
                    content_snip = doc.get("content", "").strip()[:300]
                    context_blocks.append(f"[{idx}] ({doc_type.upper()} - Lead #{lead_id}): {content_snip}")
                    citations.append({
                        "id": doc.get("id"),
                        "doc_type": doc_type,
                        "lead_id": lead_id,
                        "snippet": content_snip[:120],
                        "rrf_score": round(float(doc.get("rrf_score", 0.0)), 4),
                    })
                retrieved_context = "\n\n".join(context_blocks)
        except Exception as e:
            emit_terminal_log("RAG-RETRIEVE", f"Retrieval warning: {e}", level="warn")

        # 3. Agentic Prompt defining v1 Tools - Turn 1
        agent_system = (
            "You are Firstmate Ask & Do Agent for PersonalOS & CRM.\n"
            "You have access to live CRM tools:\n"
            "1. search_leads(query: str, stage: str, locality: str)\n"
            "2. query_crm_stats()\n"
            "3. move_lead_stage(lead_id: int, target_stage: str)\n"
            "4. log_call(lead_id: int, raw_text: str, duration_seconds: int, outcome: str)\n"
            "5. draft_or_send_message(lead_id: int, text: str, channel: str)\n\n"
            f"Retrieved CRM Context:\n{retrieved_context}\n\n"
            f"User Prompt ({mode.upper()} mode): '{prompt}'\n\n"
            "Decide which tools to execute (if any).\n"
            "If tools are needed, list them in tool_calls. Do NOT output a placeholder message like 'I will retrieve...' if tools are needed.\n"
            "If no tools are needed, provide your complete final answer in answer.\n"
            "Return JSON matching this schema:\n"
            "{\n"
            "  'answer': 'Your clear, grounded answer to the user',\n"
            "  'tool_calls': [\n"
            "    { 'name': 'tool_name', 'arguments': { ... } }\n"
            "  ]\n"
            "}\n"
            "Tool calls can be empty [] if the retrieved context or query is fully answered."
        )

        schema = {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "tool_calls": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "arguments": {"type": "object"},
                        },
                        "required": ["name", "arguments"],
                    },
                },
            },
            "required": ["answer", "tool_calls"],
        }

        ai_res = provider.generate_json(agent_system, json_schema=schema)
        answer = ai_res.get("answer", "") if isinstance(ai_res, dict) else str(ai_res)
        raw_tools = ai_res.get("tool_calls", []) if isinstance(ai_res, dict) else []

        executed_actions = []
        pending_actions = []
        matched_leads = []

        # 4. Tool Execution Loop
        for tc in raw_tools:
            t_name = str(tc.get("name", "")).strip().lower()
            args = tc.get("arguments", {}) or {}

            try:
                if t_name == "search_leads":
                    q_leads = AgentTools.search_leads(
                        db,
                        query=args.get("query", ""),
                        stage=args.get("stage"),
                        locality=args.get("locality"),
                        hustle_id=hustle_id,
                    )
                    matched_leads.extend(q_leads)
                    executed_actions.append({
                        "tool": "search_leads",
                        "badge": f"Found {len(q_leads)} lead(s)",
                        "result": q_leads,
                    })

                elif t_name == "query_crm_stats":
                    stats = AgentTools.query_crm_stats(db, hustle_id=hustle_id)
                    executed_actions.append({
                        "tool": "query_crm_stats",
                        "badge": f"Total {stats.get('total_active_leads', 0)} leads",
                        "result": stats,
                    })

                elif t_name == "move_lead_stage":
                    lead_id = int(args.get("lead_id", 0))
                    tgt = str(args.get("target_stage", "")).strip()
                    res = AgentTools.move_lead_stage(db, lead_id=lead_id, target_stage=tgt)
                    executed_actions.append({
                        "tool": "move_lead_stage",
                        "badge": f"Moved to {res['new_stage']}",
                        "result": res,
                    })

                elif t_name == "log_call":
                    lead_id = int(args.get("lead_id", 0))
                    raw_t = str(args.get("raw_text", "")).strip()
                    dur = int(args.get("duration_seconds", 120))
                    outc = str(args.get("outcome", "connected"))
                    res = AgentTools.log_call(db, lead_id=lead_id, raw_text=raw_t, duration_seconds=dur, outcome=outc)
                    executed_actions.append({
                        "tool": "log_call",
                        "badge": "Call Logged",
                        "result": res,
                    })

                elif t_name == "draft_or_send_message":
                    lead_id = int(args.get("lead_id", 0))
                    msg_text = str(args.get("text", "")).strip()
                    chan = str(args.get("channel", "whatsapp")).strip()
                    res = AgentTools.draft_or_send_message(
                        db,
                        lead_id=lead_id,
                        text=msg_text,
                        channel=chan,
                        confirmed=confirmed,
                    )
                    if res.get("requires_confirmation"):
                        pending_actions.append(res)
                    else:
                        executed_actions.append({
                            "tool": "send_message",
                            "badge": f"Sent {chan.upper()}",
                            "result": res,
                        })
            except Exception as e:
                logger.warning(f"Error executing agent tool {t_name}: {e}")
                executed_actions.append({"tool": t_name, "error": str(e)})

        # 5. Turn 2 Synthesis Call when tools executed
        # Feeds the real tool execution outputs back to the LLM so 'reply' contains actual numbers and outcomes
        if executed_actions:
            tool_outputs_summary = []
            for act in executed_actions:
                t_n = act.get("tool")
                if "result" in act:
                    tool_outputs_summary.append(f"Tool '{t_n}' output:\n{json.dumps(act['result'], default=str)}")
                elif "error" in act:
                    tool_outputs_summary.append(f"Tool '{t_n}' error:\n{act['error']}")

            synthesis_prompt = (
                "You are Firstmate Ask & Do Agent for PersonalOS & CRM.\n"
                f"User original query ({mode.upper()} mode): '{prompt}'\n\n"
                f"Retrieved CRM Context:\n{retrieved_context}\n\n"
                "The following tools were executed with real CRM data:\n"
                + "\n\n".join(tool_outputs_summary) + "\n\n"
                "Using the exact tool outputs above, write a clear, helpful, and concise final response directly answering the user's query.\n"
                "State the actual numbers, counts, stages, or outcomes explicitly. Do NOT speak in future tense ('I will retrieve...').\n"
                "Return JSON matching:\n"
                "{\n"
                "  'answer': 'Your synthesized final answer with actual data'\n"
                "}"
            )
            synthesis_schema = {
                "type": "object",
                "properties": {
                    "answer": {"type": "string"},
                },
                "required": ["answer"],
            }
            try:
                syn_res = provider.generate_json(synthesis_prompt, json_schema=synthesis_schema)
                if isinstance(syn_res, dict) and syn_res.get("answer"):
                    answer = syn_res["answer"]
                elif isinstance(syn_res, str):
                    answer = syn_res
            except Exception as e:
                logger.warning(f"Failed to synthesize Turn 2 tool results with LLM: {e}")
                pass

        # Helper to extract plain text answer if LLM returned JSON string
        def _extract_plain_text(val: Any) -> str:
            if isinstance(val, dict):
                if "answer" in val:
                    return _extract_plain_text(val["answer"])
                return json.dumps(val)
            if isinstance(val, str):
                s = val.strip()
                if (s.startswith("{") and s.endswith("}")) or s.startswith("```"):
                    clean_s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
                    clean_s = re.sub(r"\s*```$", "", clean_s).strip()
                    try:
                        parsed = json.loads(clean_s)
                        if isinstance(parsed, dict) and "answer" in parsed:
                            return _extract_plain_text(parsed["answer"])
                    except Exception:
                        pass
                return s
            return str(val)

        answer = _extract_plain_text(answer)

        # Ensure tools producing state changes have a human-readable confirmation in reply if LLM answer was vague or empty
        if executed_actions and (not answer or answer.startswith("I will retrieve") or answer.startswith("I will ")):
            confirmations = []
            for act in executed_actions:
                t_name = act.get("tool")
                res_obj = act.get("result", {})
                if t_name == "move_lead_stage" and isinstance(res_obj, dict):
                    confirmations.append(f"Moved {res_obj.get('lead_name', 'lead')} to stage '{res_obj.get('new_stage', '')}'.")
                elif t_name == "log_call" and isinstance(res_obj, dict):
                    confirmations.append(f"Logged call for lead #{res_obj.get('lead_id')}: {res_obj.get('summary', 'Call logged successfully.')}")
                elif t_name == "send_message" and isinstance(res_obj, dict):
                    confirmations.append(res_obj.get("message") or f"Sent {res_obj.get('channel', 'message')}.")
            if confirmations:
                answer = " ".join(confirmations)

        # De-duplicate matched leads
        seen_lead_ids = set()
        deduped_leads = []
        for ml in matched_leads:
            if ml["id"] not in seen_lead_ids:
                seen_lead_ids.add(ml["id"])
                deduped_leads.append(ml)

        return {
            "mode": mode,
            "reply": answer,
            "citations": citations,
            "executed_actions": executed_actions,
            "pending_confirmation": pending_actions,
            "matched_leads": deduped_leads,
            "undo_available": False,
            "undo_id": None,
        }

    @staticmethod
    def undo_last_action(db: Session, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not ASSISTANT_UNDO_STACK:
            raise NotFoundError("No assistant actions to undo.")

        target_id = (payload or {}).get("undo_id")
        item = None
        if target_id:
            for idx, entry in enumerate(ASSISTANT_UNDO_STACK):
                if entry["undo_id"] == target_id:
                    item = ASSISTANT_UNDO_STACK.pop(idx)
                    break
        if not item:
            item = ASSISTANT_UNDO_STACK.pop()

        if item["type"] == "hustle_limits":
            h = HustleRepository.get_by_id(db, item["hustle_id"])
            if h:
                h.channel_limits = item["old_limits"]
                db.commit()
                return {"status": "undone", "message": "Reverted channel daily limits."}

        if item["type"] == "autonomy_mode":
            h = HustleRepository.get_by_id(db, item["hustle_id"])
            if h:
                h.autonomy_mode = item["old_mode"]
                db.commit()
                return {"status": "undone", "message": f"Reverted autonomy mode back to {item['old_mode'].upper()}."}

        if item["type"] == "lead_mutation":
            l = db.query(Lead).filter(Lead.id == item["lead_id"]).first()
            if l:
                l.stage_id = item["old_stage_id"]
                l.next_action = item["old_next_action"]
                l.next_action_due_at = item["old_due"]
                db.commit()
                return {"status": "undone", "message": f"Reverted changes on '{l.name}'."}

        return {"status": "undone", "message": "Action reverted."}
