"""
Scans API: POST /scans, GET /scans, GET /scans/{id}, GET /scans/compare
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from PIL import Image
import io

from app.core.database import get_db
from app.models.models import Scan, Crop, Disease, User
from app.schemas.schemas import ScanOut, ScanListItem, CompareOut, SeverityOut, CropOut, DiseaseOut, Top3Item
from app.api.deps import get_current_user
from app.ml.classifier import get_model_adapter
from app.services.quality import check_quality
from app.services.confidence import evaluate_confidence
from app.services.severity import estimate_severity
from app.services.storage import get_storage
from app.services.advisory import get_advisory

router = APIRouter(prefix="/scans", tags=["scans"])


async def _build_scan_out(scan: Scan, db: AsyncSession) -> ScanOut:
    crop_r = await db.get(Crop, scan.crop_id)
    disease_r = await db.get(Disease, scan.disease_id) if scan.disease_id else None
    top3_raw = scan.top3 or []
    top3 = [Top3Item(**t) for t in top3_raw if t.get("disease_slug") != "__uncertain__"]
    return ScanOut(
        id=scan.id,
        crop=CropOut.model_validate(crop_r),
        status=scan.status,
        disease=DiseaseOut.model_validate(disease_r) if disease_r else None,
        confidence=min(scan.confidence, 0.99),
        low_confidence=scan.low_confidence,
        top3=top3,
        severity=SeverityOut(
            level=scan.severity,
            affected_pct=scan.severity_pct,
            is_estimate=True,
        ),
        model_version=scan.model_version,
        image_url=scan.image_url,
        thumb_url=scan.thumb_url,
        created_at=scan.created_at,
        crop_auto_detected=getattr(scan, "crop_auto_detected", False) or False,
        condition_type=getattr(scan, "condition_type", "disease") or "disease",
    )


@router.post("", response_model=ScanOut)
async def create_scan(
    crop_id: Optional[str] = Form(None),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Read raw bytes
    raw = await image.read()

    # 2. Quality check
    pil_img = check_quality(raw)

    # 3. Resolve crop or prepare for auto-detection
    crop = None
    target_crop_slug = None
    if crop_id and crop_id.strip() not in ("auto", "none", "null", ""):
        crop = await db.get(Crop, crop_id.strip())
        if not crop:
            cr_res = await db.execute(select(Crop).where(Crop.slug == crop_id.strip()))
            crop = cr_res.scalar_one_or_none()
        if crop:
            target_crop_slug = crop.slug

    # 4. Inference (auto-detects crop if target_crop_slug is None)
    adapter = get_model_adapter()
    result = await adapter.predict(raw, target_crop_slug)
    probs = result["probs"]
    model_version = result["model_version"]
    detected_crop_slug = result.get("detected_crop_slug", "tomato")
    auto_detected = result.get("auto_detected_crop", False) or (target_crop_slug is None)
    condition_type = result.get("condition_type", "disease")

    # If crop was auto-detected or was "auto", resolve the auto-detected crop from DB
    if not crop:
        cr_res = await db.execute(select(Crop).where(Crop.slug == detected_crop_slug))
        crop = cr_res.scalar_one_or_none()
        if not crop:
            cr_fallback = await db.execute(select(Crop).limit(1))
            crop = cr_fallback.scalar_one()

    # 5. Confidence policy
    conf_out = evaluate_confidence(probs)

    # 6. Severity estimate
    is_healthy_pred = conf_out["status"] == "healthy"
    sev = estimate_severity(pil_img, is_healthy_pred)

    # 7. Resolve disease / condition entity
    disease_obj = None
    if conf_out["status"] != "uncertain" and conf_out["top1_slug"] != "__uncertain__":
        r = await db.execute(
            select(Disease).where(Disease.slug == conf_out["top1_slug"])
        )
        disease_obj = r.scalar_one_or_none()

    # 8. Build top3 schema
    top3_items = []
    for t in conf_out["top3"]:
        if t.get("disease_slug") == "__uncertain__":
            continue
        r2 = await db.execute(select(Disease).where(Disease.slug == t["disease_slug"]))
        d = r2.scalar_one_or_none()
        top3_items.append({
            "disease_id": d.id if d else None,
            "disease_slug": t["disease_slug"],
            "disease_name_key": d.name_key if d else f"disease.{t['disease_slug']}",
            "confidence": round(t["prob"], 4),
        })

    # 9. Save image under user directory
    storage = get_storage()
    ext = (image.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    fname = f"{uuid.uuid4()}.{ext}"
    user_name_slug = current_user.email.split("@")[0].replace(" ", "_")
    user_folder = f"users/{user_name_slug}"
    image_url = await storage.save(raw, fname, image.content_type or "image/jpeg", folder=user_folder)
    thumb_url = await storage.save_thumb(raw, fname, folder=user_folder)

    # 10. Persist scan
    scan = Scan(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        crop_id=crop.id,
        image_url=image_url,
        thumb_url=thumb_url,
        is_healthy=is_healthy_pred,
        disease_id=disease_obj.id if disease_obj else None,
        confidence=conf_out["confidence"],
        top3=top3_items,
        severity=sev["level"],
        severity_pct=sev.get("affected_pct"),
        low_confidence=conf_out["low_confidence"],
        model_version=model_version,
        status=conf_out["status"],
        crop_auto_detected=auto_detected,
        condition_type=condition_type,
        created_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.flush()

    return await _build_scan_out(scan, db)


@router.get("/compare", response_model=CompareOut)
async def compare_scans(
    a: str = Query(...),
    b: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan_a = await db.get(Scan, a)
    scan_b = await db.get(Scan, b)
    if not scan_a or not scan_b:
        raise HTTPException(status_code=404, detail="One or both scans not found")
    if scan_a.user_id != current_user.id or scan_b.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    out_a = await _build_scan_out(scan_a, db)
    out_b = await _build_scan_out(scan_b, db)

    sev_delta = None
    if scan_a.severity_pct is not None and scan_b.severity_pct is not None:
        sev_delta = round(scan_b.severity_pct - scan_a.severity_pct, 1)

    return CompareOut(
        scan_a=out_a,
        scan_b=out_b,
        severity_delta=sev_delta,
        confidence_delta=round(scan_b.confidence - scan_a.confidence, 4),
        status_change=scan_a.status != scan_b.status,
    )


@router.get("", response_model=List[ScanListItem])
async def list_scans(
    crop: Optional[str] = Query(None),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conditions = [Scan.user_id == current_user.id]
    if crop:
        crop_r = await db.execute(select(Crop).where(Crop.slug == crop))
        crop_obj = crop_r.scalar_one_or_none()
        if crop_obj:
            conditions.append(Scan.crop_id == crop_obj.id)
    if from_dt:
        conditions.append(Scan.created_at >= from_dt)
    if to_dt:
        conditions.append(Scan.created_at <= to_dt)

    stmt = (
        select(Scan)
        .where(and_(*conditions))
        .order_by(Scan.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    scans = result.scalars().all()

    items = []
    for s in scans:
        crop_r = await db.get(Crop, s.crop_id)
        disease_r = await db.get(Disease, s.disease_id) if s.disease_id else None
        items.append(
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
    return items


@router.get("/{scan_id}", response_model=ScanOut)
async def get_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return await _build_scan_out(scan, db)
