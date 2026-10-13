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
