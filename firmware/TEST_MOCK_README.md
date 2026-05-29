# VacBot Mock Test Firmware

Test the dashboard and MQTT connection **without needing hardware** — the mock firmware automatically publishes fake sensor data.

## What It Does

✅ Connects to your WiFi  
✅ Connects to HiveMQ MQTT broker  
✅ **Publishes mock data** every 500ms-2s:
- Battery status (85% → 10%, simulates drain)
- Distance sensor (varies 5-200cm, with obstacle detection)
- Mode status (MANUAL/AUTO)
- Auto mode status (row progression, gyro angle, encoder data)
- Heartbeat (every 10s)

✅ **Receives commands** from Dashboard:
- Mode switches (MANUAL ↔ AUTO)
- Movement commands (logged)
- Suction control (logged)

## How to Use

### **Option 1: Swap Source Files (Easy)**

The mock uses the same pin definitions, so you can test with just a code swap:

```bash
cd firmware/src/

# Backup real firmware
mv main.cpp main_real.cpp

# Use mock test
mv test_mock.cpp main.cpp
```

Then build & upload normally:
```bash
platformio run --target upload
```

### **Option 2: Create a Build Variant (Better)**

In `platformio.ini`, add a second environment:

```ini
[env:esp32-s3-test]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200
upload_speed = 921600

; Test-specific source
src_filter = +<test_mock.cpp>

lib_deps =
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^6.21.3

build_flags = -DTEST_MODE
```

Then build & upload the test version:
```bash
platformio run -e esp32-s3-test --target upload
```

## What to Watch For

**Serial Monitor Output:**
```
[WIFI] Connecting to WiFi...
[WIFI] ✅ Connected!
[WIFI] IP: 192.168.x.x

[MQTT] Connecting...
[MQTT] ✅ CONNECTED!
[MQTT] Subscribed to command topics

[PUB] Battery: 85% 11.2V — GOOD
[PUB] Distance: 47cm — Obstacle: No
[PUB] Mode: MANUAL
```

**Dashboard Should:**
- ✅ Show battery percentage decreasing (simulated drain)
- ✅ Show distance changing randomly
- ✅ Allow mode switching (MANUAL ↔ AUTO)
- ✅ Show auto progress when in AUTO mode (rows, coverage %)

**Test Command Flow:**
1. Open Dashboard
2. Switch to AUTO mode
3. Watch serial monitor — should print: `[MOCK] Mode changed: AUTO`
4. Dashboard should show row progression (0→10)
5. Switch back to MANUAL
6. Dashboard should stop updating auto status

## Configuration

Edit these lines in `test_mock.cpp` (lines 17-21):

```cpp
#define WIFI_SSID      "COMFRI"           // Your WiFi SSID
#define WIFI_PASS      "your_password"    // Your WiFi password
#define MQTT_HOST      "0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud"
#define MQTT_USER      "VaccumRobot"
#define MQTT_PASS      "Vaccum@12345"
```

These **must match your real firmware** so both use the same MQTT broker.

## Switching Back to Real Firmware

```bash
cd firmware/src/

# Restore real firmware
mv main.cpp test_mock.cpp
mv main_real.cpp main.cpp
```

Then rebuild:
```bash
platformio run --target upload
```

## Testing Checklist

- [ ] Mock connects to WiFi (see IP in serial)
- [ ] Mock connects to MQTT (see "CONNECTED!" in serial)
- [ ] Dashboard receives battery updates
- [ ] Dashboard receives distance updates
- [ ] Dashboard mode switch works (check serial for "Mode changed")
- [ ] AUTO mode shows row progression
- [ ] Dashboard responds to mock data changes
- [ ] Gyro angle displays in AUTO mode

## Troubleshooting

**Mock won't connect to MQTT:**
- Check WiFi SSID/password (line 17-18)
- Check MQTT credentials match (line 20-21)
- Verify broker is accessible (test on dashboard)
- Check TLS certificate (same one as main.cpp)

**No data on Dashboard:**
- Make sure Dashboard is subscribed to same topics
- Check MQTT broker credentials on Dashboard
- Verify WiFi is working (`[WIFI] ✅ Connected!`)

**Mode commands not being received:**
- Check serial monitor for `[MQTT-RX] Topic: ...`
- Verify you're sending to correct topic (`vacbot/cmd/mode`)
- Make sure Dashboard is connected to same broker

## Files

- `main.cpp` — Real firmware (motor control, sensors)
- `test_mock.cpp` — Mock test firmware (no hardware needed)
- Both publish to same MQTT topics
- Both accept same commands

Perfect for validating the entire system before deploying to hardware! 🧪
