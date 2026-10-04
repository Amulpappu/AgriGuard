"""
Confidence policy: maps raw top-1 probability + margin -> status string.
Thresholds loaded from env so they can be tuned without code changes.
"""
from __future__ import annotations
from typing import List, Dict, Any
from app.core.config import get_settings

settings = get_settings()


def evaluate_confidence(probs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    probs: sorted list [{disease_slug, prob}, ...]

    Returns:
        {
            status: "healthy" | "potentially_diseased" | "uncertain",
            low_confidence: bool,
            confidence: float (capped at 0.99),
            top1_slug: str,
            top3: [...],
        }
    """
    if not probs:
        return {"status": "uncertain", "low_confidence": True, "confidence": 0.0, "top3": []}

    top1 = probs[0]
    top1_prob = min(top1["prob"], 0.99)
    top2_prob = probs[1]["prob"] if len(probs) > 1 else 0.0
    margin = top1_prob - top2_prob

    top3 = probs[:3]

    conf_confident = settings.CONF_CONFIDENT
    conf_possible = settings.CONF_POSSIBLE
    conf_margin = settings.CONF_MARGIN

    low_confidence = False
    slug = top1["disease_slug"]

    if top1_prob >= conf_confident and margin >= conf_margin:
        # High confidence
        is_healthy = "healthy" in slug
        status = "healthy" if is_healthy else "potentially_diseased"
        top1_slug = slug
    elif top1_prob >= conf_possible and margin >= conf_margin:
        # Possible
        is_healthy = "healthy" in slug
        status = "healthy" if is_healthy else "potentially_diseased"
        low_confidence = True
        top1_slug = slug
    else:
        # Uncertain — do NOT name a disease
        status = "uncertain"
        low_confidence = True
        top1_slug = "__uncertain__"

    # Top 3 must contain only real disease/healthy classes — NEVER __uncertain__
    clean_top3 = [
        {"disease_slug": p["disease_slug"], "prob": p["prob"]}
        for p in probs[:3]
        if p.get("disease_slug") != "__uncertain__"
    ]

    return {
        "status": status,
        "low_confidence": low_confidence,
        "confidence": top1_prob,
        "top1_slug": top1_slug,
        "top3": clean_top3,
    }
