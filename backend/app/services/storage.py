"""
Storage backend: abstract interface + local filesystem implementation.
Swap to Supabase/S3 without changing callers.
"""
from __future__ import annotations
import abc
import os
import uuid
import io
from pathlib import Path
from PIL import Image
from app.core.config import get_settings

settings = get_settings()


class StorageBackend(abc.ABC):
    @abc.abstractmethod
    async def save(self, data: bytes, filename: str, content_type: str, folder: str = "") -> str:
        """Returns a publicly accessible URL."""
        ...

    @abc.abstractmethod
    async def save_thumb(self, data: bytes, filename: str, folder: str = "") -> str:
        ...


class LocalStorageBackend(StorageBackend):
    def __init__(self, upload_dir: str = "./uploads"):
        self.base = Path(upload_dir)
        self.base.mkdir(parents=True, exist_ok=True)
        (self.base / "thumbs").mkdir(exist_ok=True)

    async def save(self, data: bytes, filename: str, content_type: str = "image/jpeg", folder: str = "") -> str:
        target_dir = (self.base / folder) if folder else self.base
        target_dir.mkdir(parents=True, exist_ok=True)
        dest = target_dir / filename
        dest.write_bytes(data)
        rel_path = f"{folder}/{filename}".replace("\\", "/") if folder else filename
        return f"/uploads/{rel_path}"

    async def save_thumb(self, data: bytes, filename: str, folder: str = "") -> str:
        target_dir = (self.base / folder / "thumbs") if folder else (self.base / "thumbs")
        target_dir.mkdir(parents=True, exist_ok=True)
        dest = target_dir / filename
        # Generate 256px thumbnail
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img.thumbnail((256, 256))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=75)
        dest.write_bytes(buf.getvalue())
        rel_path = f"{folder}/thumbs/{filename}".replace("\\", "/") if folder else f"thumbs/{filename}"
        return f"/uploads/{rel_path}"


def get_storage() -> StorageBackend:
    backend = settings.STORAGE_BACKEND
    if backend == "local":
        return LocalStorageBackend(settings.UPLOAD_DIR)
    raise NotImplementedError(f"Storage backend '{backend}' not implemented")
