"""
Flexible auth middleware for KamiCode.

Currently implements a simple header-based user identification:
- Clients send X-User-Id header to identify themselves
- If no header is provided, requests are treated as anonymous

This is designed as a thin abstraction layer that can be easily
replaced with a full auth system (NextAuth, Supabase Auth, Clerk, etc.)
without changing the rest of the application.
"""

from fastapi import Request, Depends
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User


async def get_current_user_id(request: Request) -> Optional[int]:
    """
    Extract the current user ID from the request.
    Currently reads from X-User-Id header.

    Returns None for anonymous requests.
    Replace this with your auth provider's token validation later.
    """
    user_id = request.headers.get("X-User-Id")
    if user_id:
        try:
            return int(user_id)
        except ValueError:
            return None
    return None


async def get_or_create_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Get or create a user based on request headers.
    Reads X-Username header to auto-create users.

    This is a development convenience — replace with proper auth flow later.
    """
    username = request.headers.get("X-Username")
    if not username:
        return None

    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(
            username=username,
            display_name=request.headers.get("X-Display-Name", username),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
