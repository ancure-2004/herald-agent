import re
from typing import Set, Tuple

from sqlalchemy.orm import Session

from app.models.entities import Lead


def get_existing_db_identities(
    db: Session,
    ignore_test_leads: bool = True,
) -> Tuple[Set[str], Set[str], Set[str]]:
    """
    Returns (seen_phones_10digit, seen_clean_names, seen_slugs) across all existing CRM leads.
    In normal mode, excludes leads flagged with is_test=True.
    """
    q = db.query(Lead)
    if ignore_test_leads and hasattr(Lead, "is_test"):
        q = q.filter((Lead.is_test == False) | (Lead.is_test == None))  # noqa: E711, E712

    existing_leads = q.all()
    seen_phones: Set[str] = set()
    seen_names: Set[str] = set()
    seen_slugs: Set[str] = set()

    for l in existing_leads:
        if l.slug:
            seen_slugs.add(l.slug.strip().lower())
        if l.primary_phone:
            digits = re.sub(r"\D", "", l.primary_phone)
            if len(digits) >= 10:
                seen_phones.add(digits[-10:])
        for p in l.phones or []:
            digits = re.sub(r"\D", "", str(p))
            if len(digits) >= 10:
                seen_phones.add(digits[-10:])
        if l.name:
            full_clean = re.sub(r"[^a-z0-9]", "", l.name.lower())
            short_clean = re.sub(r"[^a-z0-9]", "", re.split(r"[-|:]", l.name)[0].lower())
            if full_clean:
                seen_names.add(full_clean)
            if len(short_clean) >= 6:
                seen_names.add(short_clean)

    return seen_phones, seen_names, seen_slugs
