"""
Image quality checks before inference.
Rejects: non-images, >MAX_UPLOAD_MB, too dark, too bright, too blurry.
"""
from __future__ import annotations
import io
from typing import Tuple, Optional
from fastapi import HTTPException
import numpy as np
from PIL import Image
from app.core.config import get_settings

settings = get_settings()

BRIGHTNESS_LOW = 25
BRIGHTNESS_HIGH = 245
LAPLACIAN_THRESHOLD = 60


def _load_pil(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()  # raises if not valid image
        # Re-open after verify (verify consumes the stream)
        img = Image.open(io.BytesIO(data))
        return img
    except Exception:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_file", "message": "Please upload a valid image file (JPEG or PNG)."},
        )


def _brightness(img: Image.Image) -> float:
    gray = img.convert("L")
    arr = np.array(gray, dtype=np.float32)
    return float(arr.mean())


def _laplacian_variance(img: Image.Image) -> float:
    import cv2  # optional, fall back to numpy
    gray = np.array(img.convert("L"), dtype=np.uint8)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())


def check_quality(data: bytes) -> Image.Image:
    """
    Validates image quality. Returns PIL Image if OK, raises HTTPException otherwise.
    """
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "file_too_large",
                "message": f"Image must be under {settings.MAX_UPLOAD_MB} MB. Please compress or retake the photo.",
            },
        )

    img = _load_pil(data)
    img_rgb = img.convert("RGB")

    brightness = _brightness(img_rgb)
    if brightness < BRIGHTNESS_LOW:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "too_dark",
                "message": "The photo is too dark. Please retake in better lighting.",
            },
        )
    if brightness > BRIGHTNESS_HIGH:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "too_bright",
                "message": "The photo is overexposed. Please retake avoiding direct sunlight.",
            },
        )

    try:
        blur_score = _laplacian_variance(img_rgb)
        if blur_score < LAPLACIAN_THRESHOLD:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "too_blurry",
                    "message": "The photo is too blurry. Please hold steady and retake.",
                },
            )
    except ImportError:
        pass  # cv2 not available; skip blur check

    return img_rgb
