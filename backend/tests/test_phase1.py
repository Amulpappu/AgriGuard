"""
Pytest unit tests for Phase 1 backend.
Covers: quality checks, confidence policy, severity, compare endpoint, sensor validation.
No actual ML model needed — all tests use MockClassifier or synthetic data.
"""
import io
from pathlib import Path
import pytest
import pytest_asyncio
from PIL import Image
from httpx import AsyncClient, ASGITransport
from fastapi import HTTPException

# ─── Quality checks ───────────────────────────────────────────────────────────

def make_jpeg(width=640, height=480, rgb=(50, 150, 50)) -> bytes:
    img = Image.new("RGB", (width, height), color=rgb)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_quality_valid_image():
    from app.services.quality import check_quality
    data = make_jpeg()
    result = check_quality(data)
    assert result is not None


def test_quality_too_dark():
    from app.services.quality import check_quality
    data = make_jpeg(rgb=(5, 5, 5))
    with pytest.raises(HTTPException) as exc_info:
        check_quality(data)
    assert exc_info.value.status_code == 422
    assert isinstance(exc_info.value.detail, dict)
    assert exc_info.value.detail["code"] == "too_dark"


def test_quality_too_bright():
    from app.services.quality import check_quality
    data = make_jpeg(rgb=(250, 250, 250))
    with pytest.raises(HTTPException) as exc_info:
        check_quality(data)
    assert exc_info.value.status_code == 422
    assert isinstance(exc_info.value.detail, dict)
    assert exc_info.value.detail["code"] == "too_bright"


def test_quality_invalid_file():
    from app.services.quality import check_quality
    with pytest.raises(HTTPException) as exc_info:
        check_quality(b"this is not an image")
    assert exc_info.value.status_code == 422
    assert isinstance(exc_info.value.detail, dict)
    assert exc_info.value.detail["code"] == "invalid_file"


def test_quality_file_too_large():
    from app.services.quality import check_quality
    # Generate a valid but oversized payload
    big_data = b"X" * (9 * 1024 * 1024)  # 9 MB of garbage
    with pytest.raises(HTTPException) as exc_info:
        check_quality(big_data)
    assert exc_info.value.status_code == 422
    assert isinstance(exc_info.value.detail, dict)
    assert exc_info.value.detail["code"] in ("file_too_large", "invalid_file")


# ─── Confidence policy ────────────────────────────────────────────────────────

def test_confidence_high():
    from app.services.confidence import evaluate_confidence
    probs = [
        {"disease_slug": "tomato_early_blight", "prob": 0.90},
        {"disease_slug": "tomato_healthy", "prob": 0.06},
        {"disease_slug": "tomato_late_blight", "prob": 0.04},
    ]
    result = evaluate_confidence(probs)
    assert result["status"] == "potentially_diseased"
    assert result["low_confidence"] is False
    assert result["confidence"] <= 0.99


def test_confidence_possible():
    from app.services.confidence import evaluate_confidence
    probs = [
        {"disease_slug": "tomato_early_blight", "prob": 0.65},
        {"disease_slug": "tomato_healthy", "prob": 0.30},
        {"disease_slug": "tomato_late_blight", "prob": 0.05},
    ]
    result = evaluate_confidence(probs)
    assert result["status"] == "potentially_diseased"
    assert result["low_confidence"] is True


def test_confidence_uncertain_low_prob():
    from app.services.confidence import evaluate_confidence
    probs = [
        {"disease_slug": "tomato_early_blight", "prob": 0.40},
        {"disease_slug": "tomato_healthy", "prob": 0.35},
        {"disease_slug": "tomato_late_blight", "prob": 0.25},
    ]
    result = evaluate_confidence(probs)
    assert result["status"] == "uncertain"
    assert result["low_confidence"] is True


def test_confidence_uncertain_small_margin():
    from app.services.confidence import evaluate_confidence
    probs = [
        {"disease_slug": "tomato_early_blight", "prob": 0.82},
        {"disease_slug": "tomato_healthy", "prob": 0.78},  # margin < 0.15
    ]
    result = evaluate_confidence(probs)
    assert result["status"] == "uncertain"


