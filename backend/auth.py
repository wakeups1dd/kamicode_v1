"""
Authentication middleware for KamiCode.

Verifies Supabase JWT tokens when a secret is provided,
and falls back to header-based or default mock identification in local development.
"""

from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from jose import jwt, JWTError
import urllib.request
import json
from functools import lru_cache

from database import get_db
from models import User
from config import settings


@lru_cache(maxsize=1)
def get_supabase_jwks():
    if not settings.supabase_url:
        return None
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        with urllib.request.urlopen(jwks_url) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        return None


async def get_current_user_id(request: Request) -> Optional[str]:
    """
    Extract user ID (sub) from Supabase JWT or fallback to dev headers/mock in local mode.
    Returns None for anonymous requests if no headers are present.
    """
    auth_header = request.headers.get("Authorization")

    # If Supabase JWT secret is configured and auth is not bypassed, enforce token decoding
    if settings.supabase_jwt_secret and not settings.bypass_auth:
        if not auth_header or not auth_header.startswith("Bearer "):
            # No token provided, return None (endpoint can decide if login is required)
            return None
        
        token = auth_header.split(" ")[1]
        try:
            # Extract the algorithm from the token header (fallback to HS256)
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg", "HS256")
            
            # Supabase tokens are typically signed with the project's JWT secret using HS256
            # but may use RS256 or ES256 in newer projects
            key = settings.supabase_jwt_secret
            if alg != "HS256":
                jwks = get_supabase_jwks()
                if jwks:
                    key = jwks

            payload = jwt.decode(
                token,
                key,
                algorithms=[alg],
                options={"verify_aud": False}
            )
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token payload is missing 'sub' claim",
                )
            return sub
        except JWTError as e:
            try:
                unverified_header = jwt.get_unverified_header(token)
                print(f"JWT Header: {unverified_header}")
            except Exception as e_inner:
                print(f"Failed to get unverified header: {e_inner}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}",
            )

    # Local Dev / Mock Fallback Mode
    # If a Bearer token is provided, attempt to decode unverified claims for seamless local dev
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.get_unverified_claims(token)
            sub = payload.get("sub")
            if sub:
                return sub
        except Exception:
            pass

    # Read custom headers if supplied
    user_id = request.headers.get("X-User-Id")
    if user_id:
        return user_id

    # If nothing is provided, return a default mock user ID for local ease-of-use
    return "mock-user-id"


async def get_current_user(
    request: Request,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to get the current database User object.
    Automatically provisions/registers a new user in the local database
    on their first request.
    """
    if not user_id:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Extract user profile metadata from JWT if possible
        email = None
        display_name = None
        avatar_url = None

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                if settings.supabase_jwt_secret and not settings.bypass_auth:
                    unverified_header = jwt.get_unverified_header(token)
                    alg = unverified_header.get("alg", "HS256")
                    
                    key = settings.supabase_jwt_secret
                    if alg != "HS256":
                        jwks = get_supabase_jwks()
                        if jwks:
                            key = jwks
                            
                    payload = jwt.decode(
                        token,
                        key,
                        algorithms=[alg],
                        options={"verify_aud": False}
                    )
                else:
                    payload = jwt.get_unverified_claims(token)
                email = payload.get("email")
                metadata = payload.get("user_metadata", {})
                display_name = metadata.get("display_name") or metadata.get("full_name")
                avatar_url = metadata.get("avatar_url")
            except Exception:
                pass

        # Fallback values for mock mode or missing JWT metadata
        if not email:
            email = request.headers.get("X-User-Email") or f"{user_id}@kamicode.local"
        if not display_name:
            display_name = request.headers.get("X-User-Display-Name") or email.split("@")[0].capitalize()

        # Generate a unique username based on the email prefix
        base_username = email.split("@")[0]
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User(
            id=user_id,
            username=username,
            display_name=display_name,
            email=email,
            avatar_url=avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
