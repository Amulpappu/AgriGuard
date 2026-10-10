"""
Shared dependency: resolve current user from Bearer token.

Two token kinds are accepted for ordinary endpoints:
  * Supabase Auth access tokens (what the web app sends), verified by asking
    the Supabase Auth server, then mapped to a local User row by email.
  * Locally issued JWTs from /api/v1/auth/login (tests, local tooling).

Admin endpoints accept only Supabase-verified tokens; see require_lohith_admin.
"""
import hashlib
import logging
import secrets
import time
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_token, get_password_hash
from app.models.models import User

logger = logging.getLogger(__name__)
settings = get_settings()

bearer_scheme = HTTPBearer()
bearer_optional = HTTPBearer(auto_error=False)

# token sha256 -> (expires_at, supabase user dict); avoids one Auth round trip per request.
_SUPABASE_USER_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 60


async def verify_supabase_token(token: str) -> Optional[dict]:
    """Return the Supabase Auth user for a valid access token, else None."""
    if not settings.SUPABASE_ANON_KEY or token.count(".") != 2:
        return None
    key = hashlib.sha256(token.encode()).hexdigest()
    cached = _SUPABASE_USER_CACHE.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={"apikey": settings.SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        logger.warning("Supabase token verification failed: %s", exc)
        return None
    if res.status_code != 200:
        return None
    user = res.json()
    if not user.get("id") or not user.get("email"):
        return None
    if len(_SUPABASE_USER_CACHE) > 1024:
        _SUPABASE_USER_CACHE.clear()
    _SUPABASE_USER_CACHE[key] = (time.monotonic() + _CACHE_TTL_SECONDS, user)
    return user


async def _local_user_for_supabase(sb_user: dict, db: AsyncSession) -> User:
    """Find (or provision) the local User row for a verified Supabase user."""
    email = sb_user["email"].lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user
    full_name = (sb_user.get("user_metadata") or {}).get("full_name") or email.split("@")[0]
    user = User(
        id=sb_user["id"],
        email=email,
        # Password lives in Supabase Auth; the local hash is random and unusable.
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        full_name=full_name,
    )
    db.add(user)
    await db.flush()
    return user


async def _resolve_user(token: str, db: AsyncSession) -> Optional[User]:
    payload = decode_token(token)
    if payload:
        result = await db.execute(select(User).where(User.id == payload.get("sub", "")))
        return result.scalar_one_or_none()
    sb_user = await verify_supabase_token(token)
    if sb_user:
        return await _local_user_for_supabase(sb_user, db)
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _resolve_user(credentials.credentials, db)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    return await _resolve_user(credentials.credentials, db)


def is_admin_identity(sb_user: dict) -> bool:
    """The admin is exactly ADMIN_EMAIL, confirmed, with the service-assigned admin role."""
    return (
        (sb_user.get("email") or "").lower().strip() == settings.ADMIN_EMAIL
        and bool(sb_user.get("email_confirmed_at"))
        and (sb_user.get("app_metadata") or {}).get("role") == "admin"
    )


async def require_lohith_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Enforces that Database and Administration actions are STRICTLY restricted to Lohith.
    Only a Supabase Auth session for ADMIN_EMAIL with app_metadata.role = "admin"
    is accepted; local JWTs, passkeys and name/email lookalikes are all refused.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Database and admin controls are restricted to Lohith only.",
        )

    sb_user = await verify_supabase_token(credentials.credentials.strip())
    if not sb_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
        )
    if not is_admin_identity(sb_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Database access is strictly restricted to Lohith only.",
        )

    user = await _local_user_for_supabase(sb_user, db)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
        )
    return user
