"""
Smoke tests for the real ONNX leaf model (agriguard-leaf-v2).
They check behaviour, not accuracy: accuracy is measured separately on
held-out lab and field photos (see app/ml/weights/agriguard-leaf-v2.json).
"""
import asyncio
from pathlib import Path

import pytest
from PIL import Image

from app.ml.leaf_screen import screen_leaf
from app.ml.onnx_classifier import OnnxClassifier, apply_health_guard
from app.services.confidence import evaluate_confidence

BASE = Path(__file__).resolve().parents[1]
FIX = Path(__file__).resolve().parent / "fixtures"
MODEL = BASE / "app/ml/weights/agriguard-leaf-v2.onnx"
META = BASE / "app/ml/weights/agriguard-leaf-v2.json"

pytestmark = pytest.mark.skipif(not MODEL.exists(), reason="model weights not present")


@pytest.fixture(scope="module")
def clf():
    pytest.importorskip("onnxruntime")
    return OnnxClassifier(str(MODEL), str(META))


def _predict(clf, name, crop=None):
    return asyncio.run(clf.predict((FIX / name).read_bytes(), crop))


@pytest.mark.parametrize("name,crop", [("tomato_healthy.jpg", "tomato"), ("potato_healthy.jpg", "potato"), ("tomato_healthy.jpg", None)])
def test_healthy_leaf_is_reported_healthy(clf, name, crop):
    r = _predict(clf, name, crop)
    conf = evaluate_confidence(r["probs"])
    assert conf["status"] == "healthy", r["probs"][:3]


@pytest.mark.parametrize("name,crop,expected", [("tomato_early_blight.jpg", "tomato", "tomato_early_blight"), ("corn_common_rust.jpg", "corn", "corn_common_rust")])
def test_diseased_leaf_is_flagged(clf, name, crop, expected):
    r = _predict(clf, name, crop)
    assert r["probs"][0]["disease_slug"] == expected
    assert evaluate_confidence(r["probs"])["status"] == "potentially_diseased"


def test_auto_detects_crop(clf):
    r = _predict(clf, "corn_common_rust.jpg", None)
    assert r["detected_crop_slug"] == "corn"
    assert r["auto_detected_crop"] is True


def test_unsupported_crop_never_gets_a_guessed_disease(clf):
    r = _predict(clf, "potato_healthy.jpg", "banana")
    assert r.get("screen_only") is True
    assert all(p["disease_slug"] in ("banana_healthy", "__uncertain__") for p in r["probs"])
    # clean leaf -> "possible healthy", never a confident claim
    assert evaluate_confidence(r["probs"])["status"] in ("healthy", "uncertain")
    assert r["probs"][0]["prob"] < 0.80


def test_background_is_not_counted_as_disease():
    s = screen_leaf(Image.open(FIX / "grey_wall.jpg"))
    assert s["is_leaf"] is False
    healthy_leaf = screen_leaf(Image.open(FIX / "potato_healthy.jpg"))
    assert healthy_leaf["is_leaf"] is True and healthy_leaf["lesion_pct"] < 1.5


def test_health_guard_only_overrides_weak_disease_calls():
    clean = {"is_leaf": True, "lesion_pct": 0.3}
    weak = [{"disease_slug": "tomato_leaf_mold", "prob": 0.6}, {"disease_slug": "tomato_healthy", "prob": 0.3}, {"disease_slug": "tomato_late_blight", "prob": 0.1}]
    assert apply_health_guard(weak, clean)[0]["disease_slug"] == "tomato_healthy"
    strong = [{"disease_slug": "tomato_leaf_mold", "prob": 0.9}, {"disease_slug": "tomato_healthy", "prob": 0.1}]
    assert apply_health_guard(strong, clean)[0]["disease_slug"] == "tomato_leaf_mold"
    spotted = {"is_leaf": True, "lesion_pct": 6.0}
    assert apply_health_guard(weak, spotted)[0]["disease_slug"] == "tomato_leaf_mold"


