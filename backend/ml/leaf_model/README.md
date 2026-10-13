# AgriGuard leaf model (agriguard-leaf-v1)

How the model in `app/ml/weights/` and `frontend/public/models/` was built.

1. Data (downloaded with git):
   - PlantVillage (`github.com/spMohanty/PlantVillage-Dataset`, CC BY-SA 3.0) — lab photos, 23 classes for tomato, potato, pepper, corn, grape.
   - PlantDoc (`github.com/pratikkayal/PlantDoc-Dataset`, CC BY 4.0) — real field photos; its test split is never used for training. Other PlantDoc crops form the `other_leaf` class.
2. Backbone: MobileNetV2-12 from the ONNX Model Zoo (Apache-2.0), ImageNet weights, used as a frozen feature extractor.
3. `extract.py` — features for up to 400 lab images per class (+1 augmented copy) and every PlantDoc training photo (+4 augmented copies: crop, flip, rotate, light, blur, JPEG).
4. `train_mlp_and_export.py` — 256-unit MLP head, field photos weighted ×3, merged into one ONNX file (10 MB).
5. `policy_eval.py` — measures the full decision (model + confidence policy + leaf-only health guard) on PlantDoc field photos.

Results (13 Oct 2026):
| Test set | Correct disease (crop selected) |
| --- | --- |
| PlantVillage lab hold-out, 2,300 photos | 94.7% |
| PlantDoc field test, 148 photos | 61.5% |

Field healthy leaves (28): 24 reported healthy, 2 uncertain, 2 called diseased.
Field diseased leaves (120): 105 flagged as a problem, 7 uncertain, 8 called healthy.

The field test set is small. Before quoting accuracy, collect 30–50 of your own labelled leaf photos per class and re-run `policy_eval.py`.
Next improvement: fine-tune the whole network on Indian field photos (needs a GPU), and add crops such as rice, chilli, brinjal, banana and cotton.
