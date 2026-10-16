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
        "leaf_frac": round(leaf_px / float(SIZE * SIZE), 3),
        "lesion_pct": lesion_pct,
    }


def photo_check(img: Image.Image) -> Dict[str, Any]:
    """
    Is this a clean close-up of the crop only? Runs BEFORE the AI.
    Flags a visible hand/person, gloves/paper/other objects, no leaf, or bad light,
    so the app asks for a retake instead of giving a diagnosis.
    Mirrored in frontend/lib/leafModel.ts (checkPhotoImage) — keep the two in sync.
    """
    a = np.asarray(img.convert("RGB").resize((SIZE, SIZE), Image.BILINEAR), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    green = (g > r * 1.05) & (g > b * 1.05) & (g > 45) & (sat > 0.15)
    near = _close(green, 4)
    for _ in range(3):
        near = _shift_max(near)
    bg = ~near

    y = 0.299 * r + 0.587 * g + 0.114 * b
    cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b
    skin = (y > 110) & (cr > 140) & (cr < 170) & (cb > 85) & (cb < 125) & (sat > 0.12) & (sat < 0.55) & (r > 150) & bg
    white = (mx > 215) & (sat < 0.10) & bg

    skin_f = float(skin.mean())
    white_f = float(white.mean())
    bg_f = float(bg.mean())
    bg_std = float(y[bg].std()) if bg.sum() > 50 else 0.0
    brightness = float(y.mean())
    green_f = float(green.mean())
    red_f = float(((r > 110) & (r > g * 1.6) & (r > b * 1.6) & (sat > 0.45)).mean())

    issues = []
    if brightness < 40:
        issues.append("too_dark")
    if brightness > 235:
        issues.append("too_bright")
    # Mostly red fruit and little leaf -> the AI checks leaves, not fruit
    if red_f > 0.2 and red_f > green_f:
        issues.append("fruit")
    elif green_f < 0.02:
        issues.append("no_leaf")
    if skin_f > 0.05:
        issues.append("hand")
    # A plain white/grey sheet behind the leaf is fine (white fills the even background).
    share = white_f / bg_f if bg_f > 0 else 0.0
    if white_f > 0.04 and 0.15 < share < 0.75 and bg_std > 40:
        issues.append("objects")
    return {
        "ok": not issues,
        "issues": issues,
        "stats": {
            "skin": round(skin_f, 3),
            "white": round(white_f, 3),
            "background": round(bg_f, 3),
            "bg_std": round(bg_std),
            "brightness": round(brightness),
            "green": round(green_f, 3),
        },
    }