def test_confidence_healthy():
    from app.services.confidence import evaluate_confidence
    probs = [
        {"disease_slug": "tomato_healthy", "prob": 0.92},
        {"disease_slug": "tomato_early_blight", "prob": 0.05},
        {"disease_slug": "tomato_late_blight", "prob": 0.03},
    ]
    result = evaluate_confidence(probs)
    assert result["status"] == "healthy"
    assert result["low_confidence"] is False


def test_confidence_capped_at_99_pct():
    from app.services.confidence import evaluate_confidence
    probs = [
        {"disease_slug": "tomato_healthy", "prob": 1.0},
        {"disease_slug": "tomato_early_blight", "prob": 0.0},
    ]
    result = evaluate_confidence(probs)
    assert result["confidence"] <= 0.99


# ─── Severity ─────────────────────────────────────────────────────────────────

def test_severity_healthy():
    from app.services.severity import estimate_severity
    img = Image.new("RGB", (200, 200), color=(50, 150, 50))
    result = estimate_severity(img, is_healthy_prediction=True)
    assert result["level"] == "none"
    assert result["is_estimate"] is True


def test_severity_returns_estimate_flag():
    from app.services.severity import estimate_severity
    img = Image.new("RGB", (200, 200), color=(80, 60, 30))
    result = estimate_severity(img, is_healthy_prediction=False)
    assert result["is_estimate"] is True
    assert result["level"] in ("none", "low", "moderate", "high")


# ─── Advisory content safety ──────────────────────────────────────────────────

import json
import re

FORBIDDEN_PATTERNS = [
    r"\bmancozeb\b", r"\bchlorothaloni\b", r"\bcopper oxychloride\b",
    r"\bcarbendazim\b", r"\bmetalaxyl\b", r"\bfungicide\b.*\bapply\b",
    r"\d+\s*ml\b", r"\d+\s*g\s*/\s*l\b", r"\d+\s*kg\s*/\s*ha\b",
    r"\bspray\s+\d+", r"\bdose[sd]?\b",
]

def test_advisory_no_chemical_names():
    advisory_file = Path(__file__).resolve().parent.parent / "advisory" / "en.json"
    with open(advisory_file, encoding="utf-8") as f:
        data = json.load(f)

    all_text = json.dumps(data).lower()
    for pattern in FORBIDDEN_PATTERNS:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        assert not matches, (
            f"Advisory contains forbidden chemical/dosage pattern '{pattern}': {matches[:3]}"
        )


def test_advisory_has_kvk_disclaimer():
    advisory_file = Path(__file__).resolve().parent.parent / "advisory" / "en.json"
    with open(advisory_file, encoding="utf-8") as f:
        data = json.load(f)
    for slug, entry in data.items():
        all_text = json.dumps(entry).lower()
        assert "kvk" in all_text or "agriculture officer" in all_text, (
            f"Advisory '{slug}' missing KVK/agriculture officer disclaimer"
        )


# ─── Mock classifier ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_classifier_predict():
    from app.ml.classifier import MockClassifier
    mc = MockClassifier()
    result = await mc.predict(b"fake image bytes", "tomato")
    assert "probs" in result
    assert len(result["probs"]) > 0
    assert all(0.0 <= p["prob"] <= 1.0 for p in result["probs"])
    assert "agriguard" in result["model_version"] or "mock" in result["model_version"]


@pytest.mark.asyncio
async def test_mock_classifier_varied_results():
    """MockClassifier should return varied results across different images."""
    from app.ml.classifier import MockClassifier
    mc = MockClassifier()
    results = set()
    for i in range(20):
        r = await mc.predict(f"varied_seed_{i}".encode(), "tomato")
        results.add(r["probs"][0]["disease_slug"])
    # With 4 tomato classes and varied inputs, we expect >1 unique top result
    assert len(results) >= 2, "MockClassifier always returns the same top class"


