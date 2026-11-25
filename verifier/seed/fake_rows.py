"""Row builders: one invented clinic and its child rows, all drawn from one seeded random.Random.

Every timestamp is passed in explicitly, so no herald column default (utcnow) changes the data.
"""

from datetime import timedelta

from app.models import (
    Call,
    Commitment,
    Lead,
    LeadFact,
    Message,
    OutboxItem,
    Package,
    TrackingEvent,
)

import fake_values as fv


def make_lead(rng, n, hustle_id, stage, created):
    """Lead number n (1-based); status is set afterwards from the stage by the caller."""
    locality = rng.choice(fv.LOCALITIES)
    phone = f"+91 90000 {n:05d}"
    late = stage.order >= 6
    lead = Lead(
        hustle_id=hustle_id,
        stage_id=stage.id,
        slug=f"verifier-clinic-{n:04d}",
        name=f"Verifier Clinic {n:04d}",
        doctor_name=f"Dr. Verifier {n:04d}",
        locality=locality,
        city="Delhi NCR",
        address=f"Unit {n}, {locality}, Delhi NCR",
        primary_phone=phone,
        phones=[phone],
        email=f"clinic{n:04d}@example.test",
        instagram_handle=f"verifier_clinic_{n:04d}",
        preferred_channel="whatsapp",
        fit_score=rng.randint(40, 100),
        fit_reasons=rng.sample(fv.FIT_REASONS, 2),
        intent_score=rng.randint(40, 100) if late else rng.randint(0, 40),
        intent_reasons=rng.sample(fv.INTENT_REASONS, rng.randint(0, 2)),
        next_action=rng.choice(fv.NEXT_ACTIONS),
        next_action_due_at=created + timedelta(days=rng.randint(0, 7)),
        do_not_contact=rng.random() < 0.02,
        do_not_contact_reason="",
        is_archived=False,
        archive_reason="",
        custom_fields={"consultation_fee": f"Rs. {rng.choice([300, 500, 800])}", "operating_hours": "10:00-20:00"},
        ai_fields={"primary_specialty": rng.choice(["Endodontics", "Orthodontics", "Prosthodontics", "General"])},
        what_changed_summary="Fake update: the clinic details were re-checked.",
        deal_value_inr=15000,
        automation_enabled=True,
        needs_followup=rng.random() < 0.3,
        next_followup_at=created + timedelta(days=rng.randint(1, 7)),
        is_test=False,
        created_at=created,
        updated_at=created + timedelta(hours=rng.randint(1, 200)),
    )
    if lead.do_not_contact:
        lead.do_not_contact_reason = "Fake opt-out"
    return lead


def _fact_value(rng, field, lead):
    if field == "google_rating":
        return f"{rng.uniform(3.8, 4.9):.1f}"
    if field == "review_count":
        return str(rng.randint(10, 400))
    if field == "doctor_name":
        return lead.doctor_name
    if field == "operating_hours":
        return "10:00-20:00"
    if field == "website_check":
        return "no website found"
    return "answers on WhatsApp"


def make_facts(rng, lead, created):
    """Two to five facts per lead, each field at most once."""
    fields = rng.sample(fv.FACT_FIELDS, rng.randint(2, 5))
    facts = []
    for field in fields:
        facts.append(
            LeadFact(
                lead_id=lead.id,
                field=field,
                value=_fact_value(rng, field, lead),
                source=rng.choice(fv.FACT_SOURCES),
                confidence=round(rng.uniform(0.6, 1.0), 2),
                verified_by_two_sources=rng.random() < 0.5,
                checked_at=created + timedelta(hours=rng.randint(1, 72)),
            )
        )
    return facts


def make_package(rng, lead, stage, created):
    """A proof package for leads past the first stage; None for the rest."""
    if stage.order < 2:
        return None
    status = rng.choice(fv.PACKAGE_STATUSES)
    slug = lead.slug
    sent = created + timedelta(days=2)
    return Package(
        lead_id=lead.id,
        version=1,
        asset_links={
            "modern": f"https://example.test/modern/{slug}",
            "premium": f"https://example.test/premium/{slug}",
            "warm": f"https://example.test/warm/{slug}",
            "video": f"https://example.test/video/{slug}",
        },
        video_size_mb=round(rng.uniform(8.0, 40.0), 1),
        clinic_payload={"name": lead.name, "locality": lead.locality},
        quality_score=rng.randint(80, 100),
        self_check_passed=True,
        self_check_report={},
        status=status,
        sent_at=sent if status == "sent" else None,
        expires_at=created + timedelta(days=14),
        last_verified_at=created + timedelta(days=1),
        created_at=created,
    )