def test_photo_without_a_leaf_is_not_sure(clf):
    r = _predict(clf, "grey_wall.jpg", None)
    assert evaluate_confidence(r["probs"])["status"] == "uncertain"
    r = _predict(clf, "grey_wall.jpg", "banana")
    assert evaluate_confidence(r["probs"])["status"] == "uncertain"


# ---- Photo check: only the crop in the photo, else ask for a retake ----
from app.ml.leaf_screen import photo_check


@pytest.mark.parametrize("name", ["tomato_healthy.jpg", "potato_healthy.jpg", "tomato_early_blight.jpg", "corn_common_rust.jpg"])
def test_clean_leaf_photos_pass_photo_check(name):
    c = photo_check(Image.open(FIX / name))
    assert c["ok"], c


def test_gloved_hand_and_paper_ask_for_retake():
    c = photo_check(Image.open(FIX / "gloved_hand_leaf.jpg"))
    assert not c["ok"]
    assert "objects" in c["issues"]


def test_bare_hand_asks_for_retake():
    # leaf held in a bare hand (synthetic): green leaf + skin-coloured area
    img = Image.open(FIX / "tomato_healthy.jpg").convert("RGB").resize((256, 256))
    hand = Image.new("RGB", (256, 90), (224, 172, 140))
    img.paste(hand, (0, 166))
    c = photo_check(img)
    assert "hand" in c["issues"], c


def test_photo_without_leaf_asks_for_retake():
    c = photo_check(Image.open(FIX / "grey_wall.jpg"))
    assert "no_leaf" in c["issues"]


def test_fruit_photo_passes_check():
    c = photo_check(Image.open(FIX / "tomato_fruit.jpg"))
    assert c["ok"], c


# ---- v2: more crops ----
@pytest.mark.parametrize("name,crop,expected", [("apple_scab.jpg", "apple", "apple_scab"), ("rice_brown_spot.jpg", "rice", "rice_brown_spot")])
def test_new_crops(clf, name, crop, expected):
    r = _predict(clf, name, crop)
    assert r["probs"][0]["disease_slug"] == expected, r["probs"][:3]


def test_rice_disease_is_never_a_confident_claim(clf):
    # no healthy rice photos in the training data -> at most "possible"
    r = _predict(clf, "rice_brown_spot.jpg", "rice")
    assert r["probs"][0]["prob"] <= 0.79


def test_new_crop_auto_detect(clf):
    r = _predict(clf, "apple_scab.jpg", None)
    assert r["detected_crop_slug"] == "apple"


# ---- produce brain: fruits / vegetables / tubers ----
def test_potato_tuber_is_identified_as_healthy_potato(clf):
    r = _predict(clf, "potato_tuber.jpg", None)
    assert r.get("produce") and r["detected_crop_slug"] == "potato", r
    assert r["probs"][0]["disease_slug"] == "potato_healthy", r["probs"]
    assert evaluate_confidence(r["probs"])["status"] == "healthy"


def test_damaged_potato_is_not_called_healthy(clf):
    r = _predict(clf, "potato_rot.jpg", None)
    assert r["detected_crop_slug"] == "potato"
    assert r["probs"][0]["disease_slug"] != "potato_healthy", r["probs"]


def test_tomato_fruit_pile_is_identified_as_tomato(clf):
    r = _predict(clf, "tomato_fruit.jpg", None)
    assert r.get("produce") and r["detected_crop_slug"] == "tomato", r
    assert r["probs"][0]["disease_slug"] == "tomato_healthy"


@pytest.mark.parametrize("name", ["tomato_healthy.jpg", "corn_common_rust.jpg", "apple_scab.jpg", "rice_brown_spot.jpg"])
def test_leaf_photos_go_to_leaf_ai(clf, name):
    r = _predict(clf, name, None)
    assert not r.get("produce"), r["probs"][:2]


def test_wall_is_still_not_sure(clf):
    r = _predict(clf, "grey_wall.jpg", None)
    assert evaluate_confidence(r["probs"])["status"] == "uncertain"
