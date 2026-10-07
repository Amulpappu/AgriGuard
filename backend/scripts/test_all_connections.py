"""
Comprehensive connection and integration test script for AgriGuard.
Tests:
1. Backend Direct Health & DB Check
2. Backend Authentication & JWT Issuance
3. Backend Crops & Data API
4. Backend ML Inference Scan Flow
5. Backend IoT Sensor Ingestion & Retrieval
6. Frontend Next.js HTTP & Proxy Rewrites Check
7. Supabase Cloud Connection & Table Sync Check
"""
import sys
import time
import io
from PIL import Image
import httpx

BACKEND_URL = "http://127.0.0.1:8001/api/v1"
FRONTEND_URL = "http://localhost:3000"
SUPABASE_URL = "https://todwosflbwzuizvedouy.supabase.co"

results = []

def record(name: str, passed: bool, latency_ms: float, details: str = ""):
    status_str = "PASS" if passed else "FAIL"
    results.append({"name": name, "passed": passed, "latency_ms": latency_ms, "details": details})
    print(f"[{status_str}] {name} ({latency_ms:.1f}ms) - {details}")

def main():
    print("==================================================================")
    print("         AGRIGUARD SYSTEM CONNECTION & INTEGRATION AUDIT          ")
    print("==================================================================")
    
    # 1. Backend Health Check
    t0 = time.time()
    try:
        r = httpx.get(f"{BACKEND_URL}/health", timeout=5.0)
        dur = (time.time() - t0) * 1000
        data = r.json()
        passed = (r.status_code == 200 and data.get("status") == "ok" and data.get("db") == "ok")
        record("Backend Health & SQLite DB", passed, dur, f"status={data.get('status')}, db={data.get('db')}, model={data.get('model_backend')}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Backend Health & SQLite DB", False, dur, str(e))
        return

    # 2. Authentication Login Check
    t0 = time.time()
    token = None
    headers = {}
    try:
        r = httpx.post(f"{BACKEND_URL}/auth/login", json={"email": "demo@agriguard.in", "password": "Demo1234!"}, timeout=5.0)
        dur = (time.time() - t0) * 1000
        if r.status_code == 200:
            token = r.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            record("Backend Auth (Login & JWT)", True, dur, f"User: demo@agriguard.in, Token length: {len(token)}")
        else:
            record("Backend Auth (Login & JWT)", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Backend Auth (Login & JWT)", False, dur, str(e))

    # 3. Crops Catalog API
    t0 = time.time()
    crop_id = None
    try:
        r = httpx.get(f"{BACKEND_URL}/crops", headers=headers, timeout=5.0)
        dur = (time.time() - t0) * 1000
        crops = r.json()
        if r.status_code == 200 and len(crops) > 0:
            crop_id = crops[0].get("id")
            crop_slug = crops[0].get("slug")
            record("Backend Crops Catalog API", True, dur, f"Loaded {len(crops)} crops. First crop: {crop_slug} ({crop_id})")
        else:
            record("Backend Crops Catalog API", False, dur, f"Status {r.status_code}: {crops}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Backend Crops Catalog API", False, dur, str(e))

    # 4. ML Scan & Image Analysis
    t0 = time.time()
    scan_id = None
    try:
        # Create a small valid green synthetic leaf image
        img = Image.new("RGB", (256, 256), color=(34, 139, 34))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        
        files = {"image": ("test_leaf.jpg", buf, "image/jpeg")}
        data = {"crop_id": crop_id} if crop_id else {}
        r = httpx.post(f"{BACKEND_URL}/scans", headers=headers, data=data, files=files, timeout=8.0)
        dur = (time.time() - t0) * 1000
        scan_res = r.json()
        if r.status_code in (200, 201):
            scan_id = scan_res.get("id")
            crop_info = scan_res.get("crop", {})
            disease_info = scan_res.get("disease", {})
            conf = scan_res.get("confidence")
            sev = scan_res.get("severity", {})
            record("Backend ML Scan Inference", True, dur, f"Scan ID: {scan_id}, Crop: {crop_info.get('slug')}, Disease: {disease_info.get('slug') if disease_info else 'none'}, Conf: {conf}, Sev: {sev.get('affected_pct')}%")
        else:
            record("Backend ML Scan Inference", False, dur, f"Status {r.status_code}: {scan_res}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Backend ML Scan Inference", False, dur, str(e))

    # 5. IoT Sensor Telemetry Ingestion (ESP32 Simulation)
    t0 = time.time()
    try:
        sensor_headers = {
            "Content-Type": "application/json",
            "X-Device-Key": "agriguard-esp32-key-demo",
        }
        sensor_payload = {
            "soil_moisture": 58.0,
            "temp_c": 28.5,
            "humidity": 74.2,
        }
        r = httpx.post(f"{BACKEND_URL}/sensors/readings", json=sensor_payload, headers=sensor_headers, timeout=5.0)
        dur = (time.time() - t0) * 1000
        if r.status_code in (200, 201):
            reading = r.json()
            record("IoT Sensor Telemetry POST", True, dur, f"Ingested ESP32 reading id={reading.get('id')}: Temp=28.5°C, Hum=74.2%, Soil=58%")
        else:
            record("IoT Sensor Telemetry POST", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("IoT Sensor Telemetry POST", False, dur, str(e))

    # 6. IoT Sensor Telemetry Retrieval
    t0 = time.time()
    try:
        r = httpx.get(f"{BACKEND_URL}/sensors/latest", headers=headers, timeout=5.0)
        dur = (time.time() - t0) * 1000
        if r.status_code == 200:
            data = r.json()
            latest = data.get("latest") or {}
            hint = data.get("context_hint")
            record("IoT Sensor Telemetry GET", True, dur, f"Retrieved latest: Temp={latest.get('temp_c')}°C, Hum={latest.get('humidity')}%, Soil={latest.get('soil_moisture')}%, Hint: '{hint}'")
        else:
            record("IoT Sensor Telemetry GET", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("IoT Sensor Telemetry GET", False, dur, str(e))

    # 7. Next.js Frontend Server Check
    t0 = time.time()
    try:
        r = httpx.get(f"{FRONTEND_URL}/", timeout=6.0)
        dur = (time.time() - t0) * 1000
        passed = (r.status_code == 200 and "AgriGuard" in r.text)
        record("Frontend Next.js Web Root", passed, dur, f"HTTP {r.status_code}, Length: {len(r.text)} bytes")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Frontend Next.js Web Root", False, dur, str(e))

    # 8. Next.js to FastAPI Reverse Proxy Check
    t0 = time.time()
    try:
        r = httpx.get(f"{FRONTEND_URL}/api/v1/health", timeout=6.0)
        dur = (time.time() - t0) * 1000
        if r.status_code == 200 and r.json().get("status") == "ok":
            record("Frontend -> Backend Reverse Proxy", True, dur, f"Proxied through Next.js rewrite: status={r.json().get('status')}")
        else:
            record("Frontend -> Backend Reverse Proxy", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Frontend -> Backend Reverse Proxy", False, dur, str(e))

    # 9. Supabase Cloud Connection Check
    t0 = time.time()
    try:
        # Check Supabase public REST API endpoint
        supabase_anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZHdvc2ZsYnd6dWl6dmVkb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjYxNjUsImV4cCI6MjEwNjcwMjE2NX0.fDqNi4bHJo9DCByVmZyX_GbKtyvJzQdD_bttu057UKY"
        sb_headers = {
            "apikey": supabase_anon,
            "Authorization": f"Bearer {supabase_anon}"
        }
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/crops?select=count", headers=sb_headers, timeout=6.0)
        dur = (time.time() - t0) * 1000
        if r.status_code in (200, 206):
            record("Supabase Cloud REST API", True, dur, f"Connected to {SUPABASE_URL}. Status: {r.status_code}")
        else:
            record("Supabase Cloud REST API", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Supabase Cloud REST API", False, dur, str(e))

    # 10. Bio-Risk Pre-Symptomatic Infection Window API
    t0 = time.time()
    try:
        r = httpx.get(f"{BACKEND_URL}/sensors/bio-risk", timeout=5.0)
        dur = (time.time() - t0) * 1000
        if r.status_code == 200:
            d = r.json()
            record("Bio-Risk Pre-Symptomatic Engine", True, dur, f"Risk={d.get('risk_percentage')}%, Level={d.get('risk_level')}, VPD={d.get('vpd', {}).get('vpd_kpa')} kPa")
        else:
            record("Bio-Risk Pre-Symptomatic Engine", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Bio-Risk Pre-Symptomatic Engine", False, dur, str(e))

    # 11. Village Grid Bio-Radar Spore Dispersion API
    t0 = time.time()
    try:
        r = httpx.get(f"{BACKEND_URL}/sensors/bioradar", timeout=5.0)
        dur = (time.time() - t0) * 1000
        if r.status_code == 200:
            d = r.json()
            record("Village Bio-Radar Spore Plume API", True, dur, f"Cluster={d.get('cluster_name')}, Nodes monitored={d.get('nodes_monitored')}, High risk={d.get('nodes_at_high_risk')}")
        else:
            record("Village Bio-Radar Spore Plume API", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Village Bio-Radar Spore Plume API", False, dur, str(e))

    # 12. Mandi PHI & ROI Economic Lock Engine
    t0 = time.time()
    try:
        r = httpx.get(f"{BACKEND_URL}/sensors/mandi-roi?crop_slug=tomato&days_to_harvest=6&mandi_price_per_kg=28", timeout=5.0)
        dur = (time.time() - t0) * 1000
        if r.status_code == 200:
            d = r.json()
            record("Mandi PHI & Treat-vs-Harvest ROI", True, dur, f"Strategy={d.get('recommended_strategy')}, MRL Lock={d.get('has_mrl_safety_lock')}, Profit Diff=+INR {d.get('farmer_profit_difference_inr')}")
        else:
            record("Mandi PHI & Treat-vs-Harvest ROI", False, dur, f"Status {r.status_code}: {r.text}")
    except Exception as e:
        dur = (time.time() - t0) * 1000
        record("Mandi PHI & Treat-vs-Harvest ROI", False, dur, str(e))

    print("==================================================================")
    all_passed = all(x["passed"] for x in results)
    pass_count = sum(1 for x in results if x["passed"])
    print(f"SUMMARY: {pass_count}/{len(results)} TESTS PASSED ({'100% SUCCESS' if all_passed else 'SOME FAILURES'})")
    print("==================================================================")

if __name__ == "__main__":
    main()
