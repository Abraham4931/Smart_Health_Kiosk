#!/usr/bin/env python3
"""Standalone test for ECG (AD8232) on Raspberry Pi.

Tests lead-off detection via LO+ and LO- pins. Optionally reads raw
analog from ADS1115 if connected (AD8232 OUTPUT -> ADS1115 A0).

Run ON THE RASPBERRY PI: python3 test_ecg.py

Wiring (AD8232):
  - LO+ (pin 8) -> BCM 17 (config: ECG_LO_PLUS_PIN)
  - LO- (pin 9) -> BCM 27 (config: ECG_LO_MINUS_PIN)
  - OUTPUT -> ADS1115 A0 (optional) for waveform

When leads are attached: LO+ and LO- are LOW. When detached: they go HIGH.
Press Ctrl+C to stop.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import RPi.GPIO as GPIO
    _gpio_backend = "RPi.GPIO (Pi 4 or older)"
except ImportError:
    try:
        import RPi_LGPIO as GPIO
        _gpio_backend = "RPi_LGPIO (Pi 5)"
    except ImportError:
        print("Error: No GPIO module. Run this ON THE RASPBERRY PI.")
        print("  Pi 5: sudo apt install python3-rpi-lgpio  then run: python3 test_ecg.py")
        print("  Pi 4 or older: sudo apt install python3-rpi.gpio")
        sys.exit(1)
print("Using", _gpio_backend)

from config import ECG_LO_PLUS_PIN, ECG_LO_MINUS_PIN, ADS1115_ADDR

GPIO.setmode(GPIO.BCM)
GPIO.setup(ECG_LO_PLUS_PIN, GPIO.IN)
GPIO.setup(ECG_LO_MINUS_PIN, GPIO.IN)

# Optional: ADS1115 for raw ECG voltage (AD8232 OUTPUT -> A0)
_ads = None
try:
    import smbus
    _bus = smbus.SMBus(1)
    _bus.read_byte_data(ADS1115_ADDR, 0)  # probe
    _ads = _bus
    print("ADS1115 detected at 0x{:02X}. Will read raw A0.".format(ADS1115_ADDR))
except Exception:
    print("ADS1115 not used (optional). Only lead-off GPIO test.")

# ADS1115 config: single-shot A0, +/-4.096V, 128 SPS
def _read_ads1115_a0():
    if _ads is None:
        return None
    # Config reg: OS=1 (start), Mux=A0-gnd, PGA=+/-4.096V, Mode=single, 128 SPS
    _ads.write_i2c_block_data(ADS1115_ADDR, 0x01, [0xC1, 0x83])  # 0xC183
    time.sleep(0.02)
    data = _ads.read_i2c_block_data(ADS1115_ADDR, 0x00, 2)
    raw = (data[0] << 8) | data[1]
    if raw >= 0x8000:
        raw -= 0x10000
    # 4.096V / 32768
    return raw * (4.096 / 32768.0)

print("ECG lead-off test. LO+ = BCM {}, LO- = BCM {}".format(ECG_LO_PLUS_PIN, ECG_LO_MINUS_PIN))
print("Attach electrodes: LO+ and LO- should read LOW. Detached: HIGH.")
print("(Reading every 1 s. Ctrl+C to stop)\n")

try:
    while True:
        lo_plus = GPIO.input(ECG_LO_PLUS_PIN)
        lo_minus = GPIO.input(ECG_LO_MINUS_PIN)
        if lo_plus and lo_minus:
            status = "Leads OFF (or sensor not connected)"
        elif lo_plus:
            status = "LO+ OFF (check right arm/left arm lead)"
        elif lo_minus:
            status = "LO- OFF (check right leg lead)"
        else:
            status = "Leads ON - signal OK"
        line = "LO+={} LO-={} -> {}".format(lo_plus, lo_minus, status)
        v = _read_ads1115_a0()
        if v is not None:
            line += "  |  A0={:+.3f} V".format(v)
        print(line)
        time.sleep(1)
except KeyboardInterrupt:
    print("\nStopped.")
finally:
    GPIO.cleanup()
