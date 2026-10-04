from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Crop
from app.schemas.schemas import CropOut
from app.api.deps import get_current_user
from typing import List

router = APIRouter(prefix="/crops", tags=["crops"])


@router.get("", response_model=List[CropOut])
async def list_crops(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(select(Crop))
    return result.scalars().all()
