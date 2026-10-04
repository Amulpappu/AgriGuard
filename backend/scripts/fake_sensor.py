"""
AgriGuard Fake IoT Sensor Simulator
Simulates ESP32 node with DHT22 & capacitive soil moisture sensor.
Can run in single shot, continuous loop, or seed 24-hour historical telemetry.
"""
import argparse
import math
import random
import time
from datetime import datetime, timezone, timedelta
import httpx

DEFAULT_DEVICE_KEY = "agriguard-esp32-key-demo"
DEFAULT_URL = "http://localhost:8000/api/v1/sensors/readings"


def generate_reading(simulated_time: datetime | None = None) -> dict:
    if simulated_time is None:
        simulated_time = datetime.now(timezone.utc)

    # Use hour of day to create a realistic diurnal cycle
    hour = simulated_time.hour + (simulated_time.minute / 60.0)

    # Temperature: Min around 5 AM (20°C), Max around 2 PM (32°C)
    temp_base = 26.0 + 6.0 * math.sin((hour - 8.0) * math.pi / 12.0)
    temp_c = round(temp_base + random.gauss(0, 0.7), 1)
    temp_c = max(10.0, min(50.0, temp_c))

    # Humidity: Inverse of temperature (~45% in afternoon, ~85% early morning)
    hum_base = 65.0 - 18.0 * math.sin((hour - 8.0) * math.pi / 12.0)
    humidity = round(hum_base + random.gauss(0, 2.0), 1)
    humidity = max(20.0, min(98.0, humidity))

    # Soil moisture: 45% - 75%, slowly drifting
    moisture = round(58.0 + 12.0 * math.cos(hour * math.pi / 24.0) + random.gauss(0, 1.5), 1)
    moisture = max(15.0, min(95.0, moisture))

    return {
        "soil_moisture": moisture,
        "temp_c": temp_c,
        "humidity": humidity,
        "recorded_at": simulated_time.isoformat(),
    }


def send_reading(url: str, device_key: str, data: dict) -> bool:
    headers = {
        "Content-Type": "application/json",
        "X-Device-Key": device_key,
    }
    try:
        r = httpx.post(url, json=data, headers=headers, timeout=5.0)
        if r.status_code in (200, 201):
            res = r.json()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] OK: Moisture={data['soil_moisture']}% | Temp={data['temp_c']}C | Humidity={data['humidity']}% (id={res.get('id')})")
            return True
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] FAILED ({r.status_code}): {r.text}")
            return False
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] CONNECTION ERROR: {e}")
        return False


def seed_24h_history(url: str, device_key: str, points: int = 24):
    print(f"\n--- Seeding {points} telemetry points across the past 24 hours ---")
    now = datetime.now(timezone.utc)
    interval = timedelta(hours=24) / points
    success_count = 0

    for i in range(points, 0, -1):
        ts = now - (i * interval)
        reading = generate_reading(ts)
        if send_reading(url, device_key, reading):
            success_count += 1
        time.sleep(0.05)

    print(f"Successfully seeded {success_count}/{points} historical sensor readings!\n")


def main():
    parser = argparse.ArgumentParser(description="AgriGuard Fake Sensor Telemetry Generator")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Backend URL (default: {DEFAULT_URL})")
    parser.add_argument("--key", default=DEFAULT_DEVICE_KEY, help="Device authentication key")
    parser.add_argument("--once", action="store_true", help="Send a single reading and exit")
    parser.add_argument("--seed-history", action="store_true", help="Seed 24 past readings for realistic charts")
    parser.add_argument("--interval", type=int, default=10, help="Interval in seconds between telemetry posts (default: 10s)")

    args = parser.parse_args()

    print("=" * 60)
    print("AgriGuard IoT Simulator — ESP32 Sensor Node")
    print(f"Target: {args.url}")
    print(f"Key:    {args.key}")
    print("=" * 60)

    if args.seed_history:
        seed_24h_history(args.url, args.key, points=24)

    if args.once:
        data = generate_reading()
        send_reading(args.url, args.key, data)
        return

    print(f"Starting continuous telemetry stream (interval: {args.interval}s)... Press Ctrl+C to stop.")
    try:
        while True:
            data = generate_reading()
            send_reading(args.url, args.key, data)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")


if __name__ == "__main__":
    main()
