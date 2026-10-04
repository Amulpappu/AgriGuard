"""
AgriGuard ML Training Pipeline
Fine-tunes MobileNetV3 or EfficientNet-B0 on PlantVillage crop disease dataset.
Outputs model.pt and model_meta.json for production inference with TorchClassifier.
"""
import argparse
import json
import os
import sys
from typing import Dict, List, Tuple

TARGET_CLASSES = [
    "tomato_healthy",
    "tomato_early_blight",
    "tomato_late_blight",
    "tomato_leaf_mold",
    "potato_healthy",
    "potato_early_blight",
    "potato_late_blight",
    "pepper_healthy",
    "pepper_bacterial_spot",
]

CLASS_TO_CROP = {
    "tomato_healthy": "tomato",
    "tomato_early_blight": "tomato",
    "tomato_late_blight": "tomato",
    "tomato_leaf_mold": "tomato",
    "potato_healthy": "potato",
    "potato_early_blight": "potato",
    "potato_late_blight": "potato",
    "pepper_healthy": "pepper",
    "pepper_bacterial_spot": "pepper",
}


def build_model(architecture: str, num_classes: int, pretrained: bool = True):
    import torch
    import torch.nn as nn
    from torchvision import models

    if architecture == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, num_classes)
    else:  # mobilenet_v3_small
        weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        model = models.mobilenet_v3_small(weights=weights)
        in_features = model.classifier[-1].in_features
        model.classifier[-1] = nn.Linear(in_features, num_classes)

    return model


def calibrate_temperature(model, val_loader, device) -> float:
    """
    Optimizes temperature T on validation logits to minimize NLL.
    Ensures probability calibration so confidence scores reflect real accuracy.
    """
    import torch
    import torch.nn as nn
    import torch.optim as optim

    model.eval()
    logits_list = []
    labels_list = []

    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs = inputs.to(device)
            logits = model(inputs)
            logits_list.append(logits.cpu())
            labels_list.append(targets)

    logits = torch.cat(logits_list, dim=0)
    labels = torch.cat(labels_list, dim=0)

    # Temperature parameter
    temperature = nn.Parameter(torch.ones(1) * 1.5)
    nll_criterion = nn.CrossEntropyLoss()
    optimizer = optim.LBFGS([temperature], lr=0.01, max_iter=50)

    def _eval():
        optimizer.zero_grad()
        loss = nll_criterion(logits / temperature, labels)
        loss.backward()
        return loss

    optimizer.step(_eval)
    calibrated_temp = float(torch.clamp(temperature, 0.5, 5.0).item())
    print(f"Optimal calibrated temperature: {calibrated_temp:.4f}")
    return calibrated_temp


def train(args):
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from torch.utils.data import DataLoader, random_split
        from torchvision import datasets, transforms as T
    except ImportError:
        print("Error: PyTorch and torchvision are required for training.")
        print("Install with: pip install torch torchvision")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    # Standard ImageNet normalization
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    train_transform = T.Compose([
        T.RandomResizedCrop(224),
        T.RandomHorizontalFlip(),
        T.RandomRotation(15),
        T.ColorJitter(brightness=0.2, contrast=0.2),
        T.ToTensor(),
        T.Normalize(mean=mean, std=std),
    ])

    val_transform = T.Compose([
        T.Resize(256),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize(mean=mean, std=std),
    ])

    if not os.path.exists(args.data_dir):
        print(f"Dataset directory not found: {args.data_dir}")
        print("Please provide a valid dataset path with subdirectories matching class names.")
        return

    full_dataset = datasets.ImageFolder(args.data_dir, transform=train_transform)
    num_classes = len(full_dataset.classes)
    print(f"Found {len(full_dataset)} images across {num_classes} classes: {full_dataset.classes}")

    val_size = int(len(full_dataset) * args.val_split)
    train_size = len(full_dataset) - val_size
    train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)

    model = build_model(args.architecture, num_classes=num_classes, pretrained=True).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val_acc = 0.0
    os.makedirs(args.output_dir, exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

        scheduler.step()
        epoch_loss = running_loss / total
        epoch_acc = correct / total

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                val_total += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()

        val_loss = val_loss / val_total
        val_acc = val_correct / val_total

        print(f"Epoch {epoch}/{args.epochs} | Train Loss: {epoch_loss:.4f}, Acc: {epoch_acc:.2%} | Val Loss: {val_loss:.4f}, Acc: {val_acc:.2%}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), os.path.join(args.output_dir, "best_checkpoint.pt"))

    # Calibrate temperature on validation set
    temp = calibrate_temperature(model, val_loader, device)

    # Save final model weights
    model_path = os.path.join(args.output_dir, "model.pt")
    torch.save(model.state_dict(), model_path)

    # Save model metadata
    meta = {
        "version": f"v1.0-{args.architecture}",
        "architecture": args.architecture,
        "classes": full_dataset.classes,
        "class_to_crop": CLASS_TO_CROP,
        "input_size": 224,
        "mean": mean,
        "std": std,
        "temperature": temp,
        "best_val_acc": round(best_val_acc, 4),
    }
    meta_path = os.path.join(args.output_dir, "model_meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Model saved to: {model_path}")
    print(f"Metadata saved to: {meta_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AgriGuard Crop Disease Model")
    parser.add_argument("--data_dir", type=str, default="./dataset", help="Path to ImageFolder dataset")
    parser.add_argument("--epochs", type=int, default=10, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--val_split", type=float, default=0.2, help="Validation set split fraction")
    parser.add_argument("--architecture", type=str, default="mobilenet_v3_small", choices=["mobilenet_v3_small", "efficientnet_b0"])
    parser.add_argument("--workers", type=int, default=2, help="Dataloader workers")
    parser.add_argument("--output_dir", type=str, default="app/ml/weights", help="Output directory for weights and metadata")

    args = parser.parse_args()
    train(args)
