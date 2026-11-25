"""Fixed vocabulary for the invented data. Enum values are the ones herald's code uses; sentences are made up."""

LOCALITIES = [
    "Rajouri Garden",
    "Rohini",
    "Karol Bagh",
    "Dwarka",
    "Lajpat Nagar",
    "Saket",
    "Sector 62 Noida",
    "Sector 14 Gurugram",
]
FIT_REASONS = ["No website found", "Strong Google rating", "Many Google reviews", "Single-doctor practice"]
INTENT_REASONS = ["Opened the demo link", "Replied on WhatsApp", "Asked about the price"]
NEXT_ACTIONS = [
    "Send the follow-up on the demo",
    "Call back about the design",
    "Check the outbox approval",
    "Wait for the clinic's reply",
]
# Lead 1 is always the busy lead: the maximum of every child count, so the inbox and call briefs the load check times have data.
BUSY_LEAD = 1
BUSY_MESSAGES = 12
BUSY_CALLS = 3
BUSY_COMMITMENTS = 2
BUSY_FACTS = 5
FACT_FIELDS = ["google_rating", "review_count", "doctor_name", "operating_hours", "website_check", "phone_verification"]
FACT_SOURCES = ["search", "Discovery Phone Validator", "Tier 1: Google Places API"]
IN_TEXTS = [
    "Yes, please send the link.",
    "Who is this?",
    "Busy this week, call later.",
    "How much does it cost?",
    "Send the videos on WhatsApp.",
]
OUT_TEXTS = [
    "Hi, sharing three demo designs for your clinic.",
    "Following up on the demo, did you get a chance to look?",
    "Here is the walkthrough video.",
    "Happy to call at a time that suits you.",
]
CALL_RAW = [
    "Short call. The doctor asked for the warm design and a price sheet.",
    "Left a voicemail. No answer on the first try.",
    "Spoke for five minutes. Clinic is busy in the mornings.",
]
CALL_SUMMARIES = [
    "Liked the warm design, wants a price sheet.",
    "Voicemail left, no answer.",
    "Busy mornings, call again in the afternoon.",
]
CALL_OUTCOMES = ["connected", "completed", "interested", "not_interested", "scheduled_call"]
INTERESTS = ["Warm design", "Modern layout", "Google Maps listing"]
OBJECTIONS = ["Too busy this month", "Already has a listing"]
COMMIT_WHAT = ["Send the revised demo link", "Share the clinic photos", "Confirm the call time"]
COMMIT_STATUSES = ["proposed", "confirmed", "expired", "cancelled"]
OUTBOX_STATUSES = ["pending_approval", "queued", "sent", "failed", "cancelled", "blocked"]
PACKAGE_STATUSES = ["ready_for_review", "video_pending", "ready", "sent"]
EVENT_TYPES = ["page_view", "tab_ping", "whatsapp_tap", "design_choice"]
SECTIONS = ["hero", "pricing", "gallery", "contact"]
DESIGNS = ["modern", "premium", "warm"]
LOG_LINES = [
    ("discovery", "info", "Fake candidate found in the search results"),
    ("discovery", "warn", "Fake candidate dropped: no phone number"),
    ("building", "info", "Fake demo built"),
    ("outreach", "info", "Fake message queued"),
]
JOB_TYPES = [
    "autopilot_discovery",
    "autopilot_discovery_and_staging",
    "demo_build_batch",
    "auditor_agent_qa_and_video",
]
JOB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"]
RUN_STATUSES = ["succeeded", "failed", "running"]
