from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import (
    AvailabilityDay,
    Call,
    Hustle,
    Lead,
    LeadFact,
    Message,
    Objection,
    OutboxItem,
    Package,
    RunLog,
    SmartView,
    Stage,
    TerminalLog,
    TrackingEvent,
)
from app.safety import compute_fit_score, compute_intent_score


def _backfill_calls_and_logs(db: Session, hustle: Hustle) -> bool:
    now = datetime.now(timezone.utc)
    changed = False

    if db.query(Call).count() == 0:
        sample_calls = {
            "dentique-dental-implant-centre-sector-76-noida": [
                {
                    "raw_text": "Spoke with Dr. Sneha Rao at 4:30 PM for 6 minutes. She loved the Modern template layout, especially the clean patient review section and direct WhatsApp button. Her main objection is that she already pays Practo for leads and wanted to know how this compares. I explained that Practo displays competitor clinics right next to hers, while her own website sends 100% of high-intent Google Maps visitors straight to her phone. She agreed to review the proposal and asked me to follow up on Friday with pricing options. She mentioned a budget of around Rs. 15,000-18,000.",
                    "summary": "Dr. Sneha appreciated the Modern layout and direct WhatsApp booking. Compared value against existing Practo spend and requested a formal pricing comparison before Friday follow-up.",
                    "interests": ["Modern clinic layout", "Direct WhatsApp booking button", "Google Maps review widget integration"],
                    "objections": ["Existing Practo subscription spend", "Needs confirmation on domain ownership"],
                    "commitments": [
                        {"who_owes_it": "us", "what": "Send Practo vs Website comparison sheet and proposal", "due_phrase": "by Thursday evening"},
                        {"who_owes_it": "them", "what": "Review pricing proposal with clinic partner", "due_phrase": "before Friday 11 AM"},
                    ],
                    "next_steps": ["Send WhatsApp proposal summary with domain inclusions", "Call on Friday at 11:30 AM to finalize"],
                    "prep_brief": "- Emphasize that Google Maps traffic converts at 4x higher intent than Practo directory browse.\n- Confirm free assistance with Google Business Profile verification.\n- Close on Rs. 15,000 package with complimentary .in domain.",
                    "duration_seconds": 360,
                    "outcome": "interested",
                }
            ],
            "dr-gargs-advanced-dentistry-rohini-sec9": [
                {
                    "raw_text": "Called Dr. Vivek Garg at 11:00 AM. Conversation lasted 7 minutes. Dr. Garg is expanding his Rohini clinic with a second dental chair and wants new implant patients. He was impressed by the Warm design template. He expressed concern about ongoing maintenance and who updates doctor timings if OPD hours change. I explained that timing updates are handled free via WhatsApp request within 2 hours. He committed to signing off if we include free hosting for the first year. We agreed on Rs. 16,000 total.",
                    "summary": "Dr. Garg is expanding clinic capacity and looking to acquire implant patients. Liked the Warm template. Reassured regarding ongoing maintenance and timing updates. Agreed on Rs. 16,000 with 1-year hosting included.",
                    "interests": ["Warm template design", "Implant patient acquisition", "Google Maps local SEO optimization"],
                    "objections": ["Maintenance hassle for changing OPD timings", "Hosting renewal transparency"],
                    "commitments": [
                        {"who_owes_it": "us", "what": "Send written confirmation of 1-year free hosting & 2-hr maintenance turnaround", "due_phrase": "today by 3 PM"},
                        {"who_owes_it": "them", "what": "Share clinic high-resolution photos and staff credentials", "due_phrase": "by tomorrow"},
                    ],
                    "next_steps": ["Send invoice and bank details for 50% advance token (Rs. 8,000)", "Collect clinic photo assets"],
                    "prep_brief": "- Acknowledge the clinic's new second operatory expansion.\n- Reiterate 2-hour SLA for OPD schedule updates.\n- Request clinic registration certificate for domain mapping.",
                    "duration_seconds": 420,
                    "outcome": "scheduled_call",
                }
            ],
            "dental-aesthetics-india-defence-colony": [
                {
                    "raw_text": "Closing call with Dr. Vandana Sehgal. 10 minutes. Finalized deployment to custom domain dentalaestheticsdelhi.com. Dr. Sehgal paid Rs. 20,000 via UPI. Verified all links, WhatsApp routing to clinic front desk (+919811009988), and Google Analytics tracking. Client expressed high satisfaction with the Premium luxury aesthetic.",
                    "summary": "Client closed and onboarded. Custom domain launched and full payment of Rs. 20,000 received. Clinic staff trained on WhatsApp lead notifications.",
                    "interests": ["Luxury aesthetics", "Ultra-fast mobile load time", "Custom domain configuration"],
                    "objections": ["None remaining - fully resolved"],
                    "commitments": [
                        {"who_owes_it": "us", "what": "Monthly analytics traffic summary on 1st of each month", "due_phrase": "monthly"},
                        {"who_owes_it": "them", "what": "Provide video testimonial after 30 days of live usage", "due_phrase": "in 30 days"},
                    ],
                    "next_steps": ["Send welcome onboarding kit and QR code standee design for clinic reception"],
                    "prep_brief": "- Check 30-day traffic numbers in Google Analytics.\n- Inquire about patient feedback on mobile booking.\n- Request Google review / video testimonial.",
                    "duration_seconds": 600,
                    "outcome": "completed",
                }
            ],
            "city-dental-clinic-karol-bagh": [
                {
                    "raw_text": "Brief courtesy call to Dr. Rajesh Batra after initial inquiry. 2 minutes. Dr. Batra confirmed he is transitioning ownership of the Karol Bagh clinic to a junior associate and retiring from active practice at the end of the quarter. Not interested in investing in digital marketing or website assets at this time. Requested no further communications.",
                    "summary": "Dr. Batra confirmed retirement and clinic ownership transition. Zero interest in digital marketing investments. Flagged as DNC.",
                    "interests": ["None"],
                    "objections": ["Doctor retiring from active clinical practice"],
                    "commitments": [
                        {"who_owes_it": "us", "what": "Respect DNC and remove from all automated sequences", "due_phrase": "immediate"}
                    ],
                    "next_steps": ["Archive lead record and mark DNC permanently"],
                    "prep_brief": "- Do not contact. Lead is archived due to doctor retirement.",
                    "duration_seconds": 120,
                    "outcome": "not_interested",
                }
            ],
        }
        for slug, c_list in sample_calls.items():
            lead = db.query(Lead).filter(Lead.slug == slug).first()
            if lead:
                for c_item in c_list:
                    call_obj = Call(
                        lead_id=lead.id,
                        raw_text=c_item["raw_text"],
                        summary=c_item.get("summary", ""),
                        interests=c_item.get("interests", []),
                        objections=c_item.get("objections", []),
                        commitments=c_item.get("commitments", []),
                        next_steps=c_item.get("next_steps", []),
                        prep_brief=c_item.get("prep_brief", ""),
                        duration_seconds=c_item.get("duration_seconds", 0),
                        outcome=c_item.get("outcome", "completed"),
                        created_at=now - timedelta(hours=6),
                    )
                    db.add(call_obj)
                changed = True

    if db.query(TerminalLog).count() == 0:
        logs_seed_data = [
            ("discovery", "info", "Starting Google Places search for 'dental clinic Rajouri Garden West Delhi'", {"query": "dental clinic Rajouri Garden", "target_count": 10}, 180),
            ("discovery", "info", "Discovered 14 raw Google Places candidates in West Delhi", {"count_found": 14}, 175),
            ("discovery", "info", "Fast Website Filter: Checking domains for 14 candidates", {}, 170),
            ("discovery", "warn", "Candidate 'Clove Dental Rajouri' dropped: Chain hospital detected", {"reason": "hospital_chain"}, 168),
            ("discovery", "info", "Candidate 'Dr. Bhalla Dental Oasis' has no official website (Instagram link only)", {"place_id": "ChIJ_rajouri_01"}, 165),
            ("discovery", "info", "Phone & WhatsApp verification: +919811882211 valid Indian mobile prefix (981)", {"carrier": "Airtel"}, 162),
            ("discovery", "info", "Candidate staged: 'Dr. Bhalla Dental Oasis' (Fit Score: 85, Stage: DISCOVERED)", {"lead_slug": "dr-bhallas-dental-oasis-rajouri-garden"}, 160),
            ("discovery", "info", "Starting local pool search for 'Dwarka Sector 12'", {"locality": "Dwarka Sector 12"}, 155),
            ("discovery", "info", "Evaluating candidate 'Dental Care & Implant Studio' (Dr. Megha Singhal)", {}, 150),
            ("discovery", "info", "Verified 2-source Practo credentials for Dr. Megha Singhal (BDS, MDS Ortho)", {"confidence": 0.98}, 145),
            ("discovery", "info", "Candidate staged: 'Dental Care & Implant Studio' (Fit Score: 82, Stage: DISCOVERED)", {"lead_slug": "dental-care-implant-studio-dwarka-sec12"}, 140),
            ("discovery", "info", "Discovery run complete: 14 found, 6 passed website filter, 2 staged, 8 dropped", {"passed": 2, "dropped": 8}, 135),
            ("building", "info", "Demo Factory: Polling FIFO staged leads with no packages", {"batch_size": 3}, 120),
            ("building", "info", "Claimed lead #1: 'Krystal Dental Care & Implant Centre' (Malviya Nagar)", {}, 118),
            ("building", "info", "Generating multi-template payload: Modern, Premium, Warm JSON definitions", {"slug": "krystal-dental-care-malviya-nagar"}, 115),
            ("building", "info", "Executing clinic self-check gate: verifying hours, phone, map, no banned medical claims", {}, 112),
            ("building", "info", "Self-check gate PASSED for 'Krystal Dental Care' (Quality Score: 98/100)", {"checks": 5}, 110),
            ("building", "info", "Invoking Playwright mobile walkthrough batch recorder on port 3001", {"duration_s": 45}, 105),
            ("building", "info", "Recorded mobile walkthrough video: recordings/krystal-dental-care-malviya-nagar.mp4 (6.4 MB)", {}, 100),
            ("building", "info", "Claimed lead #2: 'Smile On Dental Clinic' (Sector 51, Gurugram)", {}, 95),
            ("building", "info", "Building Warm & Premium layouts with clinic hours schedule", {}, 90),
            ("building", "info", "Batch build complete: 3 packages created, all 3 passed self-check gates", {"batch_built": 3}, 85),
            ("outreach", "info", "Outreach Dispatcher started: Checking active WhatsApp session (.wa_session)", {"driver": "playwright"}, 60),
            ("outreach", "info", "Dentist break schedule check: Current time 02:35 PM IST within afternoon OPD window (01:30 - 04:30 PM)", {"window": "afternoon_break"}, 58),
            ("outreach", "info", "Fetched active outbox queue: 2 approved messages pending dispatch", {"queue_depth": 2}, 55),
            ("outreach", "info", "Human pacing delay: waiting 120s before dispatching next WhatsApp pitch", {"delay_s": 120}, 50),
            ("outreach", "info", "Dispatching 2-part WhatsApp pitch to Dr. Vikas Sharma (+919811445566)", {"template": "initial_pitch"}, 45),
            ("outreach", "info", "WhatsApp dispatch delivered to Dr. Vikas Sharma (Lead: prime-dental-care-tilak-nagar)", {"delivery_status": "sent"}, 40),
            ("outreach", "info", "Tracking webhook: Demo page opened by Dr. Vikas Sharma (User-Agent: iOS Safari Mobile)", {"event": "page_view", "dwell_s": 82}, 30),
            ("outreach", "info", "Design choice captured: Dr. Vikas Sharma selected 'Premium' layout", {"design": "premium"}, 25),
            ("outreach", "info", "Inbound WhatsApp reply received from Dr. Sneha Rao (+919811998877): 'Saw Modern preview, what is pricing?'", {"ai_label": "price"}, 20),
            ("outreach", "info", "AI Reply Copilot generated 3 contextual suggestions for Dr. Sneha Rao in 1.4s", {"model": "gemini-3.8-flash"}, 15),
            ("outreach", "warn", "Inbound reply from Dr. Rajesh Batra: 'Please stop messaging me. STOP' -> Auto-triggered Do-Not-Contact safety brake", {"brake": "DNC_ACTIVATED"}, 10),
        ]
        for service, level, msg, meta, offset_min in logs_seed_data:
            t_log = TerminalLog(
                service=service,
                level=level,
                hustle_id=hustle.id,
                message=msg,
                metadata_json=meta,
                created_at=now - timedelta(minutes=offset_min),
            )
            db.add(t_log)
        changed = True

    return changed


