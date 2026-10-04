# 🌾 AgriGuard (அக்ரிகார்ட்)
### AI Crop Disease Detection & Field Monitoring for Smallholder Indian Farmers

> **Hackathon Theme:** *"Samriddh Annadata, Samriddh Bharat"*  
> **Status:** Production-Ready MVP  
> **Core Principle:** AI-assisted screening and decision-support tool — **NOT** a guaranteed diagnosis or a chemical prescription service.

---

## 🌟 Key Features

1. **📱 Mobile-First 360px PWA Interface:**
   - Designed specifically for low-end smartphones on rural 2G/3G/4G connections.
   - Built with Next.js 14 App Router, Tailwind CSS, Lucide icons, and Recharts.
   - Client-side image compression downscales photos to $\le 1280\text{px}$ before transmission.
2. **✨ Image-First Automatic Crop & Vegetable Detection:**
   - **No need to pre-select category:** Simply take a photo of any leaf or plant — AgriGuard automatically detects whether it's Rice, Wheat, Corn, Cotton, Brinjal, Onion, Banana, Mango, Grape, Cabbage, Cucumber, Tomato, Potato, or Pepper!
   - Supports 14+ staple Indian crops and horticultural vegetables.
3. **🔬 Broad-Spectrum Diagnostic Pipeline (Not Just Diseases):**
   - **Pathological Diseases:** Fungal blights, rusts, blasts, spots, and viral leaf curls.
   - **Nutrient & Soil Property Disorders:** Nitrogen deficiency, Potassium leaf scorch, Calcium blossom rot, and micronutrient imbalances.
   - **Pest & Insect Infestations:** Thrips leaf curl, Fall Armyworm, caterpillar damage, and shoot/fruit borers.
   - **Abiotic & Environmental Stress:** Water/moisture stress, heat scorch, and drought wilting.
   - **Calibrated Confidence Policy:** Suppresses identification if confidence is low, and provides clear disclaimers.
4. **🚨 Immediate Crop Rescue Plans & Organic Remedies:**
   - **Emergency Action:** What the farmer must do right now to save their crop.
   - **Organic Solutions:** Chemical-free treatments (Neem oil, sticky traps, Panchagavya, Trichoderma).
   - **Soil & Irrigation Guidance:** Balanced NPK fertilization, moisture preservation, and drainage management.
5. **🛡️ Agronomic Safety & Regulatory Compliance:**
   - Non-prescriptive advisories (zero commercial chemical brand names, zero dosages).
   - Mandatory referral to local Agriculture Extension Officers and Krishi Vigyan Kendra (KVK).
4. **🌐 Multi-Lingual from Day One:**
   - Native Tamil (`ta`) and English (`en`) support with instantaneous language toggle.
5. **📈 Crop Health History & Comparison Engine:**
   - Side-by-side progression analysis ($\Delta$ severity, $\Delta$ confidence, status changes) to track treatment efficacy over time.
6. **🌱 Real-Time IoT Field Telemetry:**
   - ESP32 hardware firmware with capacitive soil moisture sensor and DHT22.
   - Realistic Python simulator (`scripts/fake_sensor.py`) providing day/night telemetry curves.
7. **💻 Laptop-as-Server & Remote Access (No 24/7 Cloud Required):**
   - Run AgriGuard directly on your laptop as the host server.
   - Built-in zero-config Cloudflare tunnel (`cloudflared`) allows friends and judges on any phone or desktop to access AgriGuard anywhere in the world without being on the same Wi-Fi network.
8. **👥 Multi-Tenant Accounts & Isolated Storage:**
   - Anyone can create their own account (Name, Email, Password) directly in the app.
   - Separate accounts, private scan histories, and isolated image storage saved locally on the laptop:
     - User Database: `backend/agriguard.db`
     - Isolated Photos: `backend/uploads/users/<username>/`

---

## ⚡ Quick 1-Click Launch (Laptop Host & Remote Sharing)

Double-click **`Start_AgriGuard_Server.bat`** or run **`AgriGuard.exe`** on your laptop.
It automatically:
1. Starts the FastAPI backend (port `8001`)
2. Starts the Next.js frontend (port `3000`)
3. Launches a secure Cloudflare HTTPS tunnel
4. Saves your public link to `ONLINE_URL.txt` (e.g., `https://xxxx.trycloudflare.com`)
5. You can send this link to anyone on mobile or PC to use the app with separate accounts and separate data!

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