def make_messages(rng, lead, created):
    """Zero to twelve messages, in time order."""
    messages = []
    at = created
    for _ in range(rng.randint(0, 12)):
        at = at + timedelta(hours=rng.randint(1, 72))
        if rng.random() < 0.4:
            channel, direction, text, status = "whatsapp", "inbound", rng.choice(fv.IN_TEXTS), "delivered"
        else:
            channel = "phone_call" if rng.random() < 0.1 else "whatsapp"
            direction = "outbound"
            text = rng.choice(fv.OUT_TEXTS)
            status = rng.choice(["sent", "delivered"])
        messages.append(
            Message(
                lead_id=lead.id,
                channel=channel,
                direction=direction,
                text=text,
                template_used=rng.choice(["", "initial_pitch", "followup_1"]),
                delivery_status=status,
                metadata_json={},
                created_at=at,
            )
        )
    return messages


def make_calls(rng, lead, created):
    """Zero to three call logs."""
    calls = []
    at = created
    for _ in range(rng.randint(0, 3)):
        at = at + timedelta(days=rng.randint(1, 5))
        calls.append(
            Call(
                lead_id=lead.id,
                raw_text=rng.choice(fv.CALL_RAW),
                summary=rng.choice(fv.CALL_SUMMARIES),
                interests=rng.sample(fv.INTERESTS, 2),
                objections=rng.sample(fv.OBJECTIONS, 1),
                commitments=[],
                next_steps=[rng.choice(fv.NEXT_ACTIONS)],
                prep_brief="- Fake prep point for the next call.",
                duration_seconds=rng.randint(60, 900),
                outcome=rng.choice(fv.CALL_OUTCOMES),
                created_at=at,
            )
        )
    return calls


def make_commitments(rng, lead, created):
    """Zero to two commitments."""
    commitments = []
    for _ in range(rng.randint(0, 2)):
        commitments.append(
            Commitment(
                lead_id=lead.id,
                who_owes_it=rng.choice(["us", "them"]),
                what=rng.choice(fv.COMMIT_WHAT),
                raw_phrase="by Thursday",
                due_at=created + timedelta(days=rng.randint(1, 10)),
                status=rng.choice(fv.COMMIT_STATUSES),
                created_at=created,
            )
        )
    return commitments


def make_outbox(rng, lead, hustle_id, created):
    """Zero to two outbox items; unique keys come from the lead slug and a counter."""
    items = []
    for k in range(rng.randint(0, 2)):
        status = rng.choice(fv.OUTBOX_STATUSES)
        when = created + timedelta(hours=rng.randint(1, 96))
        items.append(
            OutboxItem(
                lead_id=lead.id,
                hustle_id=hustle_id,
                channel="whatsapp",
                text=rng.choice(fv.OUT_TEXTS),
                unique_key=f"verifier-{lead.slug}-{k}",
                status=status,
                error_message="fake send error" if status == "failed" else "",
                scheduled_for=when,
                sent_at=when if status == "sent" else None,
                created_at=created,
            )
        )
    return items


def make_events(rng, lead, created, package):
    """Zero to three tracking events; linked to the lead's package when it has one."""
    events = []
    at = created
    for _ in range(rng.randint(0, 3)):
        at = at + timedelta(hours=rng.randint(1, 48))
        kind = rng.choice(fv.EVENT_TYPES)
        design = rng.choice(fv.DESIGNS) if kind == "design_choice" else ""
        events.append(
            TrackingEvent(
                lead_id=lead.id,
                package_id=package.id if package is not None else None,
                event_type=kind,
                section=rng.choice(fv.SECTIONS),
                design_chosen=design,
                duration_seconds=rng.randint(5, 300),
                user_agent="verifier-fake-browser",
                is_bot=False,
                created_at=at,
            )
        )
    return events
