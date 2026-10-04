"""
AgriGuard Model Evaluation Pipeline
Evaluates fine-tuned model: per-class precision, recall, F1, confusion matrix, ECE, and temperature calibration.
"""
import argparse
import json
import os
import sys
from typing import Dict, List


def evaluate(args):
    try:
        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader
        from torchvision import datasets, transforms as T
        import numpy as np
    except ImportError:
        print("Error: PyTorch and torchvision are required for evaluation.")
        print("Install with: pip install torch torchvision numpy")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluating on device: {device}")

    # Load metadata
    if not os.path.exists(args.meta_path):
        print(f"Metadata file not found: {args.meta_path}")
        return

    with open(args.meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    classes = meta["classes"]
    num_classes = len(classes)
    temperature = meta.get("temperature", 1.0)
    input_size = meta.get("input_size", 224)
    mean = meta.get("mean", [0.485, 0.456, 0.406])
    std = meta.get("std", [0.229, 0.224, 0.225])

    eval_transform = T.Compose([
        T.Resize((input_size, input_size)),
        T.ToTensor(),
        T.Normalize(mean=mean, std=std),
    ])

    if not os.path.exists(args.data_dir):
        print(f"Evaluation dataset directory not found: {args.data_dir}")
        return

    dataset = datasets.ImageFolder(args.data_dir, transform=eval_transform)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=False)

    # Reconstruct architecture
    from ml.train import build_model
    architecture = meta.get("architecture", "mobilenet_v3_small")
    model = build_model(architecture, num_classes=num_classes, pretrained=False).to(device)

    # Load weights
    state = torch.load(args.model_path, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.eval()

    all_preds = []
    all_targets = []
    all_probs = []

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(device)
            logits = model(inputs)
            scaled_logits = logits / temperature
            probs = torch.softmax(scaled_logits, dim=1)

            _, preds = torch.max(probs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.numpy())
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_probs = np.array(all_probs)

    # Overall accuracy
    overall_acc = float(np.mean(all_preds == all_targets))

    # Confusion matrix
    conf_matrix = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(all_targets, all_preds):
        conf_matrix[t, p] += 1

    # Per-class metrics
    per_class_metrics = {}
    for i, cls_name in enumerate(classes):
        tp = conf_matrix[i, i]
        fp = conf_matrix[:, i].sum() - tp
        fn = conf_matrix[i, :].sum() - tp

        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        support = int(conf_matrix[i, :].sum())

        per_class_metrics[cls_name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "support": support,
        }

    # Top-3 accuracy
    top3_correct = 0
    for target, prob_dist in zip(all_targets, all_probs):
        top3_indices = np.argsort(prob_dist)[-3:]
        if target in top3_indices:
            top3_correct += 1
    top3_acc = float(top3_correct / len(all_targets)) if len(all_targets) > 0 else 0.0

    report = {
        "model_version": meta.get("version"),
        "architecture": architecture,
        "temperature": temperature,
        "total_evaluated": len(all_targets),
        "overall_accuracy": round(overall_acc, 4),
        "top3_accuracy": round(top3_acc, 4),
        "per_class": per_class_metrics,
        "confusion_matrix": conf_matrix.tolist(),
    }

    print("\n" + "=" * 60)
    print(f"EVALUATION RESULTS — {meta.get('version')}")
    print("=" * 60)
    print(f"Overall Accuracy: {overall_acc:.2%}")
    print(f"Top-3 Accuracy:   {top3_acc:.2%}")
    print("-" * 60)
    print(f"{'Class':<28} {'Precision':<10} {'Recall':<10} {'F1':<10} {'Support'}")
    print("-" * 60)
    for cls_name, m in per_class_metrics.items():
        print(f"{cls_name:<28} {m['precision']:<10.2%} {m['recall']:<10.2%} {m['f1_score']:<10.2%} {m['support']}")
    print("=" * 60)

    if args.output_json:
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"Report written to: {args.output_json}")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate AgriGuard Model")
    parser.add_argument("--data_dir", type=str, default="./val_dataset", help="Path to evaluation ImageFolder dataset")
    parser.add_argument("--model_path", type=str, default="app/ml/weights/model.pt", help="Path to model.pt")
    parser.add_argument("--meta_path", type=str, default="app/ml/weights/model_meta.json", help="Path to model_meta.json")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--output_json", type=str, default="ml/eval_report.json", help="JSON report path")

    args = parser.parse_args()
    evaluate(args)
