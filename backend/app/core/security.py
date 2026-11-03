"""
Security & Authentication Placeholder (`app/core/security.py`)
-------------------------------------------------------------
Pre-configured for plug-and-play JWT / API key authentication.
When ready to enforce authentication, inject `get_current_user` into router dependencies.
"""

from typing import Optional

from fastapi import Header


class User:
    """Mock/Placeholder authenticated user entity."""

    def __init__(self, user_id: str = "captain", role: str = "admin", is_active: bool = True):
        self.user_id = user_id
        self.role = role
        self.is_active = is_active


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    """
    Placeholder authentication dependency.
    Currently allows all requests and returns the root operator.
    To enforce auth:
      1. Parse Bearer token from `authorization`.
      2. Verify signature using Settings.SECRET_KEY.
      3. Return validated User object or raise HTTPException(status_code=401).
    """
    # Placeholder: passthrough
    return User(user_id="captain", role="admin", is_active=True)
