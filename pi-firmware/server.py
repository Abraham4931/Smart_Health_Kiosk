"""Smart Health Kiosk - Raspberry Pi Sensor Server.

Uses only Python standard library (no Flask/pip). Exposes a REST API
for the mobile app to connect, trigger measurements, and receive vital sign data.
"""

import json
import sys
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))

from config import KIOSK_ID, SERVER_HOST, SERVER_PORT

# Optional: load hardware drivers. If missing (no smbus2/rpi-lgpio), use stubs so server still runs.
try:
    from drivers.max30102 import MAX30102
    from drivers.mlx90614 import MLX90614
    from drivers.weight_sensor import WeightSensor
    from drivers.hcsr04 import HCSR04
    from drivers.bp_sensor import BPSensor
    pulse_ox = MAX30102()
    temp_sensor = MLX90614()
    weight_sensor = WeightSensor()
    height_sensor = HCSR04()
    bp_sensor = BPSensor()
    _has_drivers = True
except Exception as e:
    print(f"Warning: drivers not loaded ({e}). /status will work; /measure may return stub data.")
    _has_drivers = False
    pulse_ox = temp_sensor = weight_sensor = height_sensor = bp_sensor = None


def _stub_sensor(name):
    return {"error": "sensor not available", "sensor": name}


def _read_sensor(sensor_type):
    if not _has_drivers:
        return _stub_sensor(sensor_type)
    handlers = {
        "bp": lambda: bp_sensor.read(),
        "spo2_hr": lambda: pulse_ox.read(),
        "temperature": lambda: temp_sensor.read(),
        "weight": lambda: weight_sensor.read(),
        "height": lambda: height_sensor.read(),
    }
    h = handlers.get(sensor_type)
    return h() if h else _stub_sensor(sensor_type)


def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


class KioskHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, data, extra_headers=None):
        body = json.dumps(data).encode("utf-8")
        h = {"Content-Type": "application/json", "Content-Length": len(body), **_cors_headers()}
        if extra_headers:
            h.update(extra_headers)
        self.send_response(status)
        for k, v in h.items():
            self.send_header(k, str(v))
        self.end_headers()
        self.wfile.write(body)

    def _parse_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in _cors_headers().items():
            self.send_header(k, v)
        self.send_header("Content-Length", 0)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/status":
            self._send_json(200, {
                "kioskId": KIOSK_ID,
                "status": "online",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "sensors": ["bp", "spo2_hr", "temperature", "weight", "height"],
            })
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/measure":
            data = self._parse_json_body()
            sensor_type = data.get("sensor", "")
            if not sensor_type:
                self._send_json(400, {"error": "Missing sensor"})
                return
            result = _read_sensor(sensor_type)
            self._send_json(200, {
                "sensor": sensor_type,
                "data": result,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
        elif path == "/measure/all":
            if not _has_drivers:
                self._send_json(200, {
                    "kioskId": KIOSK_ID,
                    "vitals": {"error": "Drivers not loaded"},
                    "measuredAt": datetime.utcnow().isoformat() + "Z",
                })
                return
            bp_data = bp_sensor.read()
            ox_data = pulse_ox.read()
            temp_data = temp_sensor.read()
            weight_data = weight_sensor.read()
            height_data = height_sensor.read()
            vitals = {**bp_data, **ox_data, **temp_data, **weight_data, **height_data}
            weight_kg = vitals.get("weightKg")
            height_cm = vitals.get("heightCm")
            if weight_kg and height_cm and height_cm > 0:
                vitals["bmi"] = round(weight_kg / ((height_cm / 100) ** 2), 1)
            systolic = vitals.get("systolicBP")
            diastolic = vitals.get("diastolicBP")
            if systolic and diastolic:
                vitals["meanArterialPressure"] = round(diastolic + (systolic - diastolic) / 3, 1)
            self._send_json(200, {
                "kioskId": KIOSK_ID,
                "vitals": vitals,
                "measuredAt": datetime.utcnow().isoformat() + "Z",
            })
        else:
            self._send_json(404, {"error": "Not found"})

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")


if __name__ == "__main__":
    print(f"Kiosk {KIOSK_ID} sensor server starting on {SERVER_HOST}:{SERVER_PORT} (stdlib only, no Flask)")
    server = HTTPServer((SERVER_HOST, SERVER_PORT), KioskHandler)
    server.serve_forever()
