from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .models import (
    AvailabilityDay,
    Hustle,
    Objection,
    SmartView,
    Stage,
)


def seed_initial_data(db: Session, include_demo_leads: bool = False) -> Hustle:
    """Seeds the Dental Clinics hustle, stages, smart views, and objection library.
    
    All fake/seed clinics have been removed so startup never re-seeds fake data.
    """
    existing = db.query(Hustle).filter(Hustle.slug == "dental-clinics").first()
    if existing:
        updated = False
        if existing.allowed_channels != ["whatsapp"]:
            existing.allowed_channels = ["whatsapp"]
            updated = True
        if updated:
            db.commit()
            db.refresh(existing)
        return existing

    now = datetime.now(timezone.utc)

    dental = Hustle(
        slug="dental-clinics",
        name="Dental Clinics (No Website)",
        description="Finds high-rated dental clinics in Delhi NCR with no website, builds 3 custom Next.js demos + walkthrough video, and dispatches via WhatsApp.",
        proof_asset_type="3_demo_sites_and_video",
        search_query="dental clinic in Delhi NCR",
        pipeline_steps=[
            "find",
            "confirm_no_website",
            "research",
            "channel_check",
            "build",
            "self_check",
            "record",
        ],
        allowed_channels=["whatsapp"],
        channel_limits={"whatsapp": 20},
        channel_goals={"whatsapp": 15},
        minimum_stock_days=3,
        template_set={
            "modern": "/modern/{slug}",
            "premium": "/premium/{slug}",
            "warm": "/warm/{slug}",
            "choice_page": "/demo/{slug}",
        },
        followup_sequence=[
            {"day_offset": 0, "step": "initial_pitch", "label": "3 Demo Links + Walkthrough Video"},
            {"day_offset": 3, "step": "followup_1", "label": "Design Preference Check-in"},
            {"day_offset": 7, "step": "followup_2", "label": "Link Expiry Reminder"},
        ],
        ai_field_questions=[
            {
                "key": "multi_doctor_or_implant_center",
                "question": "Is this a multi-doctor or specialist implant center?",
            },
            {
                "key": "has_active_instagram_reels",
                "question": "Does the clinic actively post patient transformations on Instagram?",
            },
            {
                "key": "primary_specialty",
                "question": "What is the lead doctor's primary MDS specialty (Endodontics, Orthodontics, Prosthodontics, General)?",
            },
        ],
        custom_field_defs=[
            {"key": "degrees", "label": "Doctor Degrees", "type": "text"},
            {"key": "consultation_fee", "label": "Consultation Fee", "type": "text"},
            {"key": "operating_hours", "label": "Operating Hours", "type": "text"},
        ],
        autonomy_mode="copilot",
        deal_value_inr=15000,
        is_active=True,
    )
    db.add(dental)
    db.flush()

    stage_defs = [
        ("discovered", "1. Discovered & Researching", 1, "slate", False, False),
        ("package_ready", "2. Review Tray (Ready)", 2, "indigo", False, False),
        ("queued", "3. Approved & Outbox", 3, "blue", False, False),
        ("contacted", "4. Pitch Sent", 4, "amber", False, False),
        ("viewed_demo", "5. Viewed Demo", 5, "purple", False, False),
        ("replied", "6. Replied / Warm", 6, "emerald", False, False),
        ("won", "7. Won (Client)", 7, "green", True, False),
        ("lost", "8. Lost / Closed", 8, "rose", False, True),
    ]
    for slug, name, order, color, is_won, is_lost in stage_defs:
        st = Stage(
            hustle_id=dental.id,
            slug=slug,
            name=name,
            order=order,
            color=color,
            is_won=is_won,
            is_lost=is_lost,
        )
        db.add(st)

    smart_views = [
        ("all_active", "All Active Pipeline", "LayoutGrid", {"archived": False}, 1),
        ("review_tray", "Review Tray (Approve & Send)", "CheckCircle2", {"stage_slug": "package_ready"}, 2),
        ("due_today", "Due Today & Overdue", "Clock", {"due": "today_or_overdue"}, 3),
        ("hot_intent", "Hot Demo Viewers", "Flame", {"min_intent": 40}, 4),
        ("replied_warm", "Active Replies", "MessageSquare", {"stage_slug": "replied"}, 5),
        ("no_reply_5d", "Follow-up Queue (Stale)", "RefreshCw", {"stage_slug": "contacted"}, 6),
        ("archived", "Archived & DNC", "Archive", {"archived": True}, 7),
    ]
    for slug, name, icon, spec, order in smart_views:
        db.add(
            SmartView(
                hustle_id=dental.id,
                slug=slug,
                name=name,
                icon=icon,
                filter_spec=spec,
                sort_order=order,
            )
        )

    objections = [
        (
            "High Price / Budget Concern",
            ["too expensive", "budget issue", "price is high", "can do cheaper"],
            [
                {
                    "text": "Completely understand, Dr. {doctor_name}! Unlike agencies that charge Rs. 40k upfront plus monthly retainers, our Rs. 15,000 setup is a one-time fee with zero recurring maintenance charges. It pays for itself with just 2-3 new RCT or implant patients.",
                    "lang": "en",
                    "wins": 7,
                }
            ],
            14,
            8,
        ),
        (
            "Already Have Instagram / Practo",
            ["already have instagram", "practo", "justdial", "don't need website"],
            [
                {
                    "text": "Completely agree Instagram and Practo are great for discovery, Dr. {doctor_name}! The gap is that on Practo, patients see 5 competing clinics right next to your profile, whereas your own website on Google Maps sends 100% of high-intent implant/RCT patients straight to your WhatsApp. Since your preview is already built, tap the link once when free between OPDs!",
                    "lang": "en",
                    "wins": 5,
                }
            ],
            11,
            5,
        ),
        (
            "Busy in OPD / Call Next Week",
            ["busy", "in opd", "next week", "monday", "after diwali", "call later"],
            [
                {
                    "text": "No rush at all, Dr. {doctor_name}! Have a smooth OPD. I have extended your clinic's demo link so it stays live for you till {followup_day}. Will drop a quick reminder then.",
                    "lang": "en",
                    "wins": 8,
                }
            ],
            19,
            12,
        ),
    ]
    for label, triggers, replies, enc, prog in objections:
        db.add(
            Objection(
                hustle_id=dental.id,
                label=label,
                trigger_phrases=triggers,
                best_replies=replies,
                times_encountered=enc,
                times_progressed=prog,
            )
        )

    # Seed upcoming 7 days availability
    for offset in range(7):
        d_str = (now.date() + timedelta(days=offset)).isoformat()
        db.add(AvailabilityDay(date_str=d_str, mode="normal", note="Standard 9 AM - Midnight window"))

    db.commit()
    db.refresh(dental)
    return dental
