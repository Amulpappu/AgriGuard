# AgriGuard leaf model

How the model in `app/ml/weights/` and `frontend/public/models/` was built.
Current version: **agriguard-leaf-v2** (16 Oct 2026). v1 scripts: `extract.py`, `train_mlp_and_export.py`, `policy_eval.py`.

## v2 – 14 crops, 42 classes
Crops: apple, cherry, corn, cotton, grape, orange, peach, pepper/chilli, potato, rice, soybean, squash, strawberry, tomato.

1. Data (downloaded with git):
   - PlantVillage (`github.com/spMohanty/PlantVillage-Dataset`, CC BY-SA 3.0) – lab photos, all 14 PlantVillage crops. Blueberry and raspberry are used as `other_leaf` so unknown crops are not forced into a known one.
   - PlantDoc (`github.com/pratikkayal/PlantDoc-Dataset`, CC BY 4.0) – real field photos; its test split is never used for training.
   - Rice Leaf Diseases (UCI ML Repository #486, India, CC BY 4.0; copy at `github.com/PawarMukesh/RiceLeaf-Disease-Detector`) – bacterial leaf blight, brown spot, leaf smut. No healthy rice photos, so rice is listed in `crops_without_healthy_class`: a clean rice leaf is judged by the colour screen and a rice disease is only ever "possible" (max 79%).
   - Cotton disease photos collected in India by Akash Zade (copy at `github.com/auchinto-c/Cotton-Disease-Prediction`) – fresh vs diseased leaves/plants. **Licence not stated by the author: research/prototype use only; replace with a licensed or own dataset before commercial use.** Disease type is not identified (one "cotton leaf disease" class).
2. Backbone: MobileNetV2-12 from the ONNX Model Zoo (Apache-2.0), frozen.
3. `extract_v2.py` → `train_v2.py 0.03 --export` → `policy_v2.py` (paths at the top of each script).

## Results (v2)
| Test set | Correct disease (crop selected) |
| --- | --- |
| PlantVillage lab hold-out, 3,600 photos, 14 crops | 96.3% (crop auto-detect 98.8%) |
| PlantDoc field test, 218 photos | 71.6% |
| PlantDoc field test, original 5 crops (148 photos) | 60.8% (v1: 61.5%) |
| Rice hold-out, 30 photos (diseased only) | 73.3% |
| Cotton validation, 324 photos (same collection – optimistic) | 96.9% |

Field healthy leaves (72): 67 healthy, 2 uncertain, 3 called diseased. Field diseased leaves (140): 125 flagged, 7 uncertain, 8 called healthy.
The field test sets are small. Before quoting accuracy, collect 30–50 of your own labelled leaf photos per class and re-run the evaluation.
Next: own photos of Indian field crops (rice, cotton, chilli, brinjal, banana), and fine-tuning the whole network on a GPU.

## v2.1 – produce brain (fruits, vegetables, potato tubers) – 16 Oct 2026
Two extra heads on the same MobileNetV2 features, inside the same ONNX file (outputs `pid_logits`, `pcond_logits`):
- **Identity** (26 classes): 25 fruits/vegetables (potato, tomato, onion, chilli/pepper, brinjal, banana, mango, ...) + `leaf`. `leaf` routes the photo to the leaf-disease AI.
- **Condition** (7 classes): fresh, rotten, and potato tuber diseases (black scurf, blackleg, common scab, dry rot, pink rot). Non-potato produce uses fresh vs rotten only.

Reference photos: Fruits-360 (CC BY-SA 4.0, studio photos pasted on varied backgrounds + synthetic piles with leaf clutter), fresh/rotten apples-bananas-oranges (Kaggle sriramr; licence not stated), potato tuber disease photos (Mukaffi28/Potato-Disease, MIT, BARI-validated), real greenhouse tomatoes cut from labelled boxes (Daric-Weng/CFD-DETR-Dataset subset; licence not stated). Unlicensed sets: prototype use only.
Scripts: `extract_produce.py`, `extract_piles.py`, `extract_realtom.py`, `train_produce.py --export` (uses `produce_map.json`).

| Test | Result |
| --- | --- |
| Crop identity – studio test photos (1,526) | 93.9% |
| Crop identity – real fresh/rotten photos (480) | 99.6% |
| Crop identity – real greenhouse tomatoes (265) | 100% |
| Leaf photos routed to the leaf AI (666 field/lab leaves) | 665 / 666 |
| Fresh vs rotten – real photos (apple/banana/orange, 480) | 99.2% |
| Potato tuber condition, 6 classes (60 photos) | 68.3% – small dataset |

Limits: no tomato-fruit disease photos were available, so tomato and other produce get fresh vs rotten (rot learned from apples, bananas and oranges), not a named fruit disease.
