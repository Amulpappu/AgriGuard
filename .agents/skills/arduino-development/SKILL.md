---
name: arduino-development
description: >-
  Develops, structures, and debugs sketches for Arduino boards and compatible microcontrollers.
  Covers sensor interfacing, timer loops, and serial protocol communications.
---

# Arduino Development Skill

## When to Use It
Activate this skill when creating or modifying Arduino sketches (`.ino`), integrating standard Arduino libraries (Wire, SPI, DHT, Adafruit), or writing modular C/C++ driver code.

## Prerequisites
- Target board architecture (AVR, SAMD, RP2040, STM32).
- Operating voltage profile (5V vs 3.3V).

## Step-by-Step Procedure
1. **Board Architecture & Libraries:**
   - Select required libraries (e.g. `Wire.h` for I2C, `SPI.h` for SPI buses).
2. **Modular Code Structure:**
   - Define pin numbers as `const uint8_t` or `#define` at the top of the sketch.
   - Separate hardware reading logic into independent helper functions.
3. **Non-blocking Timing:**
   - Implement `millis()` timer state machines instead of `delay()` to prevent freezing loop execution.
4. **Serial Telemetry:**
   - Initialize Serial with standard baud rates (`115200` or `9600`).
   - Format outputs cleanly for downstream serial parsers.

## Verification Checklist
- [ ] Memory footprint fits within target board SRAM limits.
- [ ] Pin assignments do not conflict with hardware UART (pins 0 & 1).
- [ ] Sensor initialization handles missing/disconnected hardware gracefully.

## Failure Recovery
- If compilation fails due to missing headers, inspect library dependency versions and include guards.

## Safety Constraints
- Verify logic level match between sensor modules and Arduino board pins.
