#!/usr/bin/env python3
"""
AgriGuard ESP32 USB Data Cable Bridge
Reads live sensor telemetry directly from your USB cable (COM port)
and uploads it in real-time to the official AgriGuard Cloud (Supabase).
"""

import sys
import time
import re
import json
import requests
import serial
import serial.tools.list_ports

# Fix Windows console UTF-8 output if needed
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

SUPABASE_URL = "https://todwosflbwzuizvedouy.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZHdvc2ZsYnd6dWl6dmVkb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjYxNjUsImV4cCI6MjEwNjcwMjE2NX0."
    "fDqNi4bHJo9DCByVmZyX_GbKtyvJzQdD_bttu057UKY"
)

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def find_esp32_port():
    ports = serial.tools.list_ports.comports()
    print("\n🔍 Scanning connected USB Serial ports...")
    candidates = []
    for p in ports:
        print(f"  • {p.device}: {p.description}")
        desc = (p.description or "").lower()
        if "cp210" in desc or "ch340" in desc or "ch341" in desc or "silicon labs" in desc or "usb serial" in desc:
            candidates.append(p.device)
    
    if candidates:
        print(f"✅ Detected ESP32 candidate port: {candidates[0]}")
        return candidates[0]
    elif ports:
        print(f"⚠️ No exact CP210x name found. Defaulting to first port: {ports[0].device}")
        return ports[0].device
    return None

def upload_reading(temp_c, humidity, soil_pct):
    payload = {
        "device_id": "ESP32-USB-CABLE-01",
        "soil_moisture": round(float(soil_pct), 1),
        "temp_c": round(float(temp_c), 1),
        "humidity": round(float(humidity), 1)
    }
    try:
        url = f"{SUPABASE_URL}/rest/v1/sensor_readings"
        res = requests.post(url, headers=HEADERS, json=payload, timeout=5)
        if res.status_code in (200, 201):
            print(f"  🌐 [Synced to AgriGuard Website] Status {res.status_code} OK")
            return True
        else:
            print(f"  ❌ Upload response: {res.status_code} {res.text}")
    except Exception as e:
        print(f"  ⚠️ Network notice: {e}")
    return False

def main():
    port_name = sys.argv[1] if len(sys.argv) > 1 else find_esp32_port()
    if not port_name:
        print("\n❌ No USB COM port found. Please check your data cable connection.")
        print("Tip: If Windows says 'Unknown USB Device', unplug and reconnect the cable firmly.")
        return

    baud = 115200
    print(f"\n🔌 Opening Serial connection on {port_name} @ {baud} baud...")
    try:
        ser = serial.Serial(port_name, baud, timeout=2)
        print("✅ Serial Port Opened! Listening for telemetry...\n")
    except Exception as e:
        print(f"❌ Failed to open {port_name}: {e}")
        print("Tip: Make sure the Arduino IDE Serial Monitor is CLOSED so this port is free.")
        return

    temp_val = None
    hum_val = None
    soil_val = None

    try:
        while True:
            raw_line = ser.readline().decode("utf-8", errors="replace").strip()
            if not raw_line:
                continue

            print(f"📡 [ESP32 Serial]: {raw_line}")

            # Check JSON format
            if raw_line.startswith("{") and raw_line.endswith("}"):
                try:
                    data = json.loads(raw_line)
                    t = data.get("temp_c") or data.get("temperature")
                    h = data.get("humidity")
                    s = data.get("soil_moisture") or data.get("soil")
                    if t is not None and h is not None and s is not None:
                        upload_reading(t, h, s)
                        continue
                except Exception:
                    pass

            # Check text format:
            # Temperature: 28.4 C
            # Humidity: 65.0 %
            # Soil Moisture: 42.1 %
            t_match = re.search(r"Temperature:\s*([\d\.]+)", raw_line, re.IGNORECASE)
            if t_match:
                temp_val = float(t_match.group(1))

            h_match = re.search(r"Humidity:\s*([\d\.]+)", raw_line, re.IGNORECASE)
            if h_match:
                hum_val = float(h_match.group(1))

            s_match = re.search(r"Soil Moisture:\s*([\d\.]+)", raw_line, re.IGNORECASE)
            if s_match:
                soil_val = float(s_match.group(1))

            if temp_val is not None and hum_val is not None and soil_val is not None:
                print(f"\n🌱 >>> NEW TELEMETRY DETECTED <<<")
                print(f"   Temperature:   {temp_val} °C")
                print(f"   Humidity:      {hum_val} %")
                print(f"   Soil Moisture: {soil_val} %")
                upload_reading(temp_val, hum_val, soil_val)
                temp_val = None
                hum_val = None
                soil_val = None

    except KeyboardInterrupt:
        print("\n👋 Stopping USB Serial Bridge.")
    finally:
        ser.close()

if __name__ == "__main__":
    main()
