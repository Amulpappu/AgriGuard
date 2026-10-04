"""
Sensor readings endpoints.
POST /sensors/readings  - authenticated by X-Device-Key header
GET  /sensors/latest    - returns latest reading + 24h series
"""
from __future__ import annotations
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import get_settings
from app.models.models import Device, SensorReading
from app.schemas.schemas import SensorReadingIn, SensorReadingOut, SensorLatestOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/sensors", tags=["sensors"])
settings = get_settings()


def _context_hint(latest: Optional[SensorReading]) -> Optional[str]:
    if not latest:
        return None
    hints = []
    if latest.humidity is not None and latest.humidity > 75:
        hints.append("High humidity favours fungal diseases.")
    if latest.soil_moisture is not None and latest.soil_moisture > 70:
        hints.append("Wet soil conditions may increase root disease risk.")
    if latest.temp_c is not None and 15 <= latest.temp_c <= 22:
        hints.append("Cool temperatures favour late blight development.")
    return " ".join(hints) if hints else None


@router.post("/readings", response_model=SensorReadingOut)
async def post_reading(
    body: SensorReadingIn,
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: AsyncSession = Depends(get_db),
):
    key_hash = hashlib.sha256(x_device_key.encode()).hexdigest()
    result = await db.execute(
        select(Device).where(Device.key_hash == key_hash, Device.is_active == True)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=403, detail="Invalid device key")

    reading = SensorReading(
        device_id=device.id,
        soil_moisture=body.soil_moisture,
        temp_c=body.temp_c,
        humidity=body.humidity,
        recorded_at=body.recorded_at or datetime.now(timezone.utc),
    )
    db.add(reading)
    await db.flush()
    return SensorReadingOut.model_validate(reading)


@router.get("/latest", response_model=SensorLatestOut)
async def get_latest(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    # Latest reading across all devices
    r = await db.execute(
        select(SensorReading).order_by(SensorReading.recorded_at.desc()).limit(1)
    )
    latest = r.scalar_one_or_none()

    # 24h series
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    r2 = await db.execute(
        select(SensorReading)
        .where(SensorReading.recorded_at >= cutoff)
        .order_by(SensorReading.recorded_at.asc())
    )
    series = r2.scalars().all()

    return SensorLatestOut(
        latest=SensorReadingOut.model_validate(latest) if latest else None,
        series=[SensorReadingOut.model_validate(s) for s in series],
        context_hint=_context_hint(latest),
    )
