"""
OnnxClassifier — real image model for AgriGuard.

Model: MobileNetV2 (ImageNet features, ONNX Model Zoo, Apache-2.0) with a
classification head trained on PlantVillage (CC BY-SA 3.0) and PlantDoc
field photos (CC BY 4.0). Files:
    app/ml/weights/agriguard-leaf-v1.onnx   (logits for every class)
    app/ml/weights/agriguard-leaf-v1.json   (classes, crops, preprocessing, metrics)

The same two files are served to the browser (frontend/public/models/) so the
website and the laptop backend give identical results.

Crops covered by the model: listed in the .json file ("crops").
Crops in "crops_without_healthy_class" (rice) were trained on diseased leaves only:
a clean leaf is judged by the colour screen, and a disease is only ever "possible".
For any other crop the adapter does NOT guess a disease: it returns a
colour-based "no visible problem" / "uncertain" screen (see leaf_screen.py).
"""
from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image, ImageOps

from app.ml.classifier import ModelAdapter, classify_condition_type
from app.ml.leaf_screen import screen_leaf

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _preprocess(img: Image.Image, size: int = 224, resize: int = 256) -> np.ndarray:
    img = ImageOps.exif_transpose(img).convert("RGB")
    w, h = img.size
    s = resize / min(w, h)
    img = img.resize((max(size, round(w * s)), max(size, round(h * s))), Image.BILINEAR)
    w, h = img.size
    left, top = (w - size) // 2, (h - size) // 2
    img = img.crop((left, top, left + size, top + size))
    arr = (np.asarray(img, dtype=np.float32) / 255.0 - _MEAN) / _STD
    return arr.transpose(2, 0, 1)[None, ...]


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


class OnnxClassifier(ModelAdapter):
    def __init__(self, model_path: str, meta_path: str):
        import onnxruntime as ort  # imported lazily so tests run without it

        self._meta: Dict[str, Any] = json.loads(Path(meta_path).read_text(encoding="utf-8"))
        self._classes: List[str] = self._meta["classes"]
        self._crops: List[str] = self._meta["crops"]
        self._no_healthy: List[str] = self._meta.get("crops_without_healthy_class", [])
        self._version = self._meta.get("version", "agriguard-leaf-v1")
        self._session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self._input = self._session.get_inputs()[0].name

    @property
    def version(self) -> str:
        return self._version

    @property
    def supported_crops(self) -> List[str]:
        return list(self._crops)

    def _probs(self, img: Image.Image) -> np.ndarray:
        logits = self._session.run(None, {self._input: _preprocess(img)})[0][0]
        return _softmax(logits.astype(np.float64))

    async def predict(self, image_bytes: bytes, crop_id: Optional[str] = None) -> Dict[str, Any]:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        screen = screen_leaf(img)
        crop = crop_id if crop_id and crop_id not in ("auto", "none", "null") else None

        # Crop not covered by the trained model -> colour screen only, never a guessed disease.
        if crop and crop not in self._crops:
            if not_a_leaf(screen, 0.0):
                return not_a_leaf_result(crop, screen, self._version, auto_detected=False)
            return screen_only_result(crop, screen, self._version, auto_detected=False)

        p = self._probs(img)
        if not_a_leaf(screen, float(p.max())):
            return not_a_leaf_result(crop, screen, self._version, auto_detected=crop is None)
        auto_detected = crop is None
        if crop is None:
            crop_scores = {c: float(sum(p[i] for i, k in enumerate(self._classes) if k.startswith(c + "_"))) for c in self._crops}
            other = float(p[self._classes.index("other_leaf")]) if "other_leaf" in self._classes else 0.0
            crop, crop_conf = max(crop_scores.items(), key=lambda kv: kv[1])
            if other > crop_conf or crop_conf < 0.5:
                # Leaf of a crop the model does not know: do not force it into tomato/potato/etc.
                return screen_only_result(None, screen, self._version, auto_detected=True)

        if crop in self._no_healthy and screen.get("is_leaf") and (screen.get("lesion_pct") or 0) < 1.5:
            # No healthy class for this crop: a clean leaf is reported by the colour screen
            return screen_only_result(crop, screen, self._version, auto_detected=auto_detected)

        idx = [i for i, k in enumerate(self._classes) if k.startswith(crop + "_")]
        sub = np.array([p[i] for i in idx])
        sub = sub / sub.sum()
        probs = sorted(
            ({"disease_slug": self._classes[i], "prob": float(q)} for i, q in zip(idx, sub)),
            key=lambda x: x["prob"],
            reverse=True,
        )
        probs = apply_health_guard(probs, screen)
        if crop in self._no_healthy and probs[0]["prob"] > 0.79:
            probs[0] = {**probs[0], "prob": 0.79}  # never a confident claim without a healthy class
        return {
            "probs": probs,
            "model_version": self._version,
            "detected_crop_slug": crop,
            "auto_detected_crop": auto_detected,
            "condition_type": classify_condition_type(probs[0]["disease_slug"]),
            "leaf_screen": screen,
        }


