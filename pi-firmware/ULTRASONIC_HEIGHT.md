# HC-SR04 ultrasonic height sensor – wiring and test

## Run the test on the Pi (not on your PC)

`test_ultrasonic.py` and the height driver use **RPi.GPIO**, which only works on the Raspberry Pi. Run everything **on the Pi** (SSH or directly):

```bash
cd ~/pi-firmware
source venv/bin/activate   # if you use venv
python test_ultrasonic.py
```

You should see lines like `Distance: 45.2 cm` every second. Press **Ctrl+C** to stop. If you see `(timeout)` or nothing, the wiring or sensor is wrong.

---

## Wiring (config: TRIG=23, ECHO=24)

From **config.py**: **Trig = BCM 23**, **Echo = BCM 24**.

| HC-SR04 pin | Connect to        | Pi physical pin (example) |
|-------------|-------------------|---------------------------|
| **VCC**     | 5V                | Pin 2 or 4 (5V)           |
| **GND**     | Ground            | Pin 6, 9, 14, 20, 25, 30, 34, 39 |
| **Trig**    | GPIO 23 (BCM)     | Physical **16**           |
| **Echo**    | GPIO 24 (BCM)     | Physical **18**           |

- **BCM 23** = physical pin **16**
- **BCM 24** = physical pin **18**

**Important:** HC-SR04 Echo outputs **5V**. The Pi GPIO is **3.3V**. To avoid damaging the Pi:

- **Option A (safest):** Use a **voltage divider** on Echo:  
  Echo → 1kΩ → GPIO 24 (BCM) → 2kΩ → GND. So Echo goes through 1kΩ to the Pi pin, and the Pi pin has 2kΩ to GND (gives ~3.3V).
- **Option B:** Some boards work with Echo straight to GPIO; if you try that, do it only at your own risk.

Trig can go straight from HC-SR04 Trig to Pi GPIO 23 (Trig is input on the sensor, driven by the Pi).

---

## Check wiring

1. **Power:** VCC to 5V, GND to GND. No 5V on Trig/Echo except through the divider on Echo.
2. **Trig:** One wire from sensor **Trig** to Pi **GPIO 23** (physical 16). No other connection to Trig.
3. **Echo:** From sensor **Echo** through the divider (or direct if you’re sure it’s safe) to Pi **GPIO 24** (physical 18).

---

## How height is calculated

In **config.py**: `HEIGHT_SENSOR_MOUNT_CM = 220.0` (sensor is 220 cm above the floor).

- **Distance** = sensor to top of head (cm), from the ultrasonic reading.
- **Height** = `220 - distance` (cm).

So if the test prints `Distance: 45.0 cm`, the person’s height is about **175 cm**. Adjust `HEIGHT_SENSOR_MOUNT_CM` in **config.py** to match how high your sensor is mounted.

---

## "Distance: (timeout)" every time

That means **ECHO never goes high** – the Pi isn’t seeing a pulse from the sensor.

**1. Run the wiring check:**
```bash
python3 check_ultrasonic_wiring.py
```
It will tell you if ECHO ever goes high and remind you of the correct pins.

**2. Typical fixes:**

| Problem | Fix |
|--------|-----|
| **TRIG and ECHO swapped** | Swap the two wires between sensor and Pi (Trig↔Echo). |
| **Wrong pin numbers** | Use **BCM**: GPIO **23** = physical **16**, GPIO **24** = physical **18**. Not physical pins 23 and 24. |
| **No power** | VCC → 5V (pin 2 or 4), GND → GND (pin 6). |
| **ECHO 5V into Pi** | Use a voltage divider on ECHO (1kΩ to GPIO 24, 2kΩ from GPIO 24 to GND). |
| **Loose wire** | Reseat all four connections. |

**3. Pinout:** On the Pi run `pinout` to see the 40-pin header; BCM 23 and 24 are printed there.

---

## If the test still fails on the Pi

1. **Check GPIO:** `pinout` (on Pi) shows BCM numbers. Confirm 23 and 24 are free.
2. **Permissions:** Run with `sudo python3 test_ultrasonic.py` only to test; normally run without sudo and fix GPIO permissions if needed.
3. **Pi 5:** Use system Python (no venv) after `sudo apt install python3-rpi-lgpio`, or install rpi-lgpio in the venv when the Pi has internet.
