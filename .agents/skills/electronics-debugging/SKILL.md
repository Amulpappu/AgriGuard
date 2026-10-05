---
name: electronics-debugging
description: >-
  Diagnoses hardware circuits, sensor reading anomalies, voltage mismatches,
  floating pins, brownouts, and ground loops. Use when physical sensor readings fail.
---

# Electronics Debugging Skill

## When to Use It
Activate this skill when sensors return NaN, 0, or jittery values, microcontrollers reboot unexpectedly, or hardware circuits overheat.

## Prerequisites
- Schematic or pin connection list.
- Hardware specifications of connected ICs and sensors.

## Step-by-Step Procedure
1. **Power & Ground Audit:**
   - Verify common ground (GND) across all modules, sensors, and power supplies.
   - Check power source current limit (sensors requiring >200mA may cause microcontroller brownout).
2. **Signal Level & Pull-Ups:**
   - Verify I2C bus has external 4.7kΩ pull-up resistors on SDA and SCL lines.
   - Check digital input pins for floating states; ensure pull-up or pull-down is enabled.
3. **Analog Noise Filtering:**
   - Implement median filtering or exponential moving average (EMA) in firmware to eliminate ADC noise.
4. **Thermal & Short Inspection:**
   - Check for reverse polarity or shorted VCC/GND traces.

## Verification Checklist
- [ ] Operating voltages within specified ranges (3.3V / 5.0V).
- [ ] No floating inputs causing spurious logic transitions.
- [ ] Decoupling capacitors (0.1µF ceramic) placed near sensitive sensor power pins.

## Failure Recovery
- If readings remain erratic, isolate sensors one by one on a breadboard to pinpoint the faulty component.

## Safety Constraints
- Disconnect power immediately if any component feels hot to the touch.
