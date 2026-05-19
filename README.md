# 🤖 VacBot — Autonomous Vacuum Robot

> A complete **WiFi-connected, MQTT-controlled vacuum robot** with autonomous cleaning mode, real-time dashboard, and full simulator for testing.

---

## ✨ Quick Feature Overview

- 🎮 **Live Dashboard**: Real-time status, manual controls, auto mode tracking
- 🤖 **Autonomous Cleaning**: Boustrophedon pattern with obstacle avoidance
- 📊 **Sensor Suite**: Battery, distance, IMU, encoders
- 💻 **ESP32-S3 Powered**: WiFi + MQTT cloud connectivity
- 🧪 **Software Simulator**: Test everything without hardware
- 📱 **PWA Support**: Install as mobile app, works offline

---

## 📦 Project Files

```
Vaccum-Robot/
├── vacbot_firmware.ino         # ESP32-S3 Arduino firmware (complete)
├── index.html                  # Dashboard PWA (single file)
├── manifest.json               # PWA configuration
├── sw.js                       # Service worker for offline
├── simulator.js                # Node.js robot simulator
├── package.json                # Node.js dependencies
├── README.md                   # This file
├── SIMULATOR_GUIDE.md          # How to run simulator
├── RUN_SIMULATOR.bat           # Windows simulator launcher
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Getting Started

### Option A: Test with Simulator (Recommended First)

**Prerequisites:** Node.js (https://nodejs.org)

```bash
cd G:\Vaccum-Robot
npm install
npm run simulator
```

Then open `http://localhost:8000` in browser and connect!

**See:** [SIMULATOR_GUIDE.md](SIMULATOR_GUIDE.md) for details

### Option B: Real Robot (Requires Hardware)

**Step 1:** Create HiveMQ Cloud account and cluster
- Go to https://www.hivemq.cloud
- Create free cluster
- Note broker host and credentials

**Step 2:** Flash firmware to ESP32-S3
- Open `vacbot_firmware.ino` in Arduino IDE
- Edit CONFIG section (lines 9-23) with your WiFi & MQTT credentials
- Install required libraries (see below)
- Upload to ESP32-S3

**Step 3:** Open dashboard
- Host files (`index.html`, `manifest.json`, `sw.js`) on HTTPS server
- Or use locally with Python: `python -m http.server 8000`
- Click Settings ⚙️, enter credentials, click Connect

---

## 🔧 Configuration

### MQTT Credentials
Edit both `vacbot_firmware.ino` and `simulator.js`:

```cpp
// In firmware (lines 11-16):
#define MQTT_HOST    "0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud"
#define MQTT_PORT    8883
#define MQTT_USER    "VaccumRobot"
#define MQTT_PASS    "Vaccum@12345"
```

```js
// In simulator.js (lines 7-12):
const config = {
  host: '0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud',
  port: 8883,
  username: 'VaccumRobot',
  password: 'Vaccum@12345'
};
```

### Robot Parameters (Firmware Only)
```cpp
#define BATTERY_MAX_V      12.6f
#define BATTERY_MIN_V      9.0f
#define ROW_LENGTH_CM      150.0f   // Per-row cleaning distance
#define ROW_WIDTH_CM       20.0f    // Distance between rows
#define MAX_ROWS           10       // Total rows to clean
#define OBSTACLE_CM        15       // Obstacle threshold
#define TURN_DONE_DEG      88.0f    // Turn completion angle
#define PULSES_PER_REV     20       // Encoder pulses/rotation
#define WHEEL_DIAMETER_CM  6.5f     // Wheel diameter (cm)
```

---

## 📡 MQTT Topics Reference

All communication between robot and dashboard uses these topics (case-sensitive).

### Commands (Dashboard → Robot)

| Topic | Payload | Example |
|-------|---------|---------|
| `vacbot/cmd/movement` | `FORWARD` \| `BACKWARD` \| `LEFT` \| `RIGHT` \| `STOP` | `FORWARD` |
| `vacbot/cmd/suction` | `0-255` (PWM value) | `128` |
| `vacbot/cmd/mode` | `MANUAL` \| `AUTO` | `AUTO` |

### Status (Robot → Dashboard)

| Topic | Payload | Update Rate |
|-------|---------|-------------|
| `vacbot/status/battery` | `{"voltage":11.32,"percent":92.4,"health":"GOOD","alert":false}` | 2 sec |
| `vacbot/status/distance` | `{"cm":150.5,"obstacle":false}` | 0.5 sec |
| `vacbot/status/mode` | `MANUAL` \| `AUTO` | On change |
| `vacbot/status/auto` | `{"state":"MOVING_FORWARD","row":3,"yaw":45.2,...}` | 1 sec |
| `vacbot/status/online` | `online` \| `offline` | Persistent |

