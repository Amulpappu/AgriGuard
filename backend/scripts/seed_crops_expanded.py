"""
Expanded Crops, Vegetables, and Agronomic Conditions Seeder for AgriGuard.
Populates Rice, Wheat, Corn, Cotton, Brinjal, Onion, Banana, Mango, Grape,
Cabbage, Cucumber, Tomato, Potato, Pepper + Nutrient Deficiencies & Pests.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.models import Crop, Disease

CROPS_EXPANDED = [
    {"slug": "tomato",    "name_key": "crop.tomato",    "icon_emoji": "🍅"},
    {"slug": "potato",    "name_key": "crop.potato",    "icon_emoji": "🥔"},
    {"slug": "pepper",    "name_key": "crop.pepper",    "icon_emoji": "🌶️"},
    {"slug": "rice",      "name_key": "crop.rice",      "icon_emoji": "🌾"},
    {"slug": "wheat",     "name_key": "crop.wheat",     "icon_emoji": "🌾"},
    {"slug": "corn",      "name_key": "crop.corn",      "icon_emoji": "🌽"},
    {"slug": "brinjal",   "name_key": "crop.brinjal",   "icon_emoji": "🍆"},
    {"slug": "onion",     "name_key": "crop.onion",     "icon_emoji": "🧅"},
    {"slug": "cotton",    "name_key": "crop.cotton",    "icon_emoji": "🌿"},
    {"slug": "banana",    "name_key": "crop.banana",    "icon_emoji": "🍌"},
    {"slug": "mango",     "name_key": "crop.mango",     "icon_emoji": "🥭"},
    {"slug": "grape",     "name_key": "crop.grape",     "icon_emoji": "🍇"},
    {"slug": "cabbage",   "name_key": "crop.cabbage",   "icon_emoji": "🥬"},
    {"slug": "cucumber",  "name_key": "crop.cucumber",  "icon_emoji": "🥒"},
]

DISEASES_EXPANDED = [
    # Tomato
    {"slug": "tomato_healthy",            "name_key": "disease.tomato_healthy",            "crop_slug": "tomato", "class_label": "Tomato___healthy"},
    {"slug": "tomato_early_blight",       "name_key": "disease.tomato_early_blight",       "crop_slug": "tomato", "class_label": "Tomato___Early_blight"},
    {"slug": "tomato_late_blight",        "name_key": "disease.tomato_late_blight",        "crop_slug": "tomato", "class_label": "Tomato___Late_blight"},
    {"slug": "tomato_leaf_mold",          "name_key": "disease.tomato_leaf_mold",          "crop_slug": "tomato", "class_label": "Tomato___Leaf_Mold"},
    {"slug": "tomato_calcium_deficiency", "name_key": "disease.tomato_calcium_deficiency", "crop_slug": "tomato", "class_label": "Tomato___Blossom_End_Rot_Calcium"},

    # Potato
    {"slug": "potato_healthy",            "name_key": "disease.potato_healthy",            "crop_slug": "potato", "class_label": "Potato___healthy"},
    {"slug": "potato_early_blight",       "name_key": "disease.potato_early_blight",       "crop_slug": "potato", "class_label": "Potato___Early_blight"},
    {"slug": "potato_late_blight",        "name_key": "disease.potato_late_blight",        "crop_slug": "potato", "class_label": "Potato___Late_blight"},
    {"slug": "potato_moisture_stress",    "name_key": "disease.potato_moisture_stress",    "crop_slug": "potato", "class_label": "Potato___Moisture_Stress"},

    # Pepper (Chilli / Bell Pepper)
    {"slug": "pepper_healthy",            "name_key": "disease.pepper_healthy",            "crop_slug": "pepper", "class_label": "Pepper,_bell___healthy"},
    {"slug": "pepper_bacterial_spot",     "name_key": "disease.pepper_bacterial_spot",     "crop_slug": "pepper", "class_label": "Pepper,_bell___Bacterial_spot"},
    {"slug": "pepper_thrips_damage",      "name_key": "disease.pepper_thrips_damage",      "crop_slug": "pepper", "class_label": "Pepper___Thrips_Leaf_Curl"},

    # Rice / Paddy
    {"slug": "rice_healthy",              "name_key": "disease.rice_healthy",              "crop_slug": "rice",   "class_label": "Rice___healthy"},
    {"slug": "rice_blast",                "name_key": "disease.rice_blast",                "crop_slug": "rice",   "class_label": "Rice___Blast"},
    {"slug": "rice_bacterial_blight",     "name_key": "disease.rice_bacterial_blight",     "crop_slug": "rice",   "class_label": "Rice___Bacterial_Blight"},
    {"slug": "rice_brown_spot",           "name_key": "disease.rice_brown_spot",           "crop_slug": "rice",   "class_label": "Rice___Brown_Spot"},
    {"slug": "rice_nitrogen_deficiency",  "name_key": "disease.rice_nitrogen_deficiency",  "crop_slug": "rice",   "class_label": "Rice___Nitrogen_Deficiency"},

    # Wheat
    {"slug": "wheat_healthy",             "name_key": "disease.wheat_healthy",             "crop_slug": "wheat",  "class_label": "Wheat___healthy"},
    {"slug": "wheat_yellow_rust",         "name_key": "disease.wheat_yellow_rust",         "crop_slug": "wheat",  "class_label": "Wheat___Yellow_Rust"},
    {"slug": "wheat_leaf_blight",         "name_key": "disease.wheat_leaf_blight",         "crop_slug": "wheat",  "class_label": "Wheat___Leaf_Blight"},

    # Corn / Maize
    {"slug": "corn_healthy",              "name_key": "disease.corn_healthy",              "crop_slug": "corn",   "class_label": "Corn___healthy"},
    {"slug": "corn_common_rust",          "name_key": "disease.corn_common_rust",          "crop_slug": "corn",   "class_label": "Corn___Common_Rust"},
    {"slug": "corn_leaf_blight",          "name_key": "disease.corn_leaf_blight",          "crop_slug": "corn",   "class_label": "Corn___Northern_Leaf_Blight"},
    {"slug": "corn_armyworm_pest",        "name_key": "disease.corn_armyworm_pest",        "crop_slug": "corn",   "class_label": "Corn___Fall_Armyworm"},

    # Brinjal / Eggplant
    {"slug": "brinjal_healthy",           "name_key": "disease.brinjal_healthy",           "crop_slug": "brinjal","class_label": "Brinjal___healthy"},
    {"slug": "brinjal_bacterial_wilt",    "name_key": "disease.brinjal_bacterial_wilt",    "crop_slug": "brinjal","class_label": "Brinjal___Bacterial_Wilt"},
    {"slug": "brinjal_shoot_fruit_borer", "name_key": "disease.brinjal_shoot_fruit_borer", "crop_slug": "brinjal","class_label": "Brinjal___Shoot_Fruit_Borer"},

    # Onion
    {"slug": "onion_healthy",             "name_key": "disease.onion_healthy",             "crop_slug": "onion",  "class_label": "Onion___healthy"},
    {"slug": "onion_purple_blotch",       "name_key": "disease.onion_purple_blotch",       "crop_slug": "onion",  "class_label": "Onion___Purple_Blotch"},
    {"slug": "onion_thrips_damage",       "name_key": "disease.onion_thrips_damage",       "crop_slug": "onion",  "class_label": "Onion___Thrips_Infestation"},

    # Cotton
    {"slug": "cotton_healthy",            "name_key": "disease.cotton_healthy",            "crop_slug": "cotton", "class_label": "Cotton___healthy"},
    {"slug": "cotton_bacterial_blight",   "name_key": "disease.cotton_bacterial_blight",   "crop_slug": "cotton", "class_label": "Cotton___Bacterial_Blight"},
    {"slug": "cotton_potassium_burn",     "name_key": "disease.cotton_potassium_burn",     "crop_slug": "cotton", "class_label": "Cotton___Potassium_Deficiency_Burn"},

    # Banana
    {"slug": "banana_healthy",            "name_key": "disease.banana_healthy",            "crop_slug": "banana", "class_label": "Banana___healthy"},
    {"slug": "banana_sigatoka",           "name_key": "disease.banana_sigatoka",           "crop_slug": "banana", "class_label": "Banana___Sigatoka_Leaf_Spot"},
    {"slug": "banana_panama_wilt",        "name_key": "disease.banana_panama_wilt",        "crop_slug": "banana", "class_label": "Banana___Panama_Fusarium_Wilt"},

    # Mango
    {"slug": "mango_healthy",             "name_key": "disease.mango_healthy",             "crop_slug": "mango",  "class_label": "Mango___healthy"},
    {"slug": "mango_anthracnose",         "name_key": "disease.mango_anthracnose",         "crop_slug": "mango",  "class_label": "Mango___Anthracnose"},
    {"slug": "mango_powdery_mildew",      "name_key": "disease.mango_powdery_mildew",      "crop_slug": "mango",  "class_label": "Mango___Powdery_Mildew"},

    # Grape
    {"slug": "grape_healthy",             "name_key": "disease.grape_healthy",             "crop_slug": "grape",  "class_label": "Grape___healthy"},
    {"slug": "grape_black_rot",           "name_key": "disease.grape_black_rot",           "crop_slug": "grape",  "class_label": "Grape___Black_rot"},
    {"slug": "grape_downy_mildew",        "name_key": "disease.grape_downy_mildew",        "crop_slug": "grape",  "class_label": "Grape___Downy_Mildew"},

    # Cabbage
    {"slug": "cabbage_healthy",           "name_key": "disease.cabbage_healthy",           "crop_slug": "cabbage","class_label": "Cabbage___healthy"},
    {"slug": "cabbage_black_rot",         "name_key": "disease.cabbage_black_rot",         "crop_slug": "cabbage","class_label": "Cabbage___Black_rot"},
    {"slug": "cabbage_caterpillar_damage","name_key": "disease.cabbage_caterpillar_damage","crop_slug": "cabbage","class_label": "Cabbage___Caterpillar_Pest"},

    # Cucumber / Gourds
    {"slug": "cucumber_healthy",          "name_key": "disease.cucumber_healthy",          "crop_slug": "cucumber","class_label": "Cucumber___healthy"},
    {"slug": "cucumber_downy_mildew",     "name_key": "disease.cucumber_downy_mildew",     "crop_slug": "cucumber","class_label": "Cucumber___Downy_Mildew"},
    {"slug": "cucumber_mosaic_virus",     "name_key": "disease.cucumber_mosaic_virus",     "crop_slug": "cucumber","class_label": "Cucumber___Mosaic_Virus"},
]


async def seed_expanded():
    async with AsyncSessionLocal() as db:
        crop_map = {}
        for c in CROPS_EXPANDED:
            r = await db.execute(select(Crop).where(Crop.slug == c["slug"]))
            existing = r.scalar_one_or_none()
            if not existing:
                obj = Crop(**c)
                db.add(obj)
                await db.flush()
                crop_map[c["slug"]] = obj.id
            else:
                existing.name_key = c["name_key"]
                existing.icon_emoji = c["icon_emoji"]
                crop_map[c["slug"]] = existing.id

        for d in DISEASES_EXPANDED:
            r = await db.execute(select(Disease).where(Disease.slug == d["slug"]))
            existing = r.scalar_one_or_none()
            if not existing:
                db.add(Disease(
                    slug=d["slug"],
                    name_key=d["name_key"],
                    crop_id=crop_map[d["crop_slug"]],
                    class_label=d["class_label"],
                ))
            else:
                existing.name_key = d["name_key"]
                existing.class_label = d["class_label"]

        await db.commit()
        print(f"Successfully seeded {len(CROPS_EXPANDED)} crops/vegetables and {len(DISEASES_EXPANDED)} conditions!")

if __name__ == "__main__":
    asyncio.run(seed_expanded())