def seed_initial_data(db: Session, include_demo_leads: bool = True) -> Hustle:
    """Seeds the Dental Clinics hustle, stages, smart views, objection library, and sample clinics."""
    existing = db.query(Hustle).filter(Hustle.slug == "dental-clinics").first()
    if existing:
        updated = False
        if existing.allowed_channels != ["whatsapp"]:
            existing.allowed_channels = ["whatsapp"]
            updated = True
        if _backfill_calls_and_logs(db, existing):
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

    # Seed one sample Autopilot Run trace
    db.add(
        RunLog(
            hustle_id=dental.id,
            job_type="daily_autopilot_batch",
            status="succeeded",
            count_found=16,
            count_passed=16,
            count_dropped=0,
            drop_reasons={"has_active_website": 5, "hospital_multispecialty": 2, "unverified_phone": 1},
            errors=[],
            trace_logs=[
                "[09:05:12] Step 1 Find: Queried Google Places & local pools for Delhi NCR dental clinics -> 16 candidates",
                "[09:05:40] Step 2 Confirm No Website: Filtered independent domain checks",
                "[09:06:15] Step 3 Research: Verified doctor degrees across Practo & Google Maps",
                "[09:07:02] Step 5 Build: Generated Modern, Premium, and Warm JSON packages",
                "[09:07:18] Step 6 Self-Check: Passed schema validation, phone/map check, and zero banned claims",
            ],
            started_at=now - timedelta(hours=3),
            finished_at=now - timedelta(hours=2, minutes=55),
        )
    )

    if include_demo_leads:
        sample_leads = [
            # 1. Discovered & Researching (Stage 1)
            {
                "slug": "dr-bhallas-dental-oasis-rajouri-garden",
                "name": "Dr. Bhalla's Dental Oasis",
                "doctor_name": "Dr. Raman Bhalla",
                "locality": "Rajouri Garden",
                "city": "West Delhi",
                "address": "J-12/41, Major Sudesh Kumar Marg, Rajouri Garden, New Delhi 110027",
                "primary_phone": "+919811882211",
                "instagram_handle": "drbhallasdental",
                "stage_slug": "discovered",
                "status": "STAGED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Research lead doctor credentials and verify WhatsApp mobile number",
                "due_offset_hours": 4,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Implantology & Prosthodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Prosthodontics)",
                    "consultation_fee": "Rs. 600",
                    "operating_hours": "Mon-Sat 10:30 AM - 08:00 PM",
                },
                "what_changed": "Autopilot discovered clinic in Rajouri Garden via Google Places. Staged for research.",
                "facts": [
                    ("google_rating", "4.7★", "Google Maps", True),
                    ("review_count", "96 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Raman Bhalla (MDS Prosthodontics)", "Practo", True),
                    ("website_check", "No active official website found", "Google Search", True),
                ],
                "events": [],
                "messages": [],
            },
            # 2. Discovered & Researching (Stage 1)
            {
                "slug": "dental-care-implant-studio-dwarka-sec12",
                "name": "Dental Care & Implant Studio",
                "doctor_name": "Dr. Megha Singhal",
                "locality": "Dwarka Sector 12",
                "city": "South West Delhi",
                "address": "Plot 8, Sector 12 Dwarka, New Delhi 110078",
                "primary_phone": "+919818334455",
                "instagram_handle": "dentalcaredwarka",
                "stage_slug": "discovered",
                "status": "STAGED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Verify Google Maps reviews and check Practo listing",
                "due_offset_hours": 6,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "Orthodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Orthodontics)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 11:00 AM - 08:30 PM",
                },
                "what_changed": "Discovered candidate via Dwarka Sector 12 local pool. Staged for qualification.",
                "facts": [
                    ("google_rating", "4.8★", "Google Maps", True),
                    ("review_count", "112 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Megha Singhal (BDS, MDS Ortho)", "Practo + Justdial", True),
                    ("website_check", "No domain registered; aggregator profiles only", "Brave Search", True),
                ],
                "events": [],
                "messages": [],
            },
            # 3. Review Tray / Ready (Stage 2)
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
                "status": "DEMO_READY",
                "automation_enabled": True,
                "needs_followup": False,
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
                        "sent",
                    )
                ],
            },
            # 4. Review Tray / Ready (Stage 2)
            {
                "slug": "smile-on-dental-clinic-sector-51-gurugram",
                "name": "Smile On Dental Clinic",
                "doctor_name": "Dr. Ritu Verma",
                "locality": "Sector 51",
                "city": "Gurugram",
                "address": "Shop 104, Mayfield Garden Market, Sector 51, Gurugram 122003",
                "primary_phone": "+919811334455",
                "instagram_handle": "smileongurugram",
                "stage_slug": "package_ready",
                "status": "DEMO_READY",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Review generated designs and approve video walkthrough",
                "due_offset_hours": 3,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Orthodontics & Aligners",
                },
                "custom_fields": {
                    "degrees": "BDS, PGD (Orthodontics)",
                    "consultation_fee": "Rs. 600",
                    "operating_hours": "Tue-Sun 10:30 AM - 08:00 PM",
                },
                "what_changed": "Completed 3 designs. Video walkthrough rendered in 42s. Ready for dispatch.",
                "facts": [
                    ("google_rating", "4.8★", "Google Maps", True),
                    ("review_count", "126 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Ritu Verma", "Google Maps", True),
                    ("website_check", "No website found", "Serper", True),
                ],
                "events": [],
                "messages": [],
            },
            # 5. Review Tray / Ready (Stage 2)
            {
                "slug": "shree-radhey-dental-clinic-indirapuram",
                "name": "Shree Radhey Dental Clinic",
                "doctor_name": "Dr. Prashant Mishra",
                "locality": "Indirapuram",
                "city": "Ghaziabad",
                "address": "Shop 14, Aditya Mega City, Vaibhav Khand, Indirapuram, Ghaziabad 201014",
                "primary_phone": "+919811443322",
                "instagram_handle": "shreeradheydental",
                "stage_slug": "package_ready",
                "status": "DEMO_READY",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Review mobile walkthrough recording & approve initial WhatsApp pitch",
                "due_offset_hours": 5,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "Conservative Dentistry",
                },
                "custom_fields": {
                    "degrees": "BDS (Conservative Dentistry)",
                    "consultation_fee": "Rs. 400",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:00 PM",
                },
                "what_changed": "Demo factory built Modern, Premium, and Warm layouts. Passed all self-check gates.",
                "facts": [
                    ("google_rating", "4.8★", "Google Maps", True),
                    ("review_count", "142 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Prashant Mishra", "Google Maps", True),
                    ("website_check", "No official domain found", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "note",
                        "internal_note",
                        "Autopilot built Modern, Premium, and Warm layouts. Passed self-check gates.",
                        "",
                        "sent",
                    )
                ],
            },
            # 6. Approved & Outbox / Queued (Stage 3)
            {
                "slug": "apex-smile-studio-gk1",
                "name": "Apex Smile Studio",
                "doctor_name": "Dr. Sameer Kapoor",
                "locality": "Greater Kailash 1",
                "city": "South Delhi",
                "address": "M-48, M-Block Market, Greater Kailash 1, New Delhi 110048",
                "primary_phone": "+919811556677",
                "instagram_handle": "apexsmilegk1",
                "stage_slug": "queued",
                "status": "DEMO_READY",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "WhatsApp sender scheduled for 02:30 PM OPD break window",
                "due_offset_hours": 1,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Prosthodontics & Cosmetic Dentistry",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Prosthodontics)",
                    "consultation_fee": "Rs. 800",
                    "operating_hours": "Mon-Sat 10:00 AM - 07:30 PM",
                },
                "what_changed": "Pitch approved by operator. Placed in WhatsApp outbox queue.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "210 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Sameer Kapoor (MDS Prosthodontics)", "Practo", True),
                    ("website_check", "No website found", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Sameer Ji! We built 3 custom website designs for Apex Smile Studio. Preview link: http://localhost:3001/demo/apex-smile-studio-gk1",
                        "initial_pitch",
                        "queued",
                    )
                ],
                "outbox_items": [
                    {
                        "channel": "whatsapp",
                        "text": "Namaste Dr. Sameer Ji! We built 3 custom website designs for Apex Smile Studio. Preview link: http://localhost:3001/demo/apex-smile-studio-gk1",
                        "step_tag": "initial_pitch",
                        "status": "queued",
                    }
                ],
            },
            # 7. Approved & Outbox / Queued (Stage 3)
            {
                "slug": "cosmodent-implant-centre-cp",
                "name": "Cosmodent Implant Centre",
                "doctor_name": "Dr. Neha Aggarwal",
                "locality": "Connaught Place",
                "city": "Central Delhi",
                "address": "B-22, Inner Circle, Connaught Place, New Delhi 110001",
                "primary_phone": "+919811667788",
                "instagram_handle": "cosmodentcp",
                "stage_slug": "queued",
                "status": "DEMO_READY",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Review queue priority before evening dispatch batch",
                "due_offset_hours": 2,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "Oral & Maxillofacial Surgery",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Oral Surgery)",
                    "consultation_fee": "Rs. 750",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:00 PM",
                },
                "what_changed": "Operator reviewed walkthrough video and approved WhatsApp initial pitch dispatch.",
                "facts": [
                    ("google_rating", "4.8★", "Google Maps", True),
                    ("review_count", "165 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Neha Aggarwal (BDS, MDS Oral Surgery)", "Practo", True),
                    ("website_check", "No website found", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Neha Ji! Here are 3 custom website previews for Cosmodent: http://localhost:3001/demo/cosmodent-implant-centre-cp",
                        "initial_pitch",
                        "queued",
                    )
                ],
                "outbox_items": [
                    {
                        "channel": "whatsapp",
                        "text": "Namaste Dr. Neha Ji! Here are 3 custom website previews for Cosmodent: http://localhost:3001/demo/cosmodent-implant-centre-cp",
                        "step_tag": "initial_pitch",
                        "status": "queued",
                    }
                ],
            },
            # 8. Pitch Sent / Contacted (Stage 4)
            {
                "slug": "clove-free-family-dental-punjabi-bagh",
                "name": "Clove-Free Family Dental",
                "doctor_name": "Dr. Harpreet Singh",
                "locality": "Punjabi Bagh",
                "city": "West Delhi",
                "address": "Plot 19, Club Road, Punjabi Bagh West, New Delhi 110026",
                "primary_phone": "+919811778899",
                "instagram_handle": "familydentalpb",
                "stage_slug": "contacted",
                "status": "CONTACTED",
                "automation_enabled": True,
                "needs_followup": True,
                "next_action": "Send Day 3 follow-up on design preferences",
                "due_offset_hours": 4,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Orthodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Ortho)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:00 PM",
                },
                "what_changed": "Pitch sent 3 days ago via WhatsApp. No reply yet. Flagged for follow-up.",
                "facts": [
                    ("google_rating", "4.8★", "Google Maps", True),
                    ("review_count", "138 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Harpreet Singh (BDS, MDS Ortho)", "Practo", True),
                    ("website_check", "No domain registered", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Harpreet Ji! We noticed Family Dental has 138 great reviews on Google Maps without an official website. We crafted 3 live mobile previews for your clinic: http://localhost:3001/demo/clove-free-family-dental-punjabi-bagh",
                        "initial_pitch",
                        "sent",
                    )
                ],
            },
            # 9. Pitch Sent / Contacted (Stage 4)
            {
                "slug": "the-dental-lounge-vasant-vihar",
                "name": "The Dental Lounge",
                "doctor_name": "Dr. Alok Sen",
                "locality": "Vasant Vihar",
                "city": "South Delhi",
                "address": "Basement 2, Vasant Vihar Community Centre, New Delhi 110057",
                "primary_phone": "+919811889900",
                "instagram_handle": "dentalloungevv",
                "stage_slug": "contacted",
                "status": "CONTACTED",
                "automation_enabled": True,
                "needs_followup": True,
                "next_action": "Call clinic coordinator to check if Dr. Sen reviewed WhatsApp demo",
                "due_offset_hours": 5,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "Endodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Endodontics)",
                    "consultation_fee": "Rs. 700",
                    "operating_hours": "Mon-Sat 11:00 AM - 07:30 PM",
                },
                "what_changed": "Pitch sent 4 days ago. Follow-up required.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "175 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Alok Sen (MDS Endodontics)", "Practo", True),
                    ("website_check", "No domain registered", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Sen Ji! Here is your custom dental website showcase for The Dental Lounge: http://localhost:3001/demo/the-dental-lounge-vasant-vihar",
                        "initial_pitch",
                        "sent",
                    )
                ],
            },
            # 10. Pitch Sent / Contacted (Stage 4)
            {
                "slug": "sparkle-dental-hub-saket",
                "name": "Sparkle Dental Hub",
                "doctor_name": "Dr. Sunita Batra",
                "locality": "Saket",
                "city": "South Delhi",
                "address": "F-14, Press Enclave Road, Saket, New Delhi 110017",
                "primary_phone": "+919811990011",
                "instagram_handle": "sparkledentalsaket",
                "stage_slug": "contacted",
                "status": "CONTACTED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Monitor link clicks before scheduling Day 3 check-in",
                "due_offset_hours": 12,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "General Dentistry",
                },
                "custom_fields": {
                    "degrees": "BDS",
                    "consultation_fee": "Rs. 450",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:00 PM",
                },
                "what_changed": "WhatsApp pitch sent yesterday. Awaiting doctor engagement.",
                "facts": [
                    ("google_rating", "4.7★", "Google Maps", True),
                    ("review_count", "92 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Sunita Batra (BDS)", "Google Maps", True),
                    ("website_check", "No domain found", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Sunita Ji! Built 3 custom designs for Sparkle Dental Hub: http://localhost:3001/demo/sparkle-dental-hub-saket",
                        "initial_pitch",
                        "sent",
                    )
                ],
            },
            # 11. Viewed Demo / Hot Intent (Stage 5)
            {
                "slug": "prime-dental-care-tilak-nagar",
                "name": "Prime Dental Care & Implant Studio",
                "doctor_name": "Dr. Vikas Sharma",
                "locality": "Tilak Nagar",
                "city": "West Delhi",
                "address": "12/4, Old Market Road, Tilak Nagar, New Delhi 110018",
                "primary_phone": "+919811445566",
                "instagram_handle": "primedentaltilak",
                "stage_slug": "viewed_demo",
                "status": "CONTACTED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Doctor viewed Premium design for 82s. Send follow-up addressing custom domain setup.",
                "due_offset_hours": 4,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "Implantology & Periodontics",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Periodontics)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:30 PM",
                },
                "what_changed": "Doctor clicked demo link from WhatsApp pitch (iPhone). Dwell: 82s. Selected 'Premium' layout.",
                "facts": [
                    ("google_rating", "4.7★", "Google Maps", True),
                    ("review_count", "98 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Vikas Sharma (MDS)", "Google Maps", True),
                    ("website_check", "No website found", "Serper", True),
                ],
                "events": [
                    ("page_view", "hero", "", 82),
                    ("design_choice", "switcher", "premium", 82),
                ],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Vikas Ji! Built 3 custom demo designs for Prime Dental Care: http://localhost:3001/demo/prime-dental-care-tilak-nagar",
                        "initial_pitch",
                        "sent",
                    )
                ],
            },
            # 12. Viewed Demo / Hot Intent (Stage 5)
            {
                "slug": "elite-smile-care-south-ex-2",
                "name": "Elite Smile Care",
                "doctor_name": "Dr. Tanvi Goyal",
                "locality": "South Extension II",
                "city": "South Delhi",
                "address": "E-18, South Extension Part 2, New Delhi 110049",
                "primary_phone": "+919811001122",
                "instagram_handle": "elitesmilesouthex",
                "stage_slug": "viewed_demo",
                "status": "CONTACTED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Follow up via WhatsApp noting interest in Modern clinic template",
                "due_offset_hours": 3,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Periodontics & Cosmetic",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Periodontics)",
                    "consultation_fee": "Rs. 700",
                    "operating_hours": "Mon-Sat 10:30 AM - 08:00 PM",
                },
                "what_changed": "Doctor spent 64 seconds browsing Modern template on mobile device.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "204 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Tanvi Goyal (MDS Periodontics)", "Practo", True),
                    ("website_check", "No domain found", "Google Search", True),
                ],
                "events": [
                    ("page_view", "hero", "", 64),
                    ("design_choice", "switcher", "modern", 64),
                ],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Tanvi Ji! Here are your clinic's 3 preview designs: http://localhost:3001/demo/elite-smile-care-south-ex-2",
                        "initial_pitch",
                        "sent",
                    )
                ],
            },
            # 13. Replied / Warm (Stage 6) - with 5-message WhatsApp thread & Logged Call #1
            {
                "slug": "dentique-dental-implant-centre-sector-76-noida",
                "name": "Dentique Dental & Implant Centre",
                "doctor_name": "Dr. Sneha Rao",
                "locality": "Sector 76",
                "city": "Noida",
                "address": "Plot 2, Amrapali Silicon City Gate 2, Sector 76, Noida 201301",
                "primary_phone": "+919582390243",
                "instagram_handle": "dentiquenoida76",
                "stage_slug": "replied",
                "status": "REPLIED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Call Dr. Sneha on Friday at 11:30 AM with Practo comparison sheet",
                "due_offset_hours": 16,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Oral Surgery & Implants",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Oral & Maxillofacial Surgery)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:30 PM",
                },
                "what_changed": "Phone call completed. Dr. Sneha interested in Modern design; requested pricing comparison vs Practo.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "215 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Sneha Rao (MDS Oral Surgery)", "Google Maps + Practo", True),
                    ("website_check", "No active official website", "Serper", True),
                ],
                "events": [
                    ("page_view", "hero", "", 95),
                    ("design_choice", "switcher", "modern", 95),
                ],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Sneha Ji! Built 3 custom demo designs for Dentique Dental: http://localhost:3001/demo/dentique-dental-implant-centre-sector-76-noida",
                        "initial_pitch",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Hi! Saw the Modern preview, looks clean. What is the commercial pricing for this?",
                        "price",
                        "delivered",
                    ),
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Sneha Ji, it is a one-time Rs. 15,000 setup with zero monthly retainer. Includes your custom domain, Google Maps WhatsApp button, and mobile booking.",
                        "pricing_reply",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Can we connect on a quick call today around 4:30 PM after my morning OPD?",
                        "call_request",
                        "delivered",
                    ),
                    (
                        "whatsapp",
                        "outbound",
                        "Perfect Dr. Ji, I will call you sharply at 4:30 PM.",
                        "call_confirm",
                        "sent",
                    ),
                ],
                "calls": [
                    {
                        "raw_text": "Spoke with Dr. Sneha Rao at 4:30 PM for 6 minutes. She loved the Modern template layout, especially the clean patient review section and direct WhatsApp button. Her main objection is that she already pays Practo for leads and wanted to know how this compares. I explained that Practo displays competitor clinics right next to hers, while her own website sends 100% of high-intent Google Maps visitors straight to her phone. She agreed to review the proposal and asked me to follow up on Friday with pricing options. She mentioned a budget of around Rs. 15,000-18,000.",
                        "summary": "Dr. Sneha appreciated the Modern layout and direct WhatsApp booking. Compared value against existing Practo spend and requested a formal pricing comparison before Friday follow-up.",
                        "interests": ["Modern clinic layout", "Direct WhatsApp booking button", "Google Maps review widget integration"],
                        "objections": ["Existing Practo subscription spend", "Needs confirmation on domain ownership"],
                        "commitments": [
                            {"who_owes_it": "us", "what": "Send Practo vs Website comparison sheet and proposal", "due_phrase": "by Thursday evening"},
                            {"who_owes_it": "them", "what": "Review pricing proposal with clinic partner", "due_phrase": "before Friday 11 AM"},
                        ],
                        "next_steps": ["Send WhatsApp proposal summary with domain inclusions", "Call on Friday at 11:30 AM to finalize"],
                        "prep_brief": "- Emphasize that Google Maps traffic converts at 4x higher intent than Practo directory browse.\n- Confirm free assistance with Google Business Profile verification.\n- Close on Rs. 15,000 package with complimentary .in domain.",
                        "duration_seconds": 360,
                        "outcome": "interested",
                    }
                ],
            },
            # 14. Replied / Warm (Stage 6) - with 5-message WhatsApp thread & Logged Call #2
            {
                "slug": "dr-gargs-advanced-dentistry-rohini-sec9",
                "name": "Dr. Garg's Advanced Dentistry",
                "doctor_name": "Dr. Vivek Garg",
                "locality": "Rohini Sector 9",
                "city": "North West Delhi",
                "address": "DC-12, Sector 9, Rohini, Delhi 110085",
                "primary_phone": "+919811776655",
                "instagram_handle": "drgargrohini",
                "stage_slug": "replied",
                "status": "REPLIED",
                "automation_enabled": True,
                "needs_followup": False,
                "next_action": "Send invoice for 50% advance token (Rs. 8,000) and collect clinic photo assets",
                "due_offset_hours": 8,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Implantology",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Implantology)",
                    "consultation_fee": "Rs. 500",
                    "operating_hours": "Mon-Sat 10:00 AM - 08:30 PM",
                },
                "what_changed": "Dr. Garg confirmed interest in Warm template during call. Agreed on Rs. 16,000 total with 1-year hosting.",
                "facts": [
                    ("google_rating", "4.8★", "Google Maps", True),
                    ("review_count", "156 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Vivek Garg (BDS, MDS Implantology)", "Practo", True),
                    ("website_check", "No website found", "Google Search", True),
                ],
                "events": [
                    ("page_view", "hero", "", 70),
                    ("design_choice", "switcher", "warm", 70),
                ],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Vivek Ji! Built 3 mobile-optimized clinic websites for Dr. Garg's Advanced Dentistry: http://localhost:3001/demo/dr-gargs-advanced-dentistry-rohini-sec9",
                        "initial_pitch",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Designs look good. Do you also handle Google Maps SEO and photos?",
                        "inquiry",
                        "delivered",
                    ),
                    (
                        "whatsapp",
                        "outbound",
                        "Yes Dr. Ji! We optimize your Google Business profile, connect your high-res clinic photos, and add an instant WhatsApp consultation button.",
                        "explanation",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Sounds good. Please call me on my clinic line tomorrow morning at 11:00 AM.",
                        "call_request",
                        "delivered",
                    ),
                    (
                        "whatsapp",
                        "outbound",
                        "Scheduled Dr. Vivek Ji. Looking forward to speaking tomorrow at 11 AM.",
                        "confirmation",
                        "sent",
                    ),
                ],
                "calls": [
                    {
                        "raw_text": "Called Dr. Vivek Garg at 11:00 AM. Conversation lasted 7 minutes. Dr. Garg is expanding his Rohini clinic with a second dental chair and wants new implant patients. He was impressed by the Warm design template. He expressed concern about ongoing maintenance and who updates doctor timings if OPD hours change. I explained that timing updates are handled free via WhatsApp request within 2 hours. He committed to signing off if we include free hosting for the first year. We agreed on Rs. 16,000 total.",
                        "summary": "Dr. Garg is expanding clinic capacity and looking to acquire implant patients. Liked the Warm template. Reassured regarding ongoing maintenance and timing updates. Agreed on Rs. 16,000 with 1-year hosting included.",
                        "interests": ["Warm template design", "Implant patient acquisition", "Google Maps local SEO optimization"],
                        "objections": ["Maintenance hassle for changing OPD timings", "Hosting renewal transparency"],
                        "commitments": [
                            {"who_owes_it": "us", "what": "Send written confirmation of 1-year free hosting & 2-hr maintenance turnaround", "due_phrase": "today by 3 PM"},
                            {"who_owes_it": "them", "what": "Share clinic high-resolution photos and staff credentials", "due_phrase": "by tomorrow"},
                        ],
                        "next_steps": ["Send invoice and bank details for 50% advance token (Rs. 8,000)", "Collect clinic photo assets"],
                        "prep_brief": "- Acknowledge the clinic's new second operatory expansion.\n- Reiterate 2-hour SLA for OPD schedule updates.\n- Request clinic registration certificate for domain mapping.",
                        "duration_seconds": 420,
                        "outcome": "scheduled_call",
                    }
                ],
            },
            # 15. Won / Client (Stage 7) - with 6-message thread & Logged Call #3
            {
                "slug": "dental-aesthetics-india-defence-colony",
                "name": "Dental Aesthetics India",
                "doctor_name": "Dr. Vandana Sehgal",
                "locality": "Defence Colony",
                "city": "South Delhi",
                "address": "A-284, Defence Colony, New Delhi 110024",
                "primary_phone": "+919811554433",
                "instagram_handle": "dentalaestheticsdelhi",
                "stage_slug": "won",
                "status": "WON",
                "automation_enabled": True,
                "needs_followup": False,
                "deal_value_inr": 20000,
                "next_action": "Send welcome onboarding kit and QR code standee design for clinic reception",
                "due_offset_hours": 24,
                "ai_fields": {
                    "multi_doctor_or_implant_center": True,
                    "has_active_instagram_reels": True,
                    "primary_specialty": "Aesthetic Dentistry & Implants",
                },
                "custom_fields": {
                    "degrees": "BDS, MDS (Prosthodontics)",
                    "consultation_fee": "Rs. 1000",
                    "operating_hours": "Mon-Sat 10:00 AM - 07:00 PM",
                },
                "what_changed": "Client closed. Custom domain deployed and live. Received Rs. 20,000 full payment.",
                "facts": [
                    ("google_rating", "4.9★", "Google Maps", True),
                    ("review_count", "248 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Vandana Sehgal (BDS, MDS Prostho)", "Practo", True),
                    ("website_check", "No official domain previously", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Vandana Ji! Here is your custom preview: http://localhost:3001/demo/dental-aesthetics-india-defence-colony",
                        "initial_pitch",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Loved the Premium layout. Can we launch this on dentalaestheticsdelhi.com?",
                        "interest",
                        "delivered",
                    ),
                    (
                        "whatsapp",
                        "outbound",
                        "Absolutely Dr. Ji! We can configure the custom domain and SSL today. Total setup is Rs. 20,000.",
                        "proposal",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Great, sending payment via UPI now.",
                        "payment",
                        "delivered",
                    ),
                    (
                        "whatsapp",
                        "outbound",
                        "Payment of Rs. 20,000 received with thanks! Domain configuration initiated.",
                        "receipt",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Site is live, looks magnificent. Thank you!",
                        "testimonial",
                        "delivered",
                    ),
                ],
                "calls": [
                    {
                        "raw_text": "Closing call with Dr. Vandana Sehgal. 10 minutes. Finalized deployment to custom domain dentalaestheticsdelhi.com. Dr. Sehgal paid Rs. 20,000 via UPI. Verified all links, WhatsApp routing to clinic front desk (+919811009988), and Google Analytics tracking. Client expressed high satisfaction with the Premium luxury aesthetic.",
                        "summary": "Client closed and onboarded. Custom domain launched and full payment of Rs. 20,000 received. Clinic staff trained on WhatsApp lead notifications.",
                        "interests": ["Luxury aesthetics", "Ultra-fast mobile load time", "Custom domain configuration"],
                        "objections": ["None remaining - fully resolved"],
                        "commitments": [
                            {"who_owes_it": "us", "what": "Monthly analytics traffic summary on 1st of each month", "due_phrase": "monthly"},
                            {"who_owes_it": "them", "what": "Provide video testimonial after 30 days of live usage", "due_phrase": "in 30 days"},
                        ],
                        "next_steps": ["Send welcome onboarding kit and QR code standee design for clinic reception"],
                        "prep_brief": "- Check 30-day traffic numbers in Google Analytics.\n- Inquire about patient feedback on mobile booking.\n- Request Google review / video testimonial.",
                        "duration_seconds": 600,
                        "outcome": "completed",
                    }
                ],
            },
            # 16. Lost / Closed (Stage 8) - with Inbound STOP reply & Logged Call #4
            {
                "slug": "city-dental-clinic-karol-bagh",
                "name": "City Dental Clinic",
                "doctor_name": "Dr. Rajesh Batra",
                "locality": "Karol Bagh",
                "city": "Central Delhi",
                "address": "18/4, Arya Samaj Road, Karol Bagh, New Delhi 110005",
                "primary_phone": "+919811221100",
                "instagram_handle": "citydentalkb",
                "stage_slug": "lost",
                "status": "LOST",
                "automation_enabled": False,
                "needs_followup": False,
                "do_not_contact": True,
                "do_not_contact_reason": "Auto-flagged from inbound reply: 'STOP'",
                "next_action": "Archive lead record and mark DNC permanently",
                "due_offset_hours": 48,
                "ai_fields": {
                    "multi_doctor_or_implant_center": False,
                    "has_active_instagram_reels": False,
                    "primary_specialty": "General Dentistry",
                },
                "custom_fields": {
                    "degrees": "BDS",
                    "consultation_fee": "Rs. 350",
                    "operating_hours": "Mon-Sat 10:00 AM - 07:00 PM",
                },
                "what_changed": "Doctor requested DNC in courtesy call and WhatsApp reply. Retiring next month.",
                "facts": [
                    ("google_rating", "4.6★", "Google Maps", True),
                    ("review_count", "74 reviews", "Google Maps", True),
                    ("doctor_name", "Dr. Rajesh Batra (BDS)", "Google Maps", True),
                    ("website_check", "No domain found", "Google Search", True),
                ],
                "events": [],
                "messages": [
                    (
                        "whatsapp",
                        "outbound",
                        "Namaste Dr. Rajesh Ji! We prepared 3 demo websites for City Dental Clinic: http://localhost:3001/demo/city-dental-clinic-karol-bagh",
                        "initial_pitch",
                        "sent",
                    ),
                    (
                        "whatsapp",
                        "inbound",
                        "Please stop sending messages, I am retiring next month. STOP",
                        "stop",
                        "delivered",
                    ),
                ],
                "calls": [
                    {
                        "raw_text": "Brief courtesy call to Dr. Rajesh Batra after initial inquiry. 2 minutes. Dr. Batra confirmed he is transitioning ownership of the Karol Bagh clinic to a junior associate and retiring from active practice at the end of the quarter. Not interested in investing in digital marketing or website assets at this time. Requested no further communications.",
                        "summary": "Dr. Batra confirmed retirement and clinic ownership transition. Zero interest in digital marketing investments. Flagged as DNC.",
                        "interests": ["None"],
                        "objections": ["Doctor retiring from active clinical practice"],
                        "commitments": [
                            {"who_owes_it": "us", "what": "Respect DNC and remove from all automated sequences", "due_phrase": "immediate"}
                        ],
                        "next_steps": ["Archive lead record and mark DNC permanently"],
                        "prep_brief": "- Do not contact. Lead is archived due to doctor retirement.",
                        "duration_seconds": 120,
                        "outcome": "not_interested",
                    }
                ],
            },
        ]

        # Item 12: Use the same SSOT slug→status mapping as sync_lead_stage_and_status
        # so seed data never diverges from production stage transitions.
        _SEED_SLUG_TO_STATUS = {
            "staged": "STAGED",
            "discovered": "STAGED",
            "queued": "STAGED",
            "package_ready": "PACKAGE_READY",
            "contacted": "CONTACTED",
            "viewed_demo": "INTERESTED",
            "negotiating": "NEGOTIATING",
            "closed_won": "WON",
            "won": "WON",
            "closed_lost": "LOST",
            "lost": "LOST",
            "do_not_contact": "DNC",
            "dnc": "DNC",
            "archived": "DNC",
        }
        for item in sample_leads:
            status = item.get("status")
            if not status:
                status = _SEED_SLUG_TO_STATUS.get(item["stage_slug"].lower(), "STAGED")

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
                status=status,
                automation_enabled=item.get("automation_enabled", True),
                needs_followup=item.get("needs_followup", False),
                do_not_contact=item.get("do_not_contact", False),
                do_not_contact_reason=item.get("do_not_contact_reason", ""),
                next_action=item["next_action"],
                next_action_due_at=now + timedelta(hours=item["due_offset_hours"]),
                custom_fields=item["custom_fields"],
                ai_fields=item["ai_fields"],
                what_changed_summary=item["what_changed"],
                deal_value_inr=item.get("deal_value_inr", 15000),
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

            # Only create packages for built leads (stages 2 to 8)
            pkg = None
            if item["stage_slug"] != "discovered":
                pkg_status = "sent" if item["stage_slug"] in ("viewed_demo", "replied", "won", "lost") else "ready_for_review"
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
                        "hours": {
                            "verified": True,
                            "schedule": item["custom_fields"].get("operating_hours", "Mon-Sat 10 AM - 8 PM"),
                        },
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
                    package_id=pkg.id if pkg else None,
                    event_type=ev_type,
                    section=sec,
                    design_chosen=des,
                    duration_seconds=dur,
                    is_bot=False,
                )
                db.add(ev)
                ev_objs.append(ev)

            msg_objs = []
            for m_item in item["messages"]:
                ch = m_item[0]
                direction = m_item[1]
                txt = m_item[2]
                label = m_item[3]
                deliv_status = m_item[4] if len(m_item) > 4 else ("sent" if direction == "outbound" else "delivered")
                m = Message(
                    lead_id=lead.id,
                    channel=ch,
                    direction=direction,
                    text=txt,
                    ai_label=label,
                    delivery_status=deliv_status,
                )
                db.add(m)
                msg_objs.append(m)

            if item.get("calls"):
                for c_item in item["calls"]:
                    call_obj = Call(
                        lead_id=lead.id,
                        raw_text=c_item["raw_text"],
                        summary=c_item.get("summary", ""),
                        interests=c_item.get("interests", []),
                        objections=c_item.get("objections", []),
                        commitments=c_item.get("commitments", []),
                        next_steps=c_item.get("next_steps", []),
                        prep_brief=c_item.get("prep_brief", ""),
                        duration_seconds=c_item.get("duration_seconds", 0),
                        outcome=c_item.get("outcome", "completed"),
                        created_at=now - timedelta(hours=6),
                    )
                    db.add(call_obj)

            if item.get("outbox_items"):
                for ob_item in item["outbox_items"]:
                    outbox_obj = OutboxItem(
                        lead_id=lead.id,
                        hustle_id=dental.id,
                        channel=ob_item.get("channel", "whatsapp"),
                        text=ob_item["text"],
                        unique_key=ob_item.get("unique_key", f"lead:{lead.id}:ch:whatsapp:step:{ob_item.get('step_tag', 'initial_pitch')}"),
                        status=ob_item.get("status", "queued"),
                        scheduled_for=now + timedelta(hours=ob_item.get("offset_hours", 2)),
                    )
                    db.add(outbox_obj)

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

        # Seed 30+ structured terminal logs for Discovery, Building, and Outreach terminals
        terminal_logs_data = [
            # 12 Discovery logs
            ("discovery", "info", "Starting Google Places search for 'dental clinic Rajouri Garden West Delhi'", {"query": "dental clinic Rajouri Garden", "target_count": 10}, 180),
            ("discovery", "info", "Discovered 14 raw Google Places candidates in West Delhi", {"count_found": 14}, 175),
            ("discovery", "info", "Fast Website Filter: Checking domains for 14 candidates", {}, 170),
            ("discovery", "warn", "Candidate 'Clove Dental Rajouri' dropped: Chain hospital detected", {"reason": "hospital_chain"}, 168),
            ("discovery", "info", "Candidate 'Dr. Bhalla Dental Oasis' has no official website (Instagram link only)", {"place_id": "ChIJ_rajouri_01"}, 165),
            ("discovery", "info", "Phone & WhatsApp verification: +919811882211 valid Indian mobile prefix (981)", {"carrier": "Airtel"}, 162),
            ("discovery", "info", "Candidate staged: 'Dr. Bhalla Dental Oasis' (Fit Score: 85, Stage: DISCOVERED)", {"lead_slug": "dr-bhallas-dental-oasis-rajouri-garden"}, 160),
            ("discovery", "info", "Starting local pool search for 'Dwarka Sector 12'", {"locality": "Dwarka Sector 12"}, 155),
            ("discovery", "info", "Evaluating candidate 'Dental Care & Implant Studio' (Dr. Megha Singhal)", {}, 150),
            ("discovery", "info", "Verified 2-source Practo credentials for Dr. Megha Singhal (BDS, MDS Ortho)", {"confidence": 0.98}, 145),
            ("discovery", "info", "Candidate staged: 'Dental Care & Implant Studio' (Fit Score: 82, Stage: DISCOVERED)", {"lead_slug": "dental-care-implant-studio-dwarka-sec12"}, 140),
            ("discovery", "info", "Discovery run complete: 14 found, 6 passed website filter, 2 staged, 8 dropped", {"passed": 2, "dropped": 8}, 135),

            # 10 Building / Demo Factory logs
            ("building", "info", "Demo Factory: Polling FIFO staged leads with no packages", {"batch_size": 3}, 120),
            ("building", "info", "Claimed lead #1: 'Krystal Dental Care & Implant Centre' (Malviya Nagar)", {}, 118),
            ("building", "info", "Generating multi-template payload: Modern, Premium, Warm JSON definitions", {"slug": "krystal-dental-care-malviya-nagar"}, 115),
            ("building", "info", "Executing clinic self-check gate: verifying hours, phone, map, no banned medical claims", {}, 112),
            ("building", "info", "Self-check gate PASSED for 'Krystal Dental Care' (Quality Score: 98/100)", {"checks": 5}, 110),
            ("building", "info", "Invoking Playwright mobile walkthrough batch recorder on port 3001", {"duration_s": 45}, 105),
            ("building", "info", "Recorded mobile walkthrough video: recordings/krystal-dental-care-malviya-nagar.mp4 (6.4 MB)", {}, 100),
            ("building", "info", "Claimed lead #2: 'Smile On Dental Clinic' (Sector 51, Gurugram)", {}, 95),
            ("building", "info", "Building Warm & Premium layouts with clinic hours schedule", {}, 90),
            ("building", "info", "Batch build complete: 3 packages created, all 3 passed self-check gates", {"batch_built": 3}, 85),

            # 11 Outreach / Closer logs
            ("outreach", "info", "Outreach Dispatcher started: Checking active WhatsApp session (.wa_session)", {"driver": "playwright"}, 60),
            ("outreach", "info", "Dentist break schedule check: Current time 02:35 PM IST within afternoon OPD window (01:30 - 04:30 PM)", {"window": "afternoon_break"}, 58),
            ("outreach", "info", "Fetched active outbox queue: 2 approved messages pending dispatch", {"queue_depth": 2}, 55),
            ("outreach", "info", "Human pacing delay: waiting 120s before dispatching next WhatsApp pitch", {"delay_s": 120}, 50),
            ("outreach", "info", "Dispatching 2-part WhatsApp pitch to Dr. Vikas Sharma (+919811445566)", {"template": "initial_pitch"}, 45),
            ("outreach", "info", "WhatsApp dispatch delivered to Dr. Vikas Sharma (Lead: prime-dental-care-tilak-nagar)", {"delivery_status": "sent"}, 40),
            ("outreach", "info", "Tracking webhook: Demo page opened by Dr. Vikas Sharma (User-Agent: iOS Safari Mobile)", {"event": "page_view", "dwell_s": 82}, 30),
            ("outreach", "info", "Design choice captured: Dr. Vikas Sharma selected 'Premium' layout", {"design": "premium"}, 25),
            ("outreach", "info", "Inbound WhatsApp reply received from Dr. Sneha Rao (+919811998877): 'Saw Modern preview, what is pricing?'", {"ai_label": "price"}, 20),
            ("outreach", "info", "AI Reply Copilot generated 3 contextual suggestions for Dr. Sneha Rao in 1.4s", {"model": "gemini-3.8-flash"}, 15),
            ("outreach", "warn", "Inbound reply from Dr. Rajesh Batra: 'Please stop messaging me. STOP' -> Auto-triggered Do-Not-Contact safety brake", {"brake": "DNC_ACTIVATED"}, 10),
        ]
        for service, level, msg, meta, offset_min in terminal_logs_data:
            t_log = TerminalLog(
                service=service,
                level=level,
                hustle_id=dental.id,
                message=msg,
                metadata_json=meta,
                created_at=now - timedelta(minutes=offset_min),
            )
            db.add(t_log)

    db.commit()
    db.refresh(dental)
    return dental
