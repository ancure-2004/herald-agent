from app.utils.safety import detect_stop_intent


def classify_inbound_reply(text: str) -> str:
    """Rule-based AI reply labeler (interested, price_question, not_now, wrong_person, stop)."""
    if detect_stop_intent(text):
        return "stop"
    low = text.lower()
    if any(w in low for w in ["price", "cost", "charge", "kitna", "how much", "fee", "rate"]):
        return "price_question"
    if any(w in low for w in ["wrong number", "not a clinic", "wrong person"]):
        return "wrong_person"
    if any(w in low for w in ["next week", "next monday", "busy", "later", "after diwali", "not now"]):
        return "not_now"
    if any(
        w in low
        for w in ["interested", "looks good", "looks clean", "call", "connect", "yes", "modern", "premium", "warm"]
    ):
        return "interested"
    return "neutral"
