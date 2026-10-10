from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.models import User
from app.schemas.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.api.deps import get_current_user
from app.core.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )
    user = User(
        email=body.email,
        hashed_password=get_password_hash(body.password),
        full_name=body.full_name or body.email.split("@")[0],
    )
    db.add(user)
    await db.flush()
    token = create_access_token({"sub": user.id})
    # UI hint only; admin endpoints verify a Supabase admin session themselves.
    is_lohith = (user.email or "").lower().strip() == settings.ADMIN_EMAIL
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_lohith=is_lohith,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    
    is_valid = bool(user) and verify_password(body.password, user.hashed_password)

    if not user or not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": user.id})
    # UI hint only; admin endpoints verify a Supabase admin session themselves.
    is_lohith = (user.email or "").lower().strip() == settings.ADMIN_EMAIL
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_lohith=is_lohith,
    )


@router.get("/me")
async def get_current_user_profile(user: User = Depends(get_current_user)):
    # UI hint only; admin endpoints verify a Supabase admin session themselves.
    is_lohith = (user.email or "").lower().strip() == settings.ADMIN_EMAIL
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_lohith": is_lohith,
    }




