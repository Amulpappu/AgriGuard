---
name: esp32-development
description: >-
  Develops, compiles, and optimizes firmware for ESP32 microcontrollers.
  Covers Wi-Fi, BLE, FreeRTOS tasks, deep sleep, and secure IoT telemetry.
---

# ESP32 Development Skill

## When to Use It
Activate this skill when writing firmware, managing Wi-Fi connectivity, configuring hardware interrupts, reading sensors, or dispatching telemetry from ESP32 boards.

## Prerequisites
- ESP32 hardware specifications (ESP32-WROOM-32, ESP32-S3, etc.).
- Knowledge of pinout configurations and voltage thresholds.

## Step-by-Step Procedure
1. **Board & Pinout Inspection:**
   - Map all connected sensors to safe GPIOs (avoid GPIO 0, 2, 12, 15 strapping pins).
   - Use ADC1 pins (GPIO 32–39) for analog readings when Wi-Fi is active.
2. **Firmware Architecture:**
   - Structure firmware with modular initialization (`setup()`) and non-blocking execution (`loop()` or FreeRTOS `xTaskCreate`).
   - Use exponential backoff for Wi-Fi reconnection routines.
3. **Telemetry Dispatch:**
   - Format sensor payloads as compact JSON strings.
   - Dispatch over HTTP POST or MQTT with device authentication headers (`X-Device-Key`).
4. **Power & Sleep Management:**
   - Implement deep sleep cycles (`esp_deep_sleep_start()`) for battery-operated nodes.

## Verification Checklist
- [ ] No 5V sensors connected directly to ESP32 without level shifting.
- [ ] Strapping pins kept free of conflicting pull-ups/pull-downs.
- [ ] Non-blocking delays used instead of long blocking `delay()` calls.

## Failure Recovery
- If the board enters a boot loop, verify whether GPIO 0 or GPIO 12 was pulled low or high unexpectedly.

## Safety Constraints
- Never exceed 3.6V maximum rating on any ESP32 GPIO pin.
