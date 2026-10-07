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
from app.api.deps import get_current_user, get_optional_user
from app.services.epidemiology import (
    evaluate_pre_symptomatic_risk,
    calculate_village_bioradar,
    evaluate_mandi_phi_roi,
)

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


@router.get("/bio-risk")
async def get_bio_risk(
    temp_c: Optional[float] = None,
    humidity: Optional[float] = None,
    soil_moisture: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_optional_user),
):
    """
    Evaluates 48-72h pre-symptomatic spore germination & infection risk
    using Tom-Cast DSV and Vapor Pressure Deficit (VPD).
    """
    # If not provided, pull latest telemetry from database
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    r2 = await db.execute(
        select(SensorReading)
        .where(SensorReading.recorded_at >= cutoff)
        .order_by(SensorReading.recorded_at.asc())
    )
    series = r2.scalars().all()
    recent_dicts = [{"humidity": s.humidity, "temp_c": s.temp_c} for s in series]

    if temp_c is None or humidity is None or soil_moisture is None:
        r = await db.execute(
            select(SensorReading).order_by(SensorReading.recorded_at.desc()).limit(1)
        )
        latest = r.scalar_one_or_none()
        if latest:
            t = temp_c if temp_c is not None else (latest.temp_c or 26.5)
            h = humidity if humidity is not None else (latest.humidity or 82.0)
            sm = soil_moisture if soil_moisture is not None else (latest.soil_moisture or 65.0)
        else:
            t = temp_c if temp_c is not None else 26.5
            h = humidity if humidity is not None else 82.0
            sm = soil_moisture if soil_moisture is not None else 65.0
    else:
        t, h, sm = temp_c, humidity, soil_moisture

    return evaluate_pre_symptomatic_risk(
        temp_c=t,
        humidity_pct=h,
        soil_moisture_pct=sm,
        recent_readings=recent_dicts,
    )


@router.get("/bioradar")
async def get_bioradar(
    wind_speed: float = 14.5,
    wind_direction: float = 230.0,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_optional_user),
):
    """
    Computes village-level airborne spore plume dispersal radar
    across 2km Gram Panchayat agricultural cluster.
    """
    r = await db.execute(
        select(SensorReading).order_by(SensorReading.recorded_at.desc()).limit(1)
    )
    latest = r.scalar_one_or_none()
    t = latest.temp_c if latest and latest.temp_c else 26.5
    h = latest.humidity if latest and latest.humidity else 82.0
    sm = latest.soil_moisture if latest and latest.soil_moisture else 65.0

    risk_eval = evaluate_pre_symptomatic_risk(t, h, sm)
    source_risk = risk_eval["risk_percentage"]

    return calculate_village_bioradar(
        wind_speed_kmh=wind_speed,
        wind_direction_deg=wind_direction,
        source_risk_pct=source_risk,
    )


@router.get("/mandi-roi")
@router.post("/mandi-roi")
async def get_mandi_roi(
    crop_slug: str = "tomato",
    days_to_harvest: int = 7,
    mandi_price_per_kg: float = 24.0,
    yield_kg: float = 1200.0,
    field_acres: float = 1.0,
    _user=Depends(get_optional_user),
):
    """
    Calculates Pre-Harvest Interval (PHI) Maximum Residue Limit compliance
    and compares financial ROI for Chemical vs Bio-Shield vs Early Harvest.
    """
    return evaluate_mandi_phi_roi(
        crop_slug=crop_slug,
        days_to_harvest=days_to_harvest,
        mandi_price_per_kg=mandi_price_per_kg,
        yield_kg=yield_kg,
        field_acres=field_acres,
    )
