"""
Seed database with demo crops, diseases, and one demo user.
Run: python scripts/seed_db.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.models import User, Crop, Disease, Device
from app.core.security import get_password_hash


CROPS = [
    {"slug": "tomato", "name_key": "crop.tomato", "icon_emoji": "🍅"},
    {"slug": "potato", "name_key": "crop.potato", "icon_emoji": "🥔"},
    {"slug": "pepper", "name_key": "crop.pepper", "icon_emoji": "🌶️"},
]

DISEASES = [
    # Tomato
    {"slug": "tomato_healthy",       "name_key": "disease.tomato_healthy",       "crop_slug": "tomato", "class_label": "Tomato___healthy"},
    {"slug": "tomato_early_blight",  "name_key": "disease.tomato_early_blight",  "crop_slug": "tomato", "class_label": "Tomato___Early_blight"},
    {"slug": "tomato_late_blight",   "name_key": "disease.tomato_late_blight",   "crop_slug": "tomato", "class_label": "Tomato___Late_blight"},
    {"slug": "tomato_leaf_mold",     "name_key": "disease.tomato_leaf_mold",     "crop_slug": "tomato", "class_label": "Tomato___Leaf_Mold"},
    # Potato
    {"slug": "potato_healthy",       "name_key": "disease.potato_healthy",       "crop_slug": "potato", "class_label": "Potato___healthy"},
    {"slug": "potato_early_blight",  "name_key": "disease.potato_early_blight",  "crop_slug": "potato", "class_label": "Potato___Early_blight"},
    {"slug": "potato_late_blight",   "name_key": "disease.potato_late_blight",   "crop_slug": "potato", "class_label": "Potato___Late_blight"},
    # Pepper
    {"slug": "pepper_healthy",       "name_key": "disease.pepper_healthy",       "crop_slug": "pepper", "class_label": "Pepper,_bell___healthy"},
    {"slug": "pepper_bacterial_spot","name_key": "disease.pepper_bacterial_spot","crop_slug": "pepper", "class_label": "Pepper,_bell___Bacterial_spot"},
]

DEMO_USER = {
    "email": "demo@agriguard.in",
    "password": "Demo1234!",
    "full_name": "Demo Farmer",
}


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Crops
        crop_map = {}
        for c in CROPS:
            r = await db.execute(select(Crop).where(Crop.slug == c["slug"]))
            existing = r.scalar_one_or_none()
            if not existing:
                obj = Crop(**c)
                db.add(obj)
                await db.flush()
                crop_map[c["slug"]] = obj.id
            else:
                crop_map[c["slug"]] = existing.id

        # Diseases
        for d in DISEASES:
            r = await db.execute(select(Disease).where(Disease.slug == d["slug"]))
            if not r.scalar_one_or_none():
                db.add(Disease(
                    slug=d["slug"],
                    name_key=d["name_key"],
                    crop_id=crop_map[d["crop_slug"]],
                    class_label=d["class_label"],
                ))

        # Demo user
        r = await db.execute(select(User).where(User.email == DEMO_USER["email"]))
        if not r.scalar_one_or_none():
            db.add(User(
                email=DEMO_USER["email"],
                hashed_password=get_password_hash(DEMO_USER["password"]),
                full_name=DEMO_USER["full_name"],
            ))

        # Demo IoT device
        import hashlib
        demo_device_key = "agriguard-esp32-key-demo"
        key_hash = hashlib.sha256(demo_device_key.encode()).hexdigest()
        r_dev = await db.execute(select(Device).where(Device.key_hash == key_hash))
        if not r_dev.scalar_one_or_none():
            db.add(Device(
                name="ESP32-Greenhouse-Alpha",
                key_hash=key_hash,
                is_active=True,
            ))

        await db.commit()
        print("Seed complete!")
        print(f"   Demo login:  {DEMO_USER['email']} / {DEMO_USER['password']}")
        print(f"   Demo device: ESP32-Greenhouse-Alpha (Key: {demo_device_key})")


if __name__ == "__main__":
    asyncio.run(seed())
