"""HC-SR04 ultrasonic distance sensor driver for height measurement.

Returns real height when sensor is connected. When not connected or no valid
samples, returns null so the app shows "sensor not detected".
"""

import time

try:
    import RPi.GPIO as GPIO
    _HAS_GPIO = True
except ImportError:
    try:
        import RPi_LGPIO as GPIO  # Pi 5
        _HAS_GPIO = True
    except ImportError:
        _HAS_GPIO = False

from config import HC_SR04_TRIG_PIN, HC_SR04_ECHO_PIN, HEIGHT_SENSOR_MOUNT_CM


class HCSR04:
    def __init__(self):
        self._simulated = not _HAS_GPIO
        if _HAS_GPIO:
            try:
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(HC_SR04_TRIG_PIN, GPIO.OUT)
                GPIO.setup(HC_SR04_ECHO_PIN, GPIO.IN)
                GPIO.output(HC_SR04_TRIG_PIN, False)
                time.sleep(0.1)
            except Exception:
                self._simulated = True

    def _measure_distance_cm(self):
        if self._simulated:
            return None

        GPIO.output(HC_SR04_TRIG_PIN, True)
        time.sleep(0.00001)
        GPIO.output(HC_SR04_TRIG_PIN, False)

        # Longer timeout (0.3s) so slow/noisy sensors still return a reading
        timeout = time.time() + 0.3
        start = time.time()
        while GPIO.input(HC_SR04_ECHO_PIN) == 0:
            start = time.time()
            if start > timeout:
                return None

        end = time.time()
        while GPIO.input(HC_SR04_ECHO_PIN) == 1:
            end = time.time()
            if end > timeout:
                return None

        duration = end - start
        distance_cm = duration * 17150
        # Ignore impossible readings (HC-SR04 range ~2–400 cm)
        if distance_cm < 0 or distance_cm > 400:
            return None
        return distance_cm

    def read(self, num_samples=5):
        if self._simulated:
            time.sleep(0.5)
            return {"heightCm": None}

        distances = []
        for _ in range(num_samples):
            d = self._measure_distance_cm()
            if d is not None:
                distances.append(d)
            time.sleep(0.1)

        if not distances:
            return {"heightCm": None}

        avg_distance = sum(distances) / len(distances)
        height_cm = round(HEIGHT_SENSOR_MOUNT_CM - avg_distance, 1)
        return {"heightCm": max(0, height_cm)}
