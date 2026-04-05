"""HX711 load cell amplifier driver for weight measurement.

Returns real weight when sensor is connected. When not connected,
returns null so the app shows "sensor not detected".
"""

import time

try:
    import RPi.GPIO as GPIO
    _HAS_GPIO = True
except ImportError:
    _HAS_GPIO = False

from config import HX711_DOUT_PIN, HX711_SCK_PIN, HX711_SCALE_FACTOR, HX711_OFFSET


class HX711:
    def __init__(self):
        self._simulated = not _HAS_GPIO
        if _HAS_GPIO:
            try:
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(HX711_DOUT_PIN, GPIO.IN)
                GPIO.setup(HX711_SCK_PIN, GPIO.OUT)
            except Exception:
                self._simulated = True

    def _read_raw(self):
        if self._simulated:
            return 0

        while GPIO.input(HX711_DOUT_PIN):
            pass

        value = 0
        for _ in range(24):
            GPIO.output(HX711_SCK_PIN, True)
            value = (value << 1) | GPIO.input(HX711_DOUT_PIN)
            GPIO.output(HX711_SCK_PIN, False)

        GPIO.output(HX711_SCK_PIN, True)
        GPIO.output(HX711_SCK_PIN, False)

        if value & 0x800000:
            value -= 0x1000000
        return value

    def read(self, num_samples=10):
        if self._simulated:
            time.sleep(1)
            return {"weightKg": None}

        readings = []
        for _ in range(num_samples):
            readings.append(self._read_raw())
            time.sleep(0.05)

        avg = sum(readings) / len(readings)
        weight_kg = round((avg - HX711_OFFSET) / HX711_SCALE_FACTOR, 1)
        # Treat 0 or negative as no sensor / no reading (like other params)
        if weight_kg <= 0:
            return {"weightKg": None}
        return {"weightKg": weight_kg}
