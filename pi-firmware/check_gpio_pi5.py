#!/usr/bin/env python3
"""Quick check: can we use GPIO on this Pi? Run on the Pi: python3 check_gpio_pi5.py"""
import sys

def main():
    print("Checking GPIO for Pi 5...")
    # Try Pi 5 first (rpi-lgpio), then Pi 4 (RPi.GPIO)
    try:
        import RPi_LGPIO as GPIO
        print("OK: RPi_LGPIO (rpi-lgpio) found. Pi 5 supported.")
        return 0
    except ImportError:
        pass
    try:
        import RPi.GPIO as GPIO
        print("OK: RPi.GPIO found. Pi 4 or older.")
        return 0
    except ImportError:
        pass
    print("No GPIO module found. On Pi 5 install: pip install rpi-lgpio")
    print("Or: sudo apt update && sudo apt install -y python3-rpi-lgpio")
    return 1

if __name__ == "__main__":
    sys.exit(main())
