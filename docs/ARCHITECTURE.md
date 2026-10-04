# AgriGuard System Architecture

> **Hackathon Theme:** "Samriddh Annadata, Samriddh Bharat"  
> **Mission:** AI-assisted screening and decision-support for smallholder Indian farmers.

---

## 1. System Overview

AgriGuard is designed as an edge-aware, mobile-first progressive web application (PWA) backed by a high-performance Python FastAPI service. It bridges classical computer vision, calibrated deep learning classifiers, and real-time field telemetry into an actionable, non-prescriptive advisory interface.

```mermaid
graph TD
    User([Farmer with Mobile Phone / 360px Viewport]) -->|1. Takes Photo & Selects Crop| Frontend[Next.js 14 PWA Client]
    IoT([ESP32 Sensor Node / fake_sensor.py]) -->|Telemetry: Moisture, Temp, Humidity| SensorAPI[FastAPI /sensors/readings]
    Frontend -->|2. Multipart POST image + crop_id| ScanAPI[FastAPI /scans]
    
    subgraph "AgriGuard AI Decision Engine"
        ScanAPI --> QC[Quality & Blur Gate\nLaplacian Var > 60, Brightness]
        QC -->|Pass| ModelAdapter{ModelAdapter\nMODEL_BACKEND}
        ModelAdapter -->|mock| MockClassifier[Mock Classifier\nVaried Probs]
        ModelAdapter -->|torch| TorchClassifier[MobileNetV3 / EfficientNet-B0\nCrop-Aware Masked Softmax]
        
        TorchClassifier --> Calib[Temperature Scaling\nT-calibrated logits]
        MockClassifier --> ConfGate[Confidence Gate]
        Calib --> ConfGate
        
        ConfGate -->|Conf >= 0.80| Confident[Status: Confident Diagnosis]
        ConfGate -->|0.55 <= Conf < 0.80| Possible[Status: Possible Diagnosis]
        ConfGate -->|Conf < 0.55 or Margin < 0.15| Uncertain[Status: Uncertain / Retake Photo]
        
        ScanAPI --> SeverityEngine[Classical CV Severity Engine\nHSV Green Leaf Mask + Lesion Ratio]
        SeverityEngine -->|Lesion % / Leaf %| SevLevel[Estimate: None / Low / Moderate / High]
    end

    Confident --> AdvisoryEngine[Advisory Knowledge Base\nen.json / ta.json]
    Possible --> AdvisoryEngine
    Uncertain --> ExpertHelp[Expert Consultation & KVK Advice]
    
    AdvisoryEngine --> Response[Structured Diagnostic & Advisory Payload]
    SevLevel --> Response
    Response --> Frontend
```

---

## 2. Core Processing Pipeline

1. **Client-Side Compression:**
   - Downscales captured photos to maximum 1280px client-side to minimize bandwidth consumption over 2G/3G/4G rural networks.
2. **Quality Gate (`app/services/quality.py`):**
   - Validates file format and size (≤ 8MB).
   - Computes grayscale brightness; rejects underexposed (< 25) or overexposed (> 245) photos.
   - Calculates Laplacian variance; rejects blurry shots (< 60) with a friendly retake instruction.
3. **Crop-Aware Inference (`app/ml/classifier.py`):**
   - The user selects their target crop (Tomato, Potato, Pepper).
   - Classes belonging to other crops are masked out with $-\infty$ logits before softmax.
   - Prevents biologically impossible cross-crop false positives (e.g. Potato Late Blight predicted on Pepper).
4. **Probability Calibration & Confidence Policy (`app/services/confidence.py`):**
   - Employs validation-optimized Temperature Scaling ($T$).
   - Strict gating:
     - $\ge 80\% \rightarrow$ Confident
     - $55\% - 80\% \rightarrow$ Possible (displays Top-3 differential candidates)
     - $< 55\%$ or $(\text{Top}_1 - \text{Top}_2 < 15\%) \rightarrow$ **Uncertain**: Explicitly suppresses disease names, prompts retake, and recommends local extension officer consultation.
   - Confidence is always capped at 99% to prevent misleading false certainty.
5. **Classical CV Severity Quantification (`app/services/severity.py`):**
   - Generates an HSV color mask to isolate green and healthy leaf area.
   - Generates brown/yellow/dark necrotic lesion masks within the leaf contour.
   - Calculates $\text{Affected Area} = \frac{\text{Lesion Pixels}}{\text{Leaf Pixels}} \times 100\%$.
   - Labelled strictly as **"AI estimate"** (Low <10%, Moderate 10–30%, High >30%).
6. **Safety-Compliant Agronomic Advisory (`app/api/advisory.py`):**
   - Multi-lingual advisory in English and Tamil (`ta`).
   - Strict non-prescriptive rule: zero chemical trade names, zero chemical dosages. Focuses solely on cultural sanitation, irrigation adjustments, crop rotation, and KVK contact.

---

## 3. Storage & Portability

- Storage is abstracted behind a clean `StorageBackend` protocol.
- Local disk in development (`./uploads` with thumbnail generation).
- Swappable to S3 or Supabase Storage with zero application code changes.
- Database runs on SQLite with async I/O (`aiosqlite`) for local development, and PostgreSQL (`asyncpg`) for production deployment.
