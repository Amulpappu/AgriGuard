"""
AgriGuard FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import get_settings
from app.core.database import engine, Base
from app.api import auth, crops, scans, dashboard, advisory, sensors, health, admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agriguard")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (idempotent)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"AgriGuard started | MODEL_BACKEND={settings.MODEL_BACKEND}")
    yield
    await engine.dispose()


app = FastAPI(
    title="AgriGuard API",
    description="AI-assisted crop disease screening for Indian smallholder farmers",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

# Routers
PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(crops.router, prefix=PREFIX)
app.include_router(scans.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(advisory.router, prefix=PREFIX)
app.include_router(sensors.router, prefix=PREFIX)
app.include_router(health.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