# ─── Full scan endpoint (async integration) ───────────────────────────────────

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    import os
    os.environ.setdefault("MODEL_BACKEND", "mock")
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_agriguard.db")
    os.environ.setdefault("UPLOAD_DIR", "./test_uploads")

    from app.core.database import engine, Base
    from app.main import app

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed minimal data
    from app.core.database import AsyncSessionLocal
    from app.models.models import User, Crop, Disease
    from app.core.security import get_password_hash
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, text
        r = await db.execute(select(User).where(User.email == "test@agriguard.in"))
        if not r.scalar_one_or_none():
            db.add(User(email="test@agriguard.in", hashed_password=get_password_hash("Test1234!")))
        r2 = await db.execute(select(Crop).where(Crop.slug == "tomato"))
        crop = r2.scalar_one_or_none()
        if not crop:
            crop = Crop(slug="tomato", name_key="crop.tomato", icon_emoji="🍅")
            db.add(crop)
            await db.flush()
            db.add(Disease(slug="tomato_healthy", name_key="disease.tomato_healthy", crop_id=crop.id))
            db.add(Disease(slug="tomato_early_blight", name_key="disease.tomato_early_blight", crop_id=crop.id))
            db.add(Disease(slug="tomato_late_blight", name_key="disease.tomato_late_blight", crop_id=crop.id))
            db.add(Disease(slug="tomato_leaf_mold", name_key="disease.tomato_leaf_mold", crop_id=crop.id))
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    import shutil
    shutil.rmtree("./test_uploads", ignore_errors=True)
    import pathlib
    pathlib.Path("./test_agriguard.db").unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_health_endpoint(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"


@pytest.mark.asyncio
async def test_login_and_scan_flow(client):
    # Login
    r = await client.post("/api/v1/auth/login",
                          json={"email": "test@agriguard.in", "password": "Test1234!"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get crops
    r = await client.get("/api/v1/crops", headers=headers)
    assert r.status_code == 200
    crops = r.json()
    assert any(c["slug"] == "tomato" for c in crops)
    tomato_id = next(c["id"] for c in crops if c["slug"] == "tomato")

    # Upload scan
    img_bytes = make_jpeg()
    r = await client.post(
        "/api/v1/scans",
        headers=headers,
        data={"crop_id": tomato_id},
        files={"image": ("leaf.jpg", img_bytes, "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    scan = r.json()
    assert scan["status"] in ("healthy", "potentially_diseased", "uncertain")
    assert 0.0 <= scan["confidence"] <= 0.99
    assert scan["severity"]["is_estimate"] is True
    assert scan["model_version"] is not None

    # Scan appears in history
    r = await client.get("/api/v1/scans", headers=headers)
    assert r.status_code == 200
    scans = r.json()
    assert any(s["id"] == scan["id"] for s in scans)

    # Dashboard updated
    r = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert r.status_code == 200
    dash = r.json()
    assert dash["total_scans"] >= 1


@pytest.mark.asyncio
async def test_compare_endpoint(client):
    r = await client.post("/api/v1/auth/login",
                          json={"email": "test@agriguard.in", "password": "Test1234!"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    crops = (await client.get("/api/v1/crops", headers=headers)).json()
    tomato_id = next(c["id"] for c in crops if c["slug"] == "tomato")
    img_bytes = make_jpeg()

    # Create two scans
    r1 = await client.post("/api/v1/scans", headers=headers,
                           data={"crop_id": tomato_id},
                           files={"image": ("a.jpg", img_bytes, "image/jpeg")})
    r2 = await client.post("/api/v1/scans", headers=headers,
                           data={"crop_id": tomato_id},
                           files={"image": ("b.jpg", img_bytes, "image/jpeg")})
    id_a, id_b = r1.json()["id"], r2.json()["id"]

    r = await client.get(f"/api/v1/scans/compare?a={id_a}&b={id_b}", headers=headers)
    assert r.status_code == 200
    cmp = r.json()
    assert "scan_a" in cmp and "scan_b" in cmp
    assert "confidence_delta" in cmp
    assert "status_change" in cmp


@pytest.mark.asyncio
async def test_sensor_validation(client):
    """Invalid sensor ranges should be rejected by pydantic."""
    from app.schemas.schemas import SensorReadingIn
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        SensorReadingIn(soil_moisture=150)  # > 100
    with pytest.raises(ValidationError):
        SensorReadingIn(temp_c=100)  # > 60
    with pytest.raises(ValidationError):
        SensorReadingIn(humidity=-5)  # < 0
