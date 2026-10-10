"""
Admin endpoints must be reachable only with a Supabase session for the admin
email carrying app_metadata.role = "admin". Supabase verification is stubbed.
"""
import pytest
from httpx import AsyncClient, ASGITransport

ADMIN_URL = "/api/v1/admin/db/provider"
ADMIN_EMAIL = "lohithgamer12@gmail.com"


def sb_user(email, role=None, confirmed=True):
    return {
        "id": "00000000-0000-4000-8000-0000000000aa" if email == ADMIN_EMAIL else "00000000-0000-4000-8000-0000000000bb",
        "email": email,
        "email_confirmed_at": "2026-10-10T00:00:00Z" if confirmed else None,
        "app_metadata": {"role": role} if role else {},
        "user_metadata": {},
    }


@pytest.fixture
async def client(monkeypatch):
    import os
    os.environ.setdefault("MODEL_BACKEND", "mock")
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_agriguard.db")
    os.environ.setdefault("UPLOAD_DIR", "./test_uploads")

    from app.core.database import engine, Base, AsyncSessionLocal
    from app.main import app
    from app.models.models import User
    from app.core.security import get_password_hash
    from sqlalchemy import select
    import app.api.deps as deps

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        if not r.scalar_one_or_none():
            db.add(User(email=ADMIN_EMAIL, hashed_password=get_password_hash("Real-Pass-9!"), full_name="LOHITH"))
        await db.commit()

    tokens = {
        "tok-admin": sb_user(ADMIN_EMAIL, role="admin"),
        "tok-admin-no-role": sb_user(ADMIN_EMAIL),
        "tok-admin-unconfirmed": sb_user(ADMIN_EMAIL, role="admin", confirmed=False),
        "tok-farmer": sb_user("lohith.farmer@example.com", role="admin"),
    }

    async def fake_verify(token):
        return tokens.get(token)

    monkeypatch.setattr(deps, "verify_supabase_token", fake_verify)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


async def test_admin_requires_token(client):
    assert (await client.get(ADMIN_URL)).status_code == 401


@pytest.mark.parametrize("passkey", ["lohith", "lohith123", "lohith2026", "lohith@agriguard"])
async def test_legacy_passkeys_rejected(client, passkey):
    assert (await client.get(ADMIN_URL, headers=auth(passkey))).status_code == 401


async def test_passkey_verify_endpoint_removed(client):
    r = await client.post("/api/v1/admin/auth/verify", json={"passkey": "lohith"})
    assert r.status_code in (404, 405)


async def test_local_jwt_for_admin_email_rejected(client):
    r = await client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": "Real-Pass-9!"})
    assert r.status_code == 200
    local_token = r.json()["access_token"]
    assert (await client.get(ADMIN_URL, headers=auth(local_token))).status_code == 401


async def test_backdoor_password_rejected(client):
    r = await client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": "lohith123"})
    assert r.status_code == 401


@pytest.mark.parametrize("token", ["tok-admin-no-role", "tok-admin-unconfirmed", "tok-farmer"])
async def test_non_admin_supabase_users_forbidden(client, token):
    assert (await client.get(ADMIN_URL, headers=auth(token))).status_code == 403


async def test_admin_supabase_session_allowed(client):
    r = await client.get(ADMIN_URL, headers=auth("tok-admin"))
    assert r.status_code not in (401, 403)
