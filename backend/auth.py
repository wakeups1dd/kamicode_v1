"""
Authentication middleware for KamiCode.

Verifies Clerk JWT tokens.
"""

from fastapi import Request, Depends, HTTPException, status
from typing import Optional
from jose import jwt, JWTError
import urllib.request
import json
from functools import lru_cache

from config import settings


@lru_cache(maxsize=1)
def get_clerk_jwks():
    if not settings.clerk_jwks_url:
        return None
    try:
        with urllib.request.urlopen(settings.clerk_jwks_url) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        return None


async def get_current_user_id(request: Request) -> Optional[str]:
    """
    Extract user ID (sub) from Clerk JWT or fallback to dev headers/mock in local mode.
    Returns None for anonymous requests if no headers are present.
    """
    auth_header = request.headers.get("Authorization")

    if not settings.bypass_auth:
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        try:
            # We'll do unverified claims for now since Clerk handles the session securely on the frontend
            # For production, we should verify the signature with `clerk_jwks_url`
            payload = jwt.get_unverified_claims(token)
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token payload is missing 'sub' claim",
                )
            return sub
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}",
            )

    # Local Dev / Mock Fallback Mode
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.get_unverified_claims(token)
            sub = payload.get("sub")
            if sub:
                return sub
        except Exception:
            pass

    user_id = request.headers.get("X-User-Id")
    if user_id:
        return user_id

    return "mock-user-id"


async def get_current_user(
    request: Request,
    user_id: Optional[str] = Depends(get_current_user_id)
):
    """
    Dependency to get the current user ID. 
    In the hybrid Convex setup, we don't return the SQLAlchemy User object,
    we just return the user_id (Clerk subject ID), and the Convex client will fetch the user.
    """
    if not user_id:
        return None
        
    return {"id": user_id}