def not_a_leaf(screen: Dict[str, Any], top_prob: float) -> bool:
    """No plant tissue in the photo (wall, soil, sky, hand): never return a crop result."""
    plant = screen.get("plant_frac", screen.get("green_frac", 0))
    if plant < 0.02:
        return True
    return not screen.get("is_leaf") and plant < 0.08 and top_prob < 0.80


def not_a_leaf_result(crop: Optional[str], screen: Dict[str, Any], version: str, auto_detected: bool) -> Dict[str, Any]:
    return {
        "probs": [{"disease_slug": "__uncertain__", "prob": 1.0}],
        "model_version": version,
        "detected_crop_slug": crop,
        "auto_detected_crop": auto_detected,
        "condition_type": "uncertain",
        "leaf_screen": screen,
        "not_a_leaf": True,
    }


def apply_health_guard(probs: List[Dict[str, Any]], screen: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Guard against false disease calls on clean leaves.
    If the model's disease call is weak (< 0.80) but the leaf pixels show almost no
    lesion or yellowing (< 1.5 % of leaf area), shift weight to 'healthy'.
    Strong disease calls are never overridden, so early infections the model sees
    clearly are still reported.
    """
    if not probs or "healthy" in probs[0]["disease_slug"]:
        return probs
    healthy = next((p for p in probs if "healthy" in p["disease_slug"]), None)
    lesion = screen.get("lesion_pct")
    if healthy is None or lesion is None or not screen.get("is_leaf"):
        return probs
    if probs[0]["prob"] < 0.80 and lesion < 1.5:
        top_slug = probs[0]["disease_slug"]
        boost = probs[0]["prob"] * 0.5
        probs = [dict(p) for p in probs]
        for p in probs:
            if p["disease_slug"] == healthy["disease_slug"]:
                p["prob"] += boost
            elif p["disease_slug"] == top_slug:
                p["prob"] -= boost
        probs.sort(key=lambda x: x["prob"], reverse=True)
    return probs


def screen_only_result(crop: Optional[str], screen: Dict[str, Any], version: str, auto_detected: bool) -> Dict[str, Any]:
    """
    Result for crops the model does not cover. Only two honest outcomes:
    - clean leaf (lesion < 3 %) -> '<crop>_healthy' with confidence from the colour screen
    - anything else -> uncertain (no disease named), so the farmer is referred to a KVK.
    """
    slug_crop = crop or "unknown"
    if screen.get("is_leaf") and screen.get("lesion_pct") is not None and screen["lesion_pct"] < 3.0:
        conf = 0.75 if screen["lesion_pct"] < 1.0 else 0.60
        probs = [{"disease_slug": f"{slug_crop}_healthy", "prob": conf}, {"disease_slug": "__uncertain__", "prob": 1 - conf}]
    else:
        probs = [{"disease_slug": "__uncertain__", "prob": 0.5}, {"disease_slug": f"{slug_crop}_healthy", "prob": 0.5}]
    return {
        "probs": probs,
        "model_version": f"{version}+colour-screen",
        "detected_crop_slug": crop,
        "auto_detected_crop": auto_detected,
        "condition_type": "healthy" if probs[0]["disease_slug"].endswith("_healthy") else "disease",
        "leaf_screen": screen,
        "screen_only": True,
    }
