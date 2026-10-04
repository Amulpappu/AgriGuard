from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.ml.classifier import get_model_adapter
from app.schemas.schemas import HealthOut
from app.core.config import get_settings

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health", response_model=HealthOut)
async def health(db: AsyncSession = Depends(get_db)):
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    adapter = get_model_adapter()
    return HealthOut(
        status="ok",
        model_backend=settings.MODEL_BACKEND,
        model_version=adapter.version,
        db=db_status,
    )
