from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .models import (
    Hustle,
    Stage,
    SmartView,
    Objection,
    Lead,
    LeadFact,
    Package,
    Message,
    TrackingEvent,
    RunLog,
    AvailabilityDay,
)
from .safety import compute_fit_score, compute_intent_score


def seed_initial_data(db: Session, include_demo_leads: bool = True) -> Hustle:
    """Seeds the Dental Clinics hustle, stages, smart views, objection library, and optional sample clinics."""
    existing = db.query(Hustle).filter(Hustle.slug == "dental-clinics").first()
    if existing:
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
        allowed_channels=["whatsapp", "instagram", "email"],
        channel_limits={"whatsapp": 20, "instagram": 15, "email": 25},
        channel_goals={"whatsapp": 15, "instagram": 5, "email": 5},
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
            {"key": "multi_doctor_or_implant_center", "question": "Is this a multi-doctor or specialist implant center?"},
            {"key": "has_active_instagram_reels", "question": "Does the clinic actively post patient transformations on Instagram?"},
            {"key": "primary_specialty", "question": "What is the lead doctor's primary MDS specialty (Endodontics, Orthodontics, Prosthodontics, General)?"},
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
    stage_map = {}
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
        db.flush()
        stage_map[slug] = st

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
                is_pinned=True,
            )
        )

    objections = [
        (
            "Price / Budget Question",
            ["how much", "kitna", "price", "cost", "charges", "expensive"],
            [
                {
                    "text": "Dr. {doctor_name}, since the 3 layouts for {clinic_name} are already built, the complete launch (custom domain + WhatsApp booking integration + Google Maps sync) is a one-time Rs. 12,500 with zero monthly retainer. Would you like me to connect your clinic's domain to the {preferred_design} version first so you can test it live?",
                    "lang": "en",
                    "wins": 6,
                },
                {
                    "text": "Doctor sahab, kyunki aapke clinic ke 3 live designs already ready hain, pura setup (custom .com/.in domain + direct WhatsApp appointment button) one-time Rs. 12,500 mein ho jayega without any monthly fee. Aap bataiye Modern, Premium ya Warm mein se kaunsa final karein?",
                    "lang": "hinglish",
                    "wins": 4,
                },
            ],
            14,
            9,
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

    # Seed one sample Autopilot Run trace
    db.add(
        RunLog(
            hustle_id=dental.id,
            job_type="daily_autopilot_batch",
            status="succeeded",
            count_found=12,
            count_passed=4,
            count_dropped=8,
            drop_reasons={"has_active_website": 5, "hospital_multispecialty": 2, "unverified_phone": 1},
            errors=[],
            trace_logs=[
                "[09:05:12] Step 1 Find: Queried Serper Maps for 'dental clinic Rohini & Gurugram' -> 12 candidates",
                "[09:05:40] Step 2 Confirm No Website: Dropped 5 clinics with active official domains",
                "[09:06:15] Step 3 Research: Verified doctor degrees across Practo + Justdial for 4 clinics",
                "[09:07:02] Step 5 Build: Generated Modern, Premium, and Warm JSON packages",
                "[09:07:18] Step 6 Self-Check: 4/4 passed Zod schema, phone/map check, and zero banned claims",
            ],
            started_at=now - timedelta(hours=3),
            finished_at=now - timedelta(hours=2, minutes=55),
        )
    )

    if include_demo_leads:
        sample_leads = [
            {
                "slug": "krystal-dental-care-malviya-nagar",
                "name": "Krystal Dental Care & Implant Centre",
                "doctor_name": "Dr. Ankit Malhotra",
                "locality": "Malviya Nagar",
                "city": "South Delhi",
                "address": "C-42, Main Market Rd, Malviya Nagar, New Delhi 110017",
                "primary_phone": "+919811223344",
                "instagram_handle": "krystaldentaldelhi",
                "stage_slug": "package_ready",
                "next_action": "Review 3 demo designs & approve initial WhatsApp pitch",
                "due_offset_hours": 2,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Implantology & Endodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Endodontics)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:30 PM",
                },
                "what_changed": "Autopilot built 3 demo designs (Modern, Premium, Warm) + 45s walkthrough video. Passed all 6 self-check gates.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "184 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Ankit Malhotra (MDS Endodontics)", "Practo + Google Maps", True),
                    ("website_check", "No official domain found (Instagram link only)", "Serper + Brave", True),
                ],
                "events": [],
                "messages": [
                    (
                        "note",
                        "internal_note",
                        "Autopilot verified no website. 184 reviews (4.9★) in Malviya Nagar. Ready in Review Tray.",
                        "",
                    )
                ],
            },
            {
                "slug": "smile-on-dental-clinic-sector-51-gurugram",
                "name": "Smile On Dental & Orthodontic Studio",
                "doctor_name": "Dr. Sheenam Aggarwal",
                "locality": "Sector 51",
                "city": "Gurugram",
                "address": "Shop 14, Mayfield Garden, Sector 51, Gurugram 122018",
                "primary_phone": "+919873445566",
                "instagram_handle": "smileondentalgurgaon",
                "stage_slug": "package_ready",
                "next_action": "Approve WhatsApp pitch in Review Tray",
                "due_offset_hours": 3,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Orthodontics & Aligners",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Orthodontics)",
                    "consultation_fee": "Rs. 600",
                    "operating_hours": "Tue-Sun 10:30 AM - 08:00 PM",
                },
                "what_changed": "Package passed self-check gate (100/100 quality score). Ready for your approval.",
                "facts": [
                    ("google_rating", "5.0★", "Google Maps", True),
                    ("review_count", "96 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Sheenam Aggarwal", "Practo + Justdial", True),
                ],
                "events": [],
                "messages": [],
            },
            {
                "slug": "prime-dental-care-tilak-nagar",
                "name": "Prime Dental Care & Implant Studio",
                "doctor_name": "Dr. Alpa Gupta",
                "locality": "Tilak Nagar",
                "city": "West Delhi",
                "address": "12/4, Mall Road, Tilak Nagar, New Delhi 110018",
                "primary_phone": "+919910112233",
                "instagram_handle": "primedentalcare_westdelhi",
                "stage_slug": "viewed_demo",
                "next_action": "Send quick follow-up referencing the Premium design she selected",
                "due_offset_hours": -1,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "Dual MDS (Endodontics & Pedodontics)",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Endodontics)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 09:30 AM - 08:30 PM",
                },
                "what_changed": "Hot Lead Alert: Opened demo link 3 times today, spent 82s on Treatment Catalog, and tapped 'Choose Premium Design'.",
                "facts": [
                    ("google_rating", "5.0★", "Google Maps", True),
                    ("review_count", "304 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Alpa Gupta & Dr. Amit Gupta", "Google Maps + IDA Directory", True),
                ],
                "events": [
                    ("page_view", "hero", "", 28),
                    ("section_view", "services_catalog", "", 54),
                    ("design_choice", "switcher", "premium", 12),
                ],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Hi Dr. Alpa, noticed Prime Dental Care has 304+ 5.0★ reviews in Tilak Nagar but no official website on Google Maps. Built 3 live previews tailored for your practice - take a look!",
                        "initial_pitch",
                    )
                ],
            },
            {
                "slug": "dentique-dental-implant-centre-sector-76-noida",
                "name": "Dentique Dental & Implant Centre",
                "doctor_name": "Dr. Rajeev Verma",
                "locality": "Sector 76",
                "city": "Noida",
                "address": "Tower B, Skytech Matrott Market, Sector 76, Noida 201301",
                "primary_phone": "+919818776655",
                "instagram_handle": "dentiquenoida76",
                "stage_slug": "replied",
                "next_action": "Reply to Dr. Rajeev's pricing question & schedule 10-min call after Monday OPD",
                "due_offset_hours": -3,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Oral & Maxillofacial Prosthodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Prosthodontics)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sun 10:00 AM - 09:00 PM",
                },
                "what_changed": "Dr. Rajeev replied on WhatsApp asking about the one-time setup cost and suggested talking next Monday.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "142 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Rajeev Verma", "Practo + Google Maps", True),
                ],
                "events": [
                    ("page_view", "hero", "", 35),
                    ("design_choice", "switcher", "modern", 20),
                    ("whatsapp_tap", "cta_footer", "modern", 5),
                ],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Hi Dr. Rajeev, built 3 live website previews for Dentique Dental & Implant Centre (Sector 76 Noida) along with a 45s walkthrough video.",
                        "initial_pitch",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Hi Ankur, the Modern black/teal layout looks really clean! How much do you charge for putting this live on our domain? Let's connect next Monday after my evening OPD.",
                        "price_question",
                    ),
                ],
            },
        ]

        for item in sample_leads:
            lead = Lead(
                hustle_id=dental.id,
                stage_id=stage_map[item["stage_slug"]].id,
                slug=item["slug"],
                name=item["name"],
                doctor_name=item["doctor_name"],
                locality=item["locality"],
                city=item["city"],
                address=item["address"],
                primary_phone=item["primary_phone"],
                phones=[item["primary_phone"]],
                instagram_handle=item["instagram_handle"],
                preferred_channel="whatsapp",
                next_action=item["next_action"],
                next_action_due_at=now + timedelta(hours=item["due_offset_hours"]),
                custom_fields=item["custom_fields"],
                ai_fields=item["ai_fields"],
                what_changed_summary=item["what_changed"],
                deal_value_inr=15000,
            )
            db.add(lead)
            db.flush()

            fact_objs = []
            for f_field, f_val, f_src, f_ver in item["facts"]:
                fo = LeadFact(
                    lead_id=lead.id,
                    field=f_field,
                    value=f_val,
                    source=f_src,
                    confidence=0.98 if f_ver else 0.8,
                    verified_by_two_sources=f_ver,
                )
                db.add(fo)
                fact_objs.append(fo)

            pkg_status = "sent" if item["stage_slug"] in ("viewed_demo", "replied") else "ready_for_review"
            sent_ts = (now - timedelta(days=1)) if pkg_status == "sent" else None
            exp_ts = (sent_ts + timedelta(days=7)) if sent_ts else None

            pkg = Package(
                lead_id=lead.id,
                version=1,
                asset_links={
                    "choice_page": f"http://localhost:3001/demo/{lead.slug}",
                    "modern": f"http://localhost:3001/modern/{lead.slug}",
                    "premium": f"http://localhost:3001/premium/{lead.slug}",
                    "warm": f"http://localhost:3001/warm/{lead.slug}",
                },
                video_file_path=f"recordings/{lead.slug}.mp4",
                video_size_mb=6.4,
                clinic_payload={
                    "slug": lead.slug,
                    "clinicName": lead.name,
                    "shortName": lead.name.split("&")[0].strip(),
                    "doctor": {
                        "name": lead.doctor_name,
                        "qualifications": item["custom_fields"].get("degrees", "BDS"),
                        "consultationFee": item["custom_fields"].get("consultation_fee", "Standard OPD"),
                    },
                    "locality": lead.locality,
                    "city": lead.city,
                    "phone": lead.primary_phone,
                    "hours": {"verified": True, "schedule": item["custom_fields"].get("operating_hours", "Mon-Sat 10 AM - 8 PM")},
                },
                quality_score=98,
                self_check_passed=True,
                self_check_report={
                    "no_placeholders": True,
                    "no_broken_images": True,
                    "phone_and_map_present": True,
                    "mobile_layout_ok": True,
                    "no_banned_medical_claims": True,
                },
                status=pkg_status,
                sent_at=sent_ts,
                expires_at=exp_ts,
            )
            db.add(pkg)
            db.flush()

            ev_objs = []
            for ev_type, sec, des, dur in item["events"]:
                ev = TrackingEvent(
                    lead_id=lead.id,
                    package_id=pkg.id,
                    event_type=ev_type,
                    section=sec,
                    design_chosen=des,
                    duration_seconds=dur,
                    is_bot=False,
                )
                db.add(ev)
                ev_objs.append(ev)

            msg_objs = []
            for ch, direction, txt, label in item["messages"]:
                m = Message(
                    lead_id=lead.id,
                    channel=ch,
                    direction=direction,
                    text=txt,
                    ai_label=label,
                )
                db.add(m)
                msg_objs.append(m)

            fit, fit_r = compute_fit_score(
                fact_objs,
                bool(lead.doctor_name),
                bool(lead.primary_phone),
                bool(lead.instagram_handle),
                lead.ai_fields,
            )
            intent, intent_r = compute_intent_score(ev_objs, msg_objs)
            lead.fit_score = fit
            lead.fit_reasons = fit_r
            lead.intent_score = intent
            lead.intent_reasons = intent_r

    db.commit()
    db.refresh(dental)
    return dental