---

## 🏗️ Hardware Wiring

### Pin Assignments (ESP32-S3)

| Pin | GPIO | Component | Purpose |
|-----|------|-----------|---------|
| 1 | GPIO1 | Voltage Divider | Battery voltage sensing |
| 2 | GPIO2 | LED | Status indicator |
| 4 | GPIO4 | PWM | Suction motor speed |
| 5-8 | GPIO5-8 | Motor H-Bridge | Motor control (IN1-IN4) |
| 9 | GPIO9 | Ultrasonic | Trigger |
| 10 | GPIO10 | Ultrasonic | Echo |
| 11 | GPIO11 | MPU6050 | SDA (I2C data) |
| 12 | GPIO12 | MPU6050 | SCL (I2C clock) |
| 13 | GPIO13 | Encoder | Left wheel pulses |
| 14 | GPIO14 | Encoder | Right wheel pulses |

### Sensor Connections

**Motor Control (H-Bridge L298N):**
- ESP32 5→L298N IN1, 6→IN2 (Left motor)
- ESP32 7→L298N IN3, 8→IN4 (Right motor)
- Motor outputs to left/right DC motors

**Suction (PWM Fan):**
- ESP32 4 → Fan PWM
- 12V battery → Fan VCC (via relay if needed)

**Ultrasonic (HC-SR04):**
- ESP32 9 → TRIG, 10 → ECHO
- 5V → VCC, GND → GND

**IMU (MPU6050):**
- ESP32 11 → SDA, 12 → SCL
- 3.3V → VCC, GND → GND
- I2C pull-ups (4.7kΩ) recommended

**Encoders:**
- GPIO13 → Left encoder
- GPIO14 → Right encoder
- GND → Encoder GND

**Battery Monitor:**
- 12V through voltage divider (10kΩ to GND, 39kΩ from battery)
- Output → GPIO1 ADC

---

## 📚 Required Libraries

Install via **Arduino IDE → Sketch → Include Library → Manage Libraries:**

