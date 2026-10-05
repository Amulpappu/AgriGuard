"""
Classical CV severity estimation using HSV colour segmentation.
Always returns is_estimate: True — this is NOT a clinical measurement.
Thresholds from config.
"""
from __future__ import annotations
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image
from app.core.config import get_settings

settings = get_settings()


def _pil_to_hsv(img: Image.Image) -> np.ndarray:
    rgb = np.array(img.convert("RGB"), dtype=np.uint8)
    try:
        import cv2
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)  # type: ignore
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)  # type: ignore
        return hsv
    except ImportError:
        # Fallback: simple numpy HSV
        r, g, b = rgb[..., 0] / 255.0, rgb[..., 1] / 255.0, rgb[..., 2] / 255.0
        cmax = np.maximum(np.maximum(r, g), b)
        cmin = np.minimum(np.minimum(r, g), b)
        delta = cmax - cmin
        h = np.zeros_like(cmax)
        mask = delta != 0
        # simplified hue
        h[mask & (cmax == r)] = 60 * (((g - b) / delta) % 6)[mask & (cmax == r)]
        h[mask & (cmax == g)] = 60 * ((b - r) / delta + 2)[mask & (cmax == g)]
        h[mask & (cmax == b)] = 60 * ((r - g) / delta + 4)[mask & (cmax == b)]
        s = np.where(cmax == 0, 0, delta / cmax)
        v = cmax
        # pack as uint8
        hsv = np.stack([h / 2, s * 255, v * 255], axis=-1).astype(np.uint8)
        return hsv


def _leaf_mask(hsv: np.ndarray) -> np.ndarray:
    """Green-range HSV mask for leaf pixels."""
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # Green hue range in OpenCV HSV (0-180 scale)
    green = (h >= 25) & (h <= 85) & (s >= 40) & (v >= 30)
    return green.astype(np.uint8)


def _lesion_mask(hsv: np.ndarray, leaf: np.ndarray) -> np.ndarray:
    """Brown/yellow/dark spots inside the leaf area."""
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # Brown/yellow hue, medium saturation, not too dark
    brown_yellow = (h >= 5) & (h <= 30) & (s >= 50) & (v >= 30)
    # Dark patches (necrosis)
    dark = (v < 60) & (s < 80)
    lesion = (brown_yellow | dark) & (leaf > 0)
    return lesion.astype(np.uint8)


def estimate_severity(img: Image.Image, is_healthy_prediction: bool) -> Dict[str, Any]:
    """
    Returns {"level": str, "affected_pct": float|None, "is_estimate": True}
    """
    if is_healthy_prediction:
        return {"level": "none", "affected_pct": 0.0, "is_estimate": True}

    try:
        hsv = _pil_to_hsv(img)
        leaf = _leaf_mask(hsv)
        leaf_px = int(leaf.sum())

        if leaf_px < 100:
            # Not enough green pixels — can't estimate
            return {"level": "low", "affected_pct": None, "is_estimate": True}

        lesion = _lesion_mask(hsv, leaf)
        lesion_px = int(lesion.sum())
        affected_pct = (lesion_px / leaf_px) * 100.0

        low_thresh = settings.SEVERITY_LOW
        mod_thresh = settings.SEVERITY_MODERATE

        if affected_pct < low_thresh:
            level = "low"
        elif affected_pct < mod_thresh:
            level = "moderate"
        else:
            level = "high"

        return {"level": level, "affected_pct": round(affected_pct, 1), "is_estimate": True}

    except Exception:
        return {"level": "low", "affected_pct": None, "is_estimate": True}
