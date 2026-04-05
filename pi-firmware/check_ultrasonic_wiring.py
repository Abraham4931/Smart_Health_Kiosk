#!/usr/bin/env python3
"""Check HC-SR04 wiring: prints pins, sends TRIG pulses, and watches if ECHO ever goes high.
Run on Pi (without venv if using apt GPIO): python3 check_ultrasonic_wiring.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import RPi.GPIO as GPIO
except ImportError:
    try:
        import RPi_LGPIO as GPIO
    except ImportError:
        print("Install GPIO first (see test_ultrasonic.py message).")
        sys.exit(1)

from config import HC_SR04_TRIG_PIN as TRIG, HC_SR04_ECHO_PIN as ECHO

# BCM 23 = physical 16, BCM 24 = physical 18 (40-pin header)
print("Config: TRIG = BCM", TRIG, "(physical pin 16)  ECHO = BCM", ECHO, "(physical pin 18)")
print("HC-SR04: VCC->5V, GND->GND, Trig->GPIO23, Echo->GPIO24 (or use 1k+2k divider on Echo)")
print("")

GPIO.setmode(GPIO.BCM)
GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)
GPIO.output(TRIG, False)
time.sleep(0.3)

echo_ever_high = False
for i in range(10):
    GPIO.output(TRIG, True)
    time.sleep(0.00001)
    GPIO.output(TRIG, False)
    for _ in range(500):
        if GPIO.input(ECHO) == 1:
            echo_ever_high = True
            break
        time.sleep(0.0001)
    time.sleep(0.2)

GPIO.cleanup()

if echo_ever_high:
    print("ECHO went HIGH at least once. Wiring may be OK; run test_ultrasonic.py for distance.")
else:
    print("ECHO never went HIGH. Check:")
    print("  1. Swap TRIG and ECHO (wrong way round is common).")
    print("  2. Use BCM numbers: GPIO 23 = physical 16, GPIO 24 = physical 18 (not physical 23/24).")
    print("  3. VCC to 5V (pin 2 or 4), GND to GND (pin 6).")
    print("  4. If ECHO is 5V, use a voltage divider (1k + 2k to GND) so Pi sees 3.3V.")
    sys.exit(1)
