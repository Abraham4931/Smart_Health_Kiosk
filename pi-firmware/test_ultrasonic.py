#!/usr/bin/env python3
"""Standalone test for HC-SR04 ultrasonic (same logic as your working script).
Uses config pins. Run ON THE RASPBERRY PI (not on PC): python test_ultrasonic.py
Press Ctrl+C to stop. See ULTRASONIC_HEIGHT.md for wiring (TRIG=BCM 23, ECHO=BCM 24).
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
        import RPi_LGPIO as GPIO  # Pi 5
        _gpio_backend = "RPi_LGPIO (Pi 5)"
    except ImportError:
        print("Error: No GPIO module. Run this ON THE RASPBERRY PI.")
        print("  Pi 5 (apt): sudo apt install python3-rpi-lgpio  then run WITHOUT venv:")
        print("    deactivate && python3 test_ultrasonic.py")
        print("  Pi 5 (pip): pip install rpi-lgpio  (needs internet)")
        print("  Pi 4 or older: sudo apt install python3-rpi.gpio")
        sys.exit(1)
print("Using", _gpio_backend)

from config import HC_SR04_TRIG_PIN as TRIG, HC_SR04_ECHO_PIN as ECHO

GPIO.setmode(GPIO.BCM)
GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)
GPIO.output(TRIG, False)
time.sleep(0.5)

# Timeout so we don't hang if no echo
TIMEOUT_S = 0.3

try:
    while True:
        GPIO.output(TRIG, True)
        time.sleep(0.00001)
        GPIO.output(TRIG, False)

        timeout = time.time() + TIMEOUT_S
        while GPIO.input(ECHO) == 0:
            pulse_start = time.time()
            if pulse_start > timeout:
                print("Distance: (timeout)")
                break
        else:
            pulse_end = None
            while GPIO.input(ECHO) == 1:
                pulse_end = time.time()
                if pulse_end > timeout:
                    break
            if pulse_end is not None and pulse_end <= timeout:
                pulse_duration = pulse_end - pulse_start
                distance = pulse_duration * 17150
                if 0 <= distance <= 400:
                    print("Distance:", round(distance, 2), "cm")
                else:
                    print("Distance: (out of range)", round(distance, 2))

        time.sleep(1)
except KeyboardInterrupt:
    print("\nStopped.")
finally:
    GPIO.cleanup()