---

### 1. Backend Setup

```bash
cd backend

# 1. Install dependencies
py -3.11 -m pip install -r requirements.txt

# 2. Seed database (creates crops, diseases, demo user, and IoT device)
py -3.11 scripts/seed_db.py

# 3. Seed demo scans (~20 realistic scans showing disease progression for compare demo)
py -3.11 scripts/seed_demo.py

# 4. Start FastAPI server (runs on port 8000)
py -3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Demo Credentials:**  
> Email: `demo@agriguard.in`  
> Password: `Demo1234!`  
> IoT Device Key: `agriguard-esp32-key-demo`

---

### 2. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Next.js development server (runs on port 3000)
npm run dev

# Or build and run production bundle:
npm run build
npm start
```

Visit **`http://localhost:3000`** in your browser (or use DevTools mobile responsive mode at **360px** width).

---

### 3. IoT Simulator (Optional)

In a separate terminal, seed a 24-hour sensor telemetry curve for the dashboard and field monitoring views:

```bash
cd backend
py -3.11 scripts/fake_sensor.py --seed-history
```

To continuously stream telemetry every 10 seconds:
```bash
py -3.11 scripts/fake_sensor.py --interval 10
```

---

## 🧪 Testing & Verification

Run the comprehensive automated test suite (25 tests covering quality checks, confidence gating, severity estimation, chemical safety verification, IoT telemetry, and comparison):

```bash
cd backend
py -3.11 -m pytest -v
```

Run frontend production build verification:
```bash
cd frontend
npm run build
```

Run Playwright E2E mobile scan flow test:
```bash
cd frontend
npx playwright test
```

---

## 📂 Repository Layout

```
AgriGuard/
├── backend/
│   ├── advisory/             # Agronomic advisory knowledge base (en.json, ta.json)
│   ├── app/
│   │   ├── api/              # FastAPI endpoints (auth, crops, scans, dashboard, sensors, health)
│   │   ├── core/             # Configuration, async DB session, security, storage backend
│   │   ├── ml/               # Model adapters (MockClassifier, TorchClassifier)
│   │   ├── models/           # SQLAlchemy 2 models (User, Crop, Disease, Scan, Device, SensorReading)
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   └── services/         # Quality check, confidence gating, CV severity estimation
│   ├── iot/
│   │   └── esp32_firmware/   # Arduino C++ sketch for ESP32 + DHT22 + Capacitive Soil Sensor
│   ├── ml/
│   │   ├── train.py          # MobileNetV3 / EfficientNet fine-tuning with temperature calibration
│   │   └── eval.py           # Per-class precision, recall, F1, confusion matrix, top-3 evaluation
│   ├── scripts/
│   │   ├── seed_db.py        # Seeds crops, diseases, demo user, demo device
│   │   ├── seed_demo.py      # Seeds ~20 scans with visible progression for compare demo
│   │   ├── fake_sensor.py    # Realistic IoT sensor simulator
│   │   └── test_api.py       # Integration sanity test script
│   └── tests/                # Pytest unit & integration test suite
├── frontend/
│   ├── app/                  # Next.js 14 App Router pages (/, /dashboard, /scan, /scan/[id], /history, /compare, /field)
│   ├── components/           # Reusable UI components & navigation bar
│   ├── e2e/                  # Playwright end-to-end smoke test suite
│   ├── locales/              # i18n dictionaries (en.json, ta.json)
│   └── tailwind.config.ts    # Tailored high-contrast mobile palette
├── docs/                     # System architecture, AI safety guidelines, IoT guide
├── docker-compose.yml        # Multi-container orchestration
└── .env.example              # Sample environment configuration
```

---

## ⚖️ AI Safety & Regulatory Compliance

AgriGuard strictly adheres to safety boundaries:
1. **Advisories contain ZERO chemical prescriptions or dosages** to prevent improper pesticide use.
2. **Every report directs farmers to their nearest Krishi Vigyan Kendra (KVK)** or state agricultural officer.
3. **Low-confidence or ambiguous scans withhold disease names** and advise re-taking the photo in natural light.
4. **Severity ratings are explicitly labelled as "AI estimates"**.
