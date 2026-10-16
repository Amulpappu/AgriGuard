"""
Leaf-only colour screen.

Separates plant tissue from the background (soil, concrete, pots, dark night
backgrounds, sky) and measures how much of the LEAF area shows yellowing,
browning or dark dead tissue. Background pixels are never counted as disease.

Mirrored in frontend/lib/leafModel.ts (screenLeaf) — keep the two in sync.
"""
from __future__ import annotations

from typing import Any, Dict

import numpy as np
from PIL import Image

SIZE = 128


def _shift_max(m: np.ndarray) -> np.ndarray:
    out = m.copy()
    out[1:, :] |= m[:-1, :]
    out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    return out


def _shift_min(m: np.ndarray) -> np.ndarray:
    out = m.copy()
    out[1:, :] &= m[:-1, :]
    out[:-1, :] &= m[1:, :]
    out[:, 1:] &= m[:, :-1]
    out[:, :-1] &= m[:, 1:]
    return out


def _close(m: np.ndarray, n: int = 4) -> np.ndarray:
    for _ in range(n):
        m = _shift_max(m)
    for _ in range(n):
        m = _shift_min(m)
    return m


def screen_leaf(img: Image.Image) -> Dict[str, Any]:
    a = np.asarray(img.convert("RGB").resize((SIZE, SIZE), Image.BILINEAR), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

    # Healthy green tissue: green clearly dominant, not too dark
    green = (g > r * 1.05) & (g > b * 1.05) & (g > 45) & (sat > 0.15)
    green_frac = float(green.mean())
    # plant tissue incl. yellow-green leaves (rice, maize) - used only to decide "is there a leaf"
    plant_frac = float((green | ((g >= r * 0.9) & (g > b * 1.25) & (g > 60) & (sat > 0.2))).mean())

    # Leaf region = green tissue with small holes (spots/lesions) closed in.
    leaf = _close(green, 4)
    # Symptom colours inside the leaf region only
    yellow = (r > 110) & (g > 100) & (b < 0.75 * g) & (np.abs(r - g) < 60) & ~green
    brown = (r > 60) & (r > g * 1.08) & (g > b) & (mx < 200) & ~green
    dead = (mx < 70) & (sat < 0.45)  # dark necrotic tissue
    lesion = leaf & ~green & (yellow | brown | dead)

    leaf_px = int(leaf.sum())
    is_leaf = green_frac >= 0.08 and leaf_px >= 400
    lesion_pct = round(100.0 * float(lesion.sum()) / leaf_px, 2) if leaf_px else None
    return {
        "is_leaf": bool(is_leaf),
        "green_frac": round(green_frac, 3),
        "plant_frac": round(plant_frac, 3),
        # ripe red fruit (tomato, chilli, apple): photo of fruit, not leaf
        "red_frac": round(float(((r > 110) & (r > g * 1.6) & (r > b * 1.6) & (sat > 0.45)).mean()), 3),
        "leaf_frac": round(leaf_px / float(SIZE * SIZE), 3),
        "lesion_pct": lesion_pct,
    }


def photo_check(img: Image.Image) -> Dict[str, Any]:
    """
    Checks whether a photo has foreign objects or fails to cover the crop. Runs BEFORE the AI.
    Flags ONLY:
      1. Multiple objects: bare hands/fingers ('hand'), gloves/paper/clipboard/tools ('objects')
      2. Crop did not cover correctly: no crop/plant detected ('no_leaf'), or pitch black ('too_dark')
    Otherwise: NO RETAKE. Leaves (healthy or diseased/yellow/brown) and fruits/crops pass cleanly.
    Mirrored in frontend/lib/leafModel.ts (checkPhotoImage) — keep the two in sync.
    """
    a = np.asarray(img.convert("RGB").resize((SIZE, SIZE), Image.BILINEAR), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

    y = 0.299 * r + 0.587 * g + 0.114 * b
    cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b

    # Bare human skin detector
    is_skin = (y > 100) & (cr > 140) & (cr < 170) & (cb > 85) & (cb < 125) & (sat > 0.12) & (sat < 0.55) & (r > 140)

    # Broad crop detection: green, yellow-green, chlorotic yellow, brown/rust, or fruit/vegetable (excluding bare skin)
    green = ((g > r * 1.05) & (g > b * 1.05) & (g > 40) & (sat > 0.12)) | (
        (g >= r * 0.88) & (g > b * 1.2) & (g > 50) & (sat > 0.15)
    )
    yellow = (r > 80) & (g > 75) & (b < 0.85 * g) & (sat > 0.18) & ~is_skin
    brown = (r > 55) & (r > g * 1.05) & (g > b * 0.95) & (sat > 0.12) & (mx < 225) & ~is_skin
    fruit = (r > 80) & (r > g * 1.2) & (r > b * 1.2) & (sat > 0.25) & ~is_skin
    crop = green | yellow | brown | fruit

    near = _close(crop, 4)
    for _ in range(3):
        near = _shift_max(near)
    bg = ~near

    # Skin in background outside the crop
    skin = is_skin & bg
    # Man-made white/grey objects (gloves, paper, lab coat, tools) in background
    white = (mx > 215) & (sat < 0.10) & bg

    skin_f = float(skin.mean())
    white_f = float(white.mean())
    bg_f = float(bg.mean())
    bg_std = float(y[bg].std()) if bg.sum() > 50 else 0.0
    brightness = float(y.mean())
    crop_f = float(crop.mean())

    issues = []
    # 1. Multiple objects / foreign items:
    if skin_f > 0.05:
        issues.append("hand")
    share = white_f / bg_f if bg_f > 0 else 0.0
    if white_f > 0.04 and 0.15 < share < 0.85 and bg_std > 35:
        issues.append("objects")

    # 2. Crop did not cover correctly (empty scene, blank wall, or pitch black):
    if crop_f < 0.03:
        issues.append("no_leaf")
    if brightness < 20:
        issues.append("too_dark")

    return {
        "ok": not issues,
        "issues": issues,
        "stats": {
            "skin": round(skin_f, 3),
            "white": round(white_f, 3),
            "background": round(bg_f, 3),
            "bg_std": round(bg_std),
            "brightness": round(brightness),
            "green": round(float(green.mean()), 3),
            "crop": round(crop_f, 3),
        },
    }


def surface_screen(img: Image.Image) -> Dict[str, Any]:
    """
    For photos of fruits, tubers or vegetables (not leaves). The leaf AI cannot judge these,
    so only the surface is checked: share of dark brown/black rot or spots inside the produce.
    This is a colour check, not a diagnosis. Mirrored in frontend/lib/leafModel.ts (surfaceScreen).
    """
    a = np.asarray(img.convert("RGB").resize((SIZE, SIZE), Image.BILINEAR), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    # dark brown/black rot or spots (dark-red shadows between fruits are excluded)
    rot = (mx > 25) & (mx < 95) & (g > r * 0.45) & (r >= b) & (sat > 0.2)
    produce = ((sat > 0.22) & (mx > 70)) | rot
    region = _close(produce, 4)
    px = int(region.sum())
    return {
        "produce_frac": round(px / float(SIZE * SIZE), 3),
        "blemish_pct": round(100.0 * float((region & rot).sum()) / px, 2) if px else None,
    }