| Library | Version | Purpose |
|---------|---------|---------|
| **PubSubClient** (Nick O'Leary) | 2.8.0+ | MQTT client |
| **Adafruit MPU6050** | 2.2.0+ | IMU/Gyroscope |
| **Adafruit Unified Sensor** | 1.1.5+ | Sensor framework |
| **ArduinoJson** (Benoit Blanchon) | 6.20.0+ | JSON serialization |

### Arduino IDE Board Setup

- **Board:** ESP32S3 Dev Module
- **Upload Speed:** 921600
- **USB Mode:** Hardware CDC and JTAG
- **Flash Size:** 4MB (32Mb)
- **Port:** (select your COM port)

---

## ⚙️ Calibration & Tuning

### Encoder Calibration

1. **Measure wheel diameter:**
   - Mark reference point on wheel
   - Move forward exactly 10 rotations
   - Measure distance traveled
   - Diameter = distance / (10 × π)
   - Set `WHEEL_DIAMETER_CM` in firmware

2. **Count pulses per revolution:**
   - Temporarily set `PULSES_PER_REV = 1`
   - Move wheel manually, count encoder pulses per rotation
   - Update `PULSES_PER_REV` in firmware

### Auto Mode Tuning

- **ROW_LENGTH_CM:** Distance per forward pass (e.g., room width)
- **ROW_WIDTH_CM:** Gap between rows (e.g., robot width + margin)
- **MAX_ROWS:** Number of rows before completion
- **TURN_DONE_DEG:** Degrees to complete a turn (default: 88°)
  - Overshooting? Decrease to 85-86
  - Undershooting? Increase to 90-92

---

## 🧪 Simulator Features

The software simulator provides a realistic test environment:

✅ **Sensor Simulation:**
- Battery drain based on motor/suction activity
- Distance sensor with oscillating values
- Encoder pulse counting
- IMU gyroscope yaw integration

✅ **Behavior Simulation:**
- Complete state machine matching firmware
- Boustrophedon cleaning pattern
- Coverage calculation
- Obstacle detection

✅ **Testing:**
- MANUAL mode with realistic constraints
- AUTO mode row-by-row navigation
- Mode switching and state transitions
- Real-time MQTT communication

See [SIMULATOR_GUIDE.md](SIMULATOR_GUIDE.md) for setup instructions.

---

## 🐛 Troubleshooting

### "Cannot connect to broker"
- Verify HiveMQ credentials (host, port, username, password)
- Confirm internet connection
- Check HiveMQ Cloud console — cluster must be running

### "Dashboard offline after connecting"
- Hard refresh: **Ctrl+Shift+R**
- Clear browser cache: **Ctrl+Shift+Delete**
- Check browser console (F12) for MQTT errors
- Verify credentials match broker configuration

### "ESP32 won't connect to WiFi"
- Verify SSID and password are correct
- Check signal strength (at least -70 dBm)
- Reboot ESP32 (press RST button)
- Check Serial Monitor (115200 baud) for errors

### "Robot drifts during AUTO mode"
- Recalibrate encoder constants (PULSES_PER_REV, WHEEL_DIAMETER_CM)
- Verify motors turn at same speed
- Check wheel alignment
- Increase TURN_DONE_DEG (overshooting) or decrease (undershooting)

### "MPU6050 not found"
- Check I2C wiring (SDA on GPIO11, SCL on GPIO12)
- Verify 4.7kΩ pull-up resistors installed
- Try alternative I2C address (0x68 vs 0x69)
- Replace sensor if damaged

### "Service worker not updating"
- Hard refresh browser
- Clear application cache in DevTools (Application → Cache)
- Manually unregister old service workers

---

## 📖 Additional Documentation

- **[SIMULATOR_GUIDE.md](SIMULATOR_GUIDE.md)** — Running the software simulator
- **[README.md](README.md)** — This complete guide
- **Firmware Comments** — See `vacbot_firmware.ino` for detailed code documentation

---

## 🎯 Testing Checklist

### With Simulator
- [ ] Simulator connects to HiveMQ
- [ ] Dashboard shows GREEN online dot
- [ ] Battery depletes over time
- [ ] D-pad disabled in AUTO mode
- [ ] AUTO mode shows row progress (1/10, 2/10, etc.)
- [ ] Coverage reaches 100%
- [ ] Stop button returns to MANUAL
- [ ] System log shows all commands in real-time

### With Real Hardware
- [ ] ESP32 connects to WiFi
- [ ] Dashboard shows online status
- [ ] D-pad moves robot
- [ ] Suction fan responds to slider
- [ ] Battery percentage displays correctly
- [ ] Ultrasonic detects obstacles
- [ ] AUTO mode executes boustrophedon pattern
- [ ] Encoders track distance accurately
- [ ] Gyroscope yaw updates during turns
- [ ] Robot stops when battery critical

---

## 📈 System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    HiveMQ Cloud                       │
│          (Public MQTT Broker - Port 8883/8884)        │
└─────────────┬──────────────────────────┬──────────────┘
              │                          │
      ┌───────▼────────┐       ┌─────────▼────────┐
      │   ESP32-S3     │       │  Web Dashboard   │
      │   (Firmware)   │       │   (PWA/HTML)     │
      │                │       │                  │
      │ • WiFi + TLS   │       │ • MQTT.js        │
      │ • Sensors      │       │ • Service Worker │
      │ • Motors       │       │ • Beautiful UI   │
      │ • Pub/Sub      │       │ • Offline Cache  │
      └────────────────┘       └──────────────────┘
              ▲
              │
      ┌───────┴──────────┐
      │    Simulator     │
      │   (Node.js)      │
      │                  │
      │ • Fake sensors   │
      │ • MQTT client    │
      │ • Realistic sim  │
      └──────────────────┘
```

---

## 🔐 Security Considerations

⚠️ **Production Deployment:**
- MQTT credentials are stored in firmware → unique credentials required
- WiFi password visible in code → change before deployment
- Use HTTPS only for dashboard (PWA requires secure context)
- TLS 1.2 enabled for HiveMQ connection

✅ **Current Setup:**
- Let's Encrypt root CA included in firmware
- WebSocket Secure (WSS) for dashboard
- Password-protected HiveMQ cluster

---

## 📝 License & Credits

**Open Source** — MIT License

**Author:** BimalaWijekoon  
**Repository:** https://github.com/BimalaWijekoon/Vaccum-Robot

---

**Ready to start?** 🚀

1. Start with the **[SIMULATOR_GUIDE.md](SIMULATOR_GUIDE.md)** to test without hardware
2. Once comfortable, **flash the firmware** to your ESP32-S3
3. Deploy the **dashboard** on your server
4. Enjoy your autonomous robot! 🤖

Questions? Review the firmware comments or check the troubleshooting section above.

#   V a c c u m - R o b o t  
 