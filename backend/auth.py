"""
Authentication middleware for KamiCode.

Cryptographically verifies Clerk JWT tokens using Clerk JWKS.
"""

from fastapi import Request, Depends, HTTPException, status
from typing import Optional
import jwt
from jwt import PyJWKClient, PyJWKClientError, ExpiredSignatureError, InvalidSignatureError, DecodeError, InvalidTokenError

from config import settings
from database import get_convex


_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> Optional[PyJWKClient]:
    """Get or initialize the cached PyJWKClient for Clerk."""
    global _jwks_client
    if _jwks_client is None:
        jwks_url = settings.get_jwks_url()
        if jwks_url:
            _jwks_client = PyJWKClient(jwks_url, cache_keys=True, max_cached_keys=16, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


async def get_current_user_id(request: Request) -> Optional[str]:
    """
    Extract and cryptographically verify user ID (sub) from Clerk JWT.
    Supports bypass mode and developer headers for local offline testing.
    """
    auth_header = request.headers.get("Authorization")

    # Bypass auth mode for local development/testing without Clerk
    if settings.bypass_auth:
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # In bypass mode, decode without signature verification
                payload = jwt.decode(token, options={"verify_signature": False})
                sub = payload.get("sub")
                if sub:
                    return sub
            except Exception:
                pass
        
        user_id = request.headers.get("X-User-Id")
        if user_id:
            return user_id
        return "dev-user-id"

    # Production / Standard Auth Mode: Must have a valid Bearer token
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    jwks_client = get_jwks_client()

    if not jwks_client:
        # Fallback if JWKS URL cannot be resolved
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk JWKS configuration is missing on server",
        )

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing 'sub' claim",
            )
        return sub
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
        )
    except InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
        )
    except DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token",
        )
    except PyJWKClientError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to verify token key: {str(e)}",
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
        )


async def get_current_user(
    request: Request,
    user_id: Optional[str] = Depends(get_current_user_id),
) -> Optional[dict]:
    """
    Dependency to get the current user dictionary or None if unauthenticated.
    """
    if not user_id:
        return None
    return {"id": user_id}


async def get_required_user(
    user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """
    Dependency that enforces authentication. Raises 401 if user is not authenticated.
    """
    if not user or not user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_admin_user(
    user: dict = Depends(get_required_user),
    client = Depends(get_convex),
) -> dict:
    """
    Dependency to verify that the authenticated user has admin privileges.
    """
    if settings.bypass_auth:
        return user

    user_id = user["id"]
    admin_list = [u.strip() for u in settings.admin_user_ids.split(",") if u.strip()]

    if "*" in admin_list or user_id in admin_list:
        return user

    # Check if user has admin role in Convex
    try:
        convex_user = client.query("users:getByUserId", {"userId": user_id})
        if convex_user and convex_user.get("role") == "admin":
            return user
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin privileges required to perform this action",
    )
