# Good example: archiving a lead instead of hard-deleting it
def archive_lead(db, lead):
    lead.is_archived = True
    db.commit()
