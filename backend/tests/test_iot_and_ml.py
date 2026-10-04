"""
Unit tests for IoT sensor endpoints, fake sensor generator, and ML metadata.
"""
import hashlib
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient, ASGITransport


def test_fake_sensor_reading_generator():
    from scripts.fake_sensor import generate_reading

    reading = generate_reading()
    assert 0.0 <= reading["soil_moisture"] <= 100.0
    assert -10.0 <= reading["temp_c"] <= 60.0
    assert 0.0 <= reading["humidity"] <= 100.0
    assert "recorded_at" in reading

    # Test with simulated timestamp
    ts = datetime(2026, 9, 30, 14, 0, 0, tzinfo=timezone.utc)
    reading_day = generate_reading(ts)
    assert 10.0 <= reading_day["temp_c"] <= 50.0


@pytest.fixture
async def client_with_db():
    import os
    os.environ["MODEL_BACKEND"] = "mock"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_agriguard_iot.db"

    from app.core.database import engine, Base, AsyncSessionLocal
    from app.main import app
    from app.models.models import User, Device
    from app.core.security import get_password_hash

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo user and demo device
    async with AsyncSessionLocal() as db:
        user = User(email="iot_user@agriguard.in", hashed_password=get_password_hash("Test1234!"))
        db.add(user)

        demo_key = "test-device-secret-key"
        key_hash = hashlib.sha256(demo_key.encode()).hexdigest()
        device = Device(name="Test-ESP32", key_hash=key_hash, is_active=True)
        db.add(device)
        await db.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    import pathlib
    pathlib.Path("./test_agriguard_iot.db").unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_sensor_post_and_auth(client_with_db):
    client = client_with_db

    # 1. Reject without key
    r = await client.post("/api/v1/sensors/readings", json={"soil_moisture": 50, "temp_c": 25, "humidity": 60})
    assert r.status_code == 422  # Missing header

    # 2. Reject with invalid key
    r = await client.post(
        "/api/v1/sensors/readings",
        json={"soil_moisture": 50, "temp_c": 25, "humidity": 60},
        headers={"X-Device-Key": "wrong-key"}
    )
    assert r.status_code == 403

    # 3. Accept with correct key
    r = await client.post(
        "/api/v1/sensors/readings",
        json={"soil_moisture": 62.5, "temp_c": 27.3, "humidity": 78.0},
        headers={"X-Device-Key": "test-device-secret-key"}
    )
    assert r.status_code == 200
    data = r.json()
    assert data["soil_moisture"] == 62.5
    assert data["temp_c"] == 27.3
    assert data["humidity"] == 78.0


@pytest.mark.asyncio
async def test_sensor_latest_and_context_hint(client_with_db):
    client = client_with_db

    # Login to view /sensors/latest
    r_login = await client.post("/api/v1/auth/login", json={"email": "iot_user@agriguard.in", "password": "Test1234!"})
    token = r_login.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Before any readings
    r = await client.get("/api/v1/sensors/latest", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["latest"] is None

    # Post high humidity reading
    await client.post(
        "/api/v1/sensors/readings",
        json={"soil_moisture": 75.0, "temp_c": 20.0, "humidity": 82.0},
        headers={"X-Device-Key": "test-device-secret-key"}
    )

    # Now verify latest and context hints
    r2 = await client.get("/api/v1/sensors/latest", headers=auth_headers)
    assert r2.status_code == 200
    body = r2.json()
    assert body["latest"] is not None
    assert body["latest"]["humidity"] == 82.0
    assert body["context_hint"] is not None
    assert "High humidity" in body["context_hint"]
    assert len(body["series"]) >= 1


def test_advisory_tamil_fallback():
    """Verify that Tamil advisory translations or fallback keys load cleanly."""
    import json
    from pathlib import Path
    advisory_dir = Path(__file__).resolve().parent.parent / "advisory"
    with open(advisory_dir / "ta.json", encoding="utf-8") as f:
        ta_data = json.load(f)
    with open(advisory_dir / "en.json", encoding="utf-8") as f:
        en_data = json.load(f)

    for key in en_data:
        assert key in ta_data, f"Missing Tamil entry for {key}"
        assert "name" in ta_data[key]
        assert "symptoms" in ta_data[key]
        assert "management" in ta_data[key]
