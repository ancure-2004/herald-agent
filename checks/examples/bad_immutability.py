# Bad example: hard-deleting a lead instead of archiving it
def remove_lead(db, lead):
    db.delete(lead)
    db.commit()
