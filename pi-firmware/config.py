KIOSK_ID = "KIOSK-001"
WIFI_SSID = "SmartHealthKiosk-001"
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 5000

# I2C addresses
MAX30102_ADDR = 0x57
MLX90614_ADDR = 0x5A
ADS1115_ADDR = 0x48  # ECG analog in via ADS1115 (optional)

# GPIO pins
HX711_DOUT_PIN = 5
HX711_SCK_PIN = 6
HC_SR04_TRIG_PIN = 23
HC_SR04_ECHO_PIN = 24
# ECG (AD8232): lead-off detection (LO+, LO-). OUTPUT goes to ADC (e.g. ADS1115) for waveform.
ECG_LO_PLUS_PIN = 17   # BCM: LO+ (high when lead off)
ECG_LO_MINUS_PIN = 27  # BCM: LO- (high when lead off)

# Calibration
HX711_SCALE_FACTOR = 420.0
HX711_OFFSET = 0
HEIGHT_SENSOR_MOUNT_CM = 220.0
