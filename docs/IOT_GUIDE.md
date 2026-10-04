# AgriGuard IoT Field Monitoring Guide

AgriGuard integrates real-time ambient telemetry from greenhouse or field nodes to provide disease risk context (e.g. wet soil and cool humid nights favouring late blight).

---

## 1. Hardware Bill of Materials (BOM)

| Component | Purpose | Interface |
|---|---|---|
| ESP32 DevKit V1 | Main microcontroller with Wi-Fi | Wi-Fi 802.11 b/g/n |
| Capacitive Soil Moisture Sensor v1.2 | Soil water content (corrosion resistant) | Analog ADC1 (GPIO 34) |
| DHT22 / AM2302 Sensor | Air temperature (-40 to 80°C) & humidity (0-100%) | Digital 1-wire (GPIO 4) |
| 10kΩ Resistor | DHT22 pull-up resistor | — |
| 5V / 2A Micro-USB / Solar Battery Pack | Power supply | Power |

---

## 2. Pin Wiring

```
ESP32 Pin          Sensor Pin
──────────────────────────────
GPIO 4    ───────  DHT22 DATA (with 10k pull-up to 3.3V)
GPIO 34   ───────  Capacitive Soil Moisture AOUT
3V3       ───────  VCC for both DHT22 and Soil Sensor
GND       ───────  GND for both sensors
```

> **Note:** Always use an ADC1 channel (GPIO 32 - 39) on ESP32 because ADC2 is disabled when Wi-Fi is transmitting.

---

## 3. Sensor Calibration

1. **Air Dry Value:** Hold sensor dry in open air. Note analog read value ($\approx 3200$).
2. **Submerged Value:** Submerge up to white line in water. Note value ($\approx 1400$).
3. Update `SOIL_DRY_RAW` and `SOIL_WET_RAW` in `backend/iot/esp32_firmware/esp32_firmware.ino`.

---

## 4. Software Simulation (`fake_sensor.py`)

For demo or development without physical hardware, run the included simulator:

```bash
# Seed 24 hours of realistic day/night telemetry curves for the dashboard charts:
py -3.11 scripts/fake_sensor.py --seed-history

# Send a single reading:
py -3.11 scripts/fake_sensor.py --once

# Run continuous 10-second telemetry updates:
py -3.11 scripts/fake_sensor.py --interval 10
```
