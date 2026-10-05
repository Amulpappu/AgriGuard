# ESP32 and Embedded Electronics Rule

## Directive
When developing firmware, pin definitions, or IoT circuits for ESP32, Arduino, or microcontrollers:

1. **3.3V vs 5V Voltage Compatibility:**
   - ESP32 logic inputs operate strictly at 3.3V. Never connect a 5V digital signal directly to ESP32 pins without a level shifter or resistor voltage divider (e.g. 1kΩ / 2kΩ).
2. **Strapping Pins:**
   - Avoid using pins GPIO 0, 2, 12, 15 for sensor inputs that pull pins high or low during boot, which can trigger flash bootloader or cause brownout.
3. **ADC2 Restrictions:**
   - ADC2 channels cannot be read reliably when Wi-Fi is transmitting. Use ADC1 (GPIO 32, 33, 34, 35, 36, 39) for analog sensors like soil moisture or LDRs.
4. **Serial & Debugging:**
   - Always initialize `Serial.begin(115200)` and print clear diagnostic JSON or key-value telemetry logs.
5. **Credentials Isolation:**
   - Never embed Wi-Fi passwords or API keys directly in source files. Keep them in `config.h` (git-ignored) or fetch over BLE / Captive Portal.
