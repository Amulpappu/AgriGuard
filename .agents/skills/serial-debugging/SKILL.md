---
name: serial-debugging
description: >-
  Inspects, monitors, and decodes UART, USB, and COM serial port communication.
  Use when communicating with microcontrollers or diagnosing data exchange over serial.
---

# Serial Debugging Skill

## When to Use It
Activate this skill when streaming telemetry from a connected device, debugging serial packet formatting, or troubleshooting baud rate mismatches.

## Prerequisites
- Target COM port identifier (e.g. `COM3`, `/dev/ttyUSB0`).
- Target baud rate (standard: `115200` or `9600`).

## Step-by-Step Procedure
1. **Port Identification:**
   - List available serial devices using PowerShell (`[System.IO.Ports.SerialPort]::GetPortNames()`) or Python `serial.tools.list_ports`.
2. **Connection Parameters:**
   - Match Baud Rate, Data Bits (8), Parity (None), and Stop Bits (1).
   - Ensure DTR and RTS toggles do not accidentally hold the board in reset.
3. **Data Framing & Decoding:**
   - Parse framing delimiters (newline `\n` or JSON `{...}`).
   - Handle partial buffer chunks gracefully before passing to JSON decoders.
4. **Log Analysis:**
   - Check for bootloader crash dumps (e.g. ESP32 register dumps, guru meditation errors) and decode addresses.

## Verification Checklist
- [ ] No port locking conflicts (ensure other serial monitors are closed before opening).
- [ ] Stream decodes into valid UTF-8 strings without garbled control characters.

## Failure Recovery
- If garbled characters appear (e.g. `???`), switch baud rate to 115200, 74880, or 9600.

## Safety Constraints
- Always close serial connections when tasks complete to avoid holding hardware COM locks.
