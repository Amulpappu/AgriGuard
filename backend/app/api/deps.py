"""
Shared dependency: resolve current user from Bearer token.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User

bearer_scheme = HTTPBearer()
bearer_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id: str = payload.get("sub", "")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    user_id: str = payload.get("sub", "")
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def require_lohith_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Enforces that Database and Administration actions are STRICTLY restricted to Lohith.
    Any other user or unauthenticated request is denied with 401/403.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Database and admin controls are restricted to Lohith only.",
        )
    
    token_str = credentials.credentials.strip()
    
    # 1. Direct Lohith passkey verification support
    if token_str in ("lohith", "lohith123", "lohith2026", "lohith@agriguard"):
        result = await db.execute(
            select(User).where(
                (User.email == "lohithgamer12@gmail.com") | (User.email.ilike("%lohith%"))
            )
        )
        u = result.scalar_one_or_none()
        if u:
            return u
        return User(id="lohith-admin-id", email="lohithgamer12@gmail.com", full_name="LOHITH", is_active=True)

    # 2. JWT token validation
    payload = decode_token(token_str)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
        )
    
    user_id: str = payload.get("sub", "")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
        )
    
    email_clean = (user.email or "").lower().strip()
    name_clean = (user.full_name or "").lower().strip()
    is_lohith = (
        email_clean == "lohithgamer12@gmail.com"
        or "lohith" in email_clean
        or "lohith" in name_clean
    )
    if not is_lohith:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Database access is strictly restricted to Lohith only.",
        )
    
    return user

