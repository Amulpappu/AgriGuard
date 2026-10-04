from __future__ import annotations
from functools import lru_cache
from typing import List
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-32-chars-agriguard"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = "sqlite+aiosqlite:///" + str(
        Path(__file__).resolve().parent.parent.parent / "agriguard.db"
    ).replace("\\", "/")

    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = str(
        Path(__file__).resolve().parent.parent.parent / "uploads"
    ).replace("\\", "/")
    MAX_UPLOAD_MB: int = 8

    MODEL_BACKEND: str = "mock"
    MODEL_PATH: str = "app/ml/weights/model.pt"
    MODEL_META_PATH: str = "app/ml/weights/model_meta.json"

    CONF_CONFIDENT: float = 0.80
    CONF_POSSIBLE: float = 0.55
    CONF_MARGIN: float = 0.15

    SEVERITY_LOW: float = 10.0
    SEVERITY_MODERATE: float = 30.0

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    DEVICE_KEY_HASH: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
