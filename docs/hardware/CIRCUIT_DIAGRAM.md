# AgriGuard IoT Field Sensor Circuit & Exact Wiring Guide

This guide gives the exact pin-by-pin and wire-by-wire connection map for the **AgriGuard IoT Node** using an **ESP32 DevKit V1**, a **DHT22 Temperature & Humidity Sensor**, and a **Capacitive Soil Moisture Sensor v1.2**.

![AgriGuard IoT Exact Wire Schematic](C:/Users/lohit/Downloads/AgriGuard/docs/hardware/agriguard_exact_wire_schematic.jpg)

---

## 1. Where to Place the 10kΩ Resistor (Detailed Guide)

The **10kΩ pull-up resistor** is required for the DHT22 1-wire digital communication bus.

![DHT22 10k Resistor Placement Guide](C:/Users/lohit/Downloads/AgriGuard/docs/hardware/resistor_placement_zoom.jpg)

### Resistor Leg Placement:
- **Resistor Leg 1**: Connects into **Breadboard Row 10** (the same row as **DHT22 Pin 1: VCC** and the **3.3V power jumper**).
- **Resistor Leg 2**: Connects into **Breadboard Row 11** (the same row as **DHT22 Pin 2: DATA** and the **Yellow wire going to ESP32 Pin D4**).

### Important Resistor Facts:
1. **No Polarity**: Resistors have no positive or negative side. You can insert either leg in either direction.
2. **Color Bands**: 10kΩ is marked with **Brown – Black – Orange – Gold** stripes.
3. **Why It's Needed**: Without this pull-up resistor to 3.3V, the data line floats when idle, causing ESP32 reads to fail with `NaN` or `Sensor Timeout`.
4. **Sensor Type Check**:
   - If you have the **bare 4-pin white sensor**, you **must** use this resistor.
   - If you have a **3-pin module** mounted on a small blue/black PCB, the pull-up resistor is already soldered on the module board.

---

## 2. Complete Breadboard Row-by-Row Map

Assuming the DHT22 is plugged into Breadboard **Rows 10 through 13**:

| Breadboard Row | Connected Components | Purpose |
|---|---|---|
| **Row 10** | • DHT22 **Pin 1 (VCC)**<br>• Jumper wire to **(+) 3.3V Rail**<br>• **10kΩ Resistor (Leg 1)** | 3.3V Power Bus |
| **Row 11** | • DHT22 **Pin 2 (DATA)**<br>• **Yellow Wire** to **ESP32 Pin D4 (GPIO 4)**<br>• **10kΩ Resistor (Leg 2)** | 1-Wire Digital Signal Bus |
| **Row 12** | • DHT22 **Pin 3 (NC)** *(Nothing else connected)* | Not Connected |
| **Row 13** | • DHT22 **Pin 4 (GND)**<br>• Jumper wire to **(-) Ground Rail** | System Ground |

---

## 3. Microcontroller Pin Summary

- 🟡 **PIN D4 (GPIO 4)**: Top header (Pin 5) &rarr; Connects to **DHT22 Pin 2 (DATA)** via Yellow Wire.
- 🔵 **PIN D34 (GPIO 34)**: Bottom header (Pin 12) &rarr; Connects to **Soil Sensor AOUT** via Blue Wire.
- 🔴 **3V3**: Top header (Pin 1) &rarr; Connects to Breadboard **(+) Rail** via Red Wire.
- ⚫ **GND**: Top header (Pin 2) &rarr; Connects to Breadboard **(-) Rail** via Black Wire.

---

## 4. Interactive Browser View
Open [resistor_placement_guide.html](file:///c:/Users/lohit/Downloads/AgriGuard/docs/hardware/resistor_placement_guide.html) or [interactive_wiring_diagram.html](file:///c:/Users/lohit/Downloads/AgriGuard/docs/hardware/interactive_wiring_diagram.html) in your browser for the full interactive view.
