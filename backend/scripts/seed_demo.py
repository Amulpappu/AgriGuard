"""
Demo scan seeder: creates ~20 scans showing disease progression for compare demo.
Run AFTER seed_db.py.
"""
import asyncio, sys, os, uuid, random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.models import User, Crop, Disease, Scan


async def seed_demo_scans():
    async with AsyncSessionLocal() as db:
        # Get demo user
        r = await db.execute(select(User).where(User.email == "demo@agriguard.in"))
        user = r.scalar_one_or_none()
        if not user:
            print("Run seed_db.py first!")
            return

        # Get tomato crop
        r = await db.execute(select(Crop).where(Crop.slug == "tomato"))
        tomato = r.scalar_one()

        # Get diseases
        r = await db.execute(select(Disease).where(Disease.slug.in_(
            ["tomato_healthy", "tomato_early_blight", "tomato_late_blight", "tomato_leaf_mold"]
        )))
        diseases = {d.slug: d for d in r.scalars().all()}

        now = datetime.now(timezone.utc)

        # Simulate a progression: starts healthy, then early blight worsens, then late blight
        progression = [
            ("tomato_healthy",      0.92, "healthy",              "none",     0.0),
            ("tomato_healthy",      0.88, "healthy",              "none",     0.0),
            ("tomato_early_blight", 0.61, "potentially_diseased", "low",      7.2),
            ("tomato_early_blight", 0.68, "potentially_diseased", "low",      9.5),
            ("tomato_early_blight", 0.75, "potentially_diseased", "moderate", 14.3),
            ("tomato_early_blight", 0.82, "potentially_diseased", "moderate", 19.1),
            ("tomato_late_blight",  0.71, "potentially_diseased", "moderate", 22.4),
            ("tomato_late_blight",  0.85, "potentially_diseased", "high",     31.7),
            ("tomato_late_blight",  0.91, "potentially_diseased", "high",     38.2),
            ("tomato_late_blight",  0.94, "potentially_diseased", "high",     44.6),
        ]

        # Add some potato and pepper scans too
        r2 = await db.execute(select(Crop).where(Crop.slug == "potato"))
        potato = r2.scalar_one()
        r3 = await db.execute(select(Crop).where(Crop.slug == "pepper"))
        pepper = r3.scalar_one()

        r4 = await db.execute(select(Disease).where(Disease.slug.in_(
            ["potato_healthy", "potato_early_blight", "pepper_healthy", "pepper_bacterial_spot"]
        )))
        other_diseases = {d.slug: d for d in r4.scalars().all()}

        extra = [
            (potato, "potato_healthy",       0.87, "healthy",              "none",     0.0),
            (potato, "potato_early_blight",  0.73, "potentially_diseased", "low",      8.0),
            (pepper, "pepper_healthy",       0.90, "healthy",              "none",     0.0),
            (pepper, "pepper_bacterial_spot",0.65, "potentially_diseased", "moderate", 18.5),
            (tomato, "__uncertain__",         0.44, "uncertain",            "low",      None),
            (potato, "potato_late_blight",   0.88, "potentially_diseased", "high",     35.2),
            (pepper, "pepper_bacterial_spot",0.78, "potentially_diseased", "high",     32.0),
            (tomato, "tomato_leaf_mold",     0.69, "potentially_diseased", "moderate", 15.2),
            (tomato, "tomato_healthy",       0.91, "healthy",              "none",     0.0),
            (pepper, "pepper_healthy",       0.85, "healthy",              "none",     0.0),
        ]

        scans_added = 0

        for i, (slug, conf, status, sev_level, sev_pct) in enumerate(progression):
            d = diseases.get(slug)
            scan = Scan(
                id=str(uuid.uuid4()),
                user_id=user.id,
                crop_id=tomato.id,
                image_url=f"/uploads/demo_{i}.jpg",
                thumb_url=f"/uploads/thumbs/demo_{i}.jpg",
                is_healthy=(status == "healthy"),
                disease_id=d.id if d else None,
                confidence=conf,
                top3=[{"disease_slug": slug, "disease_name_key": d.name_key if d else slug,
                        "disease_id": d.id if d else None, "confidence": conf}],
                severity=sev_level,
                severity_pct=sev_pct if sev_pct is not None else None,
                low_confidence=conf < 0.80,
                model_version="mock-v1.0",
                status=status,
                created_at=now - timedelta(days=len(progression) - i),
            )
            db.add(scan)
            scans_added += 1

        for i, (crop, slug, conf, status, sev_level, sev_pct) in enumerate(extra):
            all_d = {**diseases, **other_diseases}
            d = all_d.get(slug)
            scan = Scan(
                id=str(uuid.uuid4()),
                user_id=user.id,
                crop_id=crop.id,
                image_url=f"/uploads/demo_extra_{i}.jpg",
                thumb_url=f"/uploads/thumbs/demo_extra_{i}.jpg",
                is_healthy=(status == "healthy"),
                disease_id=d.id if d else None,
                confidence=conf,
                top3=[],
                severity=sev_level,
                severity_pct=sev_pct,
                low_confidence=conf < 0.80,
                model_version="mock-v1.0",
                status=status,
                created_at=now - timedelta(hours=random.randint(1, 200)),
            )
            db.add(scan)
            scans_added += 1

        await db.commit()
        print(f"Added {scans_added} demo scans with visible disease progression.")


if __name__ == "__main__":
    asyncio.run(seed_demo_scans())
