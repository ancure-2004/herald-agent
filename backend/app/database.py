"""
Legacy Database Shim (`app/database.py`)
Re-exports database components from `app.db.session` for backward compatibility.
"""

from app.db.session import Base, SessionLocal, engine, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
