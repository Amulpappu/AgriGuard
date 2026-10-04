"""
Dashboard summary endpoint.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Scan, Crop, Disease
from app.schemas.schemas import DashboardSummary, ScanListItem, SeverityOut, CropOut, DiseaseOut
from app.api.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Scan).where(Scan.user_id == current_user.id).order_by(Scan.created_at.desc())
    )
    scans = result.scalars().all()

    total = len(scans)
    healthy = sum(1 for s in scans if s.status == "healthy")
    affected = sum(1 for s in scans if s.status == "potentially_diseased")
    uncertain = sum(1 for s in scans if s.status == "uncertain")

    # Recent 5
    recent_items = []
    for s in scans[:5]:
        crop_r = await db.get(Crop, s.crop_id)
        disease_r = await db.get(Disease, s.disease_id) if s.disease_id else None
        recent_items.append(
            ScanListItem(
                id=s.id,
                crop=CropOut.model_validate(crop_r),
                status=s.status,
                disease=DiseaseOut.model_validate(disease_r) if disease_r else None,
                confidence=min(s.confidence, 0.99),
                severity=SeverityOut(level=s.severity, affected_pct=s.severity_pct, is_estimate=True),
                created_at=s.created_at,
                image_url=s.image_url,
                thumb_url=s.thumb_url,
            )
        )

    # Chart data: daily affected % per crop
    chart_data = []
    for s in scans:
        if s.severity_pct is not None:
            crop_r = await db.get(Crop, s.crop_id)
            chart_data.append({
                "date": s.created_at.date().isoformat(),
                "crop_slug": crop_r.slug if crop_r else "unknown",
                "affected_pct": round(s.severity_pct, 1),
                "status": s.status,
            })

    return DashboardSummary(
        total_scans=total,
        healthy_count=healthy,
        affected_count=affected,
        uncertain_count=uncertain,
        recent_scans=recent_items,
        chart_data=chart_data,
    )
