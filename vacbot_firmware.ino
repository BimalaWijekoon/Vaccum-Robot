// ============================================================================
// VacBot Firmware for ESP32-S3
// ============================================================================
// Complete Arduino C++ sketch. Edit only the CONFIG section below.
// Libraries required: PubSubClient, Adafruit MPU6050, Adafruit Unified Sensor, ArduinoJson
// ============================================================================

// ============================================================================
// CONFIG SECTION — EDIT THESE VALUES ONLY
// ============================================================================
#define WIFI_SSID                "YourWiFiName"
#define WIFI_PASS                "YourWiFiPassword"
#define MQTT_HOST                "0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud"
#define MQTT_PORT                8883
#define MQTT_USER                "VaccumRobot"
#define MQTT_PASS                "Vaccum@12345"
#define BATTERY_MAX_V            12.6f
#define BATTERY_MIN_V            9.0f
#define PULSES_PER_REV           20
#define WHEEL_DIAMETER_CM        6.5f
#define ROW_LENGTH_CM            150.0f
#define ROW_WIDTH_CM             20.0f
#define MAX_ROWS                 10
#define OBSTACLE_CM              15
#define TURN_DONE_DEG            88.0f
// ============================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// GPIO Pin Definitions
#define PIN_VOLTAGE    1
#define PIN_SUCTION    4
#define PIN_IN1        5
#define PIN_IN2        6
#define PIN_IN3        7
#define PIN_IN4        8
#define PIN_TRIG       9
#define PIN_ECHO       10
#define PIN_SDA        11
#define PIN_SCL        12
#define PIN_ENC_LEFT   13
#define PIN_ENC_RIGHT  14
#define PIN_LED        2

// MQTT Topics
#define T_CMD_MOVEMENT  "vacbot/cmd/movement"
#define T_CMD_SUCTION   "vacbot/cmd/suction"
#define T_CMD_MODE      "vacbot/cmd/mode"
#define T_STAT_BATTERY  "vacbot/status/battery"
#define T_STAT_DISTANCE "vacbot/status/distance"
#define T_STAT_MODE     "vacbot/status/mode"
#define T_STAT_AUTO     "vacbot/status/auto"
#define T_STAT_ONLINE   "vacbot/status/online"

// TLS Root Certificate (Let's Encrypt ISRG Root X1)
static const char* ROOT_CA PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2FrpDAwDQYJKoZIhvcNAQELBQAw
RzELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGElu
dGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0xNjA0MDEwMjA5MTBaFw0yMDA0MDEw
MjA5MTBaMEcxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYD
VQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQC7VJTUt9Us8cKjMzEfYyjiWA4/qkHsZ693SQAf0P9yQ7Zc
+LQ+tFMKOcL1A1Z7IlZ+q5r9/hn9t7VdqlTaZU1cH1Vxvl8H2HfXyKr2mPRxB0PH
nNi/0sGqgB6c0b6s1WZM3K8PN2ZQNK5XqX3B4p+VV7SJSvIVv9BvXFl8K9aX5mN+
LoVjVxVH7B9fxWmqFPp2Z1+wKn1n0ktCQ/Q3oJhvSPRKP6vvKK/T2pnj7PqL+r3N
lMGLXs5dGKUe3n5d3GNQ0cMGTHxV6V1sQ5F2xQVALhqQVhQrQ3hqiK6s/ZMJSMOo
Dz7/jfwFqHxJKM8Q6c/cjBEe8TqV6a5tXK2H9lRxhgHHVKltMFfxj3F1F5VX5bLR
pu/cqKVq3qqUjxEJN5EzJFhgRc5MmcTIKrK9oi3qKX7rVW5gqBZzlXqvP6xZ3XPZ
23G2wCCVpKSV1QIDAQABMA0GCSqGSIb3DQEBAQUAA4ICAQBM8bBGEKoP4dWNSpQH
B5LbEKsW3mLnH6pGVL4Rr+BzXrLz/qBDMT9FpgBJmr7X6W0qiU8zXpJlFX0VJjLL
Gyh5LVLV7YI4l/LVhIwMuRZg7KwI5dz4W2pzrp1rVxbVfnVNg6UgPwwXJwRcxhqC
8vt8eTAjn1Pm3B2d7SRKPHcXoIkqNR8BkJZc1DZsw7P1nDJ8pGVsXnPrgEpDWDqw
BDJ1TLH8vKV76BzqKZ1eCfuIiUxpUGGJwDfKhPy3aUgdBaOqcmTNVi5nqrZqXgzL
BXJQqqS7KhKKaKKPMPJ8mNXGF7kJmXmPSxAiDUGfvvFa0yE/Lrqvvr3DJBM4yZJv
38tPU0nSLFDCXmAOwWq4FXnFKRfHCyFYXDXP9eEv8A==
-----END CERTIFICATE-----
)EOF";

// Global Variables
WiFiClientSecure secureClient;
PubSubClient mqtt(secureClient);
Adafruit_MPU6050 mpu;

volatile long leftPulses = 0;
volatile long rightPulses = 0;
float yaw = 0.0f;
float yawRef = 0.0f;
unsigned long lastGyroMs = 0;

String currentMode = "MANUAL";
int currentSuction = 0;
bool obstacleDetected = false;
float distanceCm = 999.0f;

unsigned long lastBatteryPub = 0;
unsigned long lastDistancePub = 0;
unsigned long lastAutoPub = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long reconnectDelay = 2000;

enum AutoState {
  AUTO_IDLE,
  AUTO_START_ROW,
  AUTO_MOVING_FORWARD,
  AUTO_OBSTACLE_AVOID,
  AUTO_ROW_COMPLETE,
  AUTO_TURNING_1,
  AUTO_SHIFTING,
  AUTO_TURNING_2,
  AUTO_COMPLETE
};

AutoState autoState = AUTO_IDLE;
int autoRow = 0;
int turnDir = 1;
int obstacleRetry = 0;
unsigned long obstacleTimer = 0;
float coveragePct = 0.0f;
const float DIST_PER_PULSE = (PI * WHEEL_DIAMETER_CM) / PULSES_PER_REV;

// ============================================================================
// Interrupt Service Routines
// ============================================================================
void IRAM_ATTR leftEncoderISR() {
  leftPulses++;
}

void IRAM_ATTR rightEncoderISR() {
  rightPulses++;
}

// ============================================================================
// Motor Control Functions
// ============================================================================
void motorsStop() {
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, LOW);
  digitalWrite(PIN_IN3, LOW);
  digitalWrite(PIN_IN4, LOW);
}

void motorsForward() {
  digitalWrite(PIN_IN1, HIGH);
  digitalWrite(PIN_IN2, LOW);
  digitalWrite(PIN_IN3, HIGH);
  digitalWrite(PIN_IN4, LOW);
}

void motorsBackward() {
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, HIGH);
  digitalWrite(PIN_IN3, LOW);
  digitalWrite(PIN_IN4, HIGH);
}

void motorsLeft() {
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, HIGH);
  digitalWrite(PIN_IN3, HIGH);
  digitalWrite(PIN_IN4, LOW);
}

void motorsRight() {
  digitalWrite(PIN_IN1, HIGH);
  digitalWrite(PIN_IN2, LOW);
  digitalWrite(PIN_IN3, LOW);
  digitalWrite(PIN_IN4, HIGH);
}

void setMotorsByCmd(String cmd) {
  if (obstacleDetected && cmd == "FORWARD") {
    motorsStop();
    return;
  }
  
  if (cmd == "FORWARD") {
    motorsForward();
  } else if (cmd == "BACKWARD") {
    motorsBackward();
  } else if (cmd == "LEFT") {
    motorsLeft();
  } else if (cmd == "RIGHT") {
    motorsRight();
  } else if (cmd == "STOP") {
    motorsStop();
  }
}

// ============================================================================
// Encoder Functions
// ============================================================================
void resetEncoders() {
  leftPulses = 0;
  rightPulses = 0;
}

float avgDistCm() {
  return ((leftPulses + rightPulses) / 2.0f) * DIST_PER_PULSE;
}

// ============================================================================
// Yaw/IMU Functions
// ============================================================================
void updateYaw() {
  if (millis() - lastGyroMs < 50) {
    return;
  }
  
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  float dt = (millis() - lastGyroMs) / 1000.0f;
  yaw += g.gyro.z * (180.0f / PI) * dt;
  lastGyroMs = millis();
}

void resetYawRef() {
  yawRef = yaw;
}

float yawDelta() {
  return abs(yaw - yawRef);
}

// ============================================================================
// Battery Functions
// ============================================================================
float readVoltage() {
  return analogRead(PIN_VOLTAGE) * (3.3f / 4095.0f) * 5.0f;
}

int voltageToPercent(float voltage) {
  int percent = (int)(((voltage - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
  return constrain(percent, 0, 100);
}

String voltageToHealth(int percent) {
  if (percent >= 95) return "EXCELLENT";
  if (percent >= 75) return "GOOD";
  if (percent >= 50) return "FAIR";
  if (percent >= 25) return "LOW";
  return "CRITICAL";
}

void publishBattery() {
  float voltage = readVoltage();
  int percent = voltageToPercent(voltage);
  String health = voltageToHealth(percent);
  bool alert = (percent < 25);
  
  if (alert) {
    motorsStop();
    ledcWrite(0, 0);
    if (currentMode == "AUTO") {
      autoState = AUTO_IDLE;
      currentMode = "MANUAL";
      mqtt.publish(T_STAT_MODE, "MANUAL", true);
    }
  }
  
  StaticJsonDocument<256> doc;
  doc["voltage"] = serialized(String(voltage, 1));
  doc["percent"] = percent;
  doc["health"] = health;
  doc["alert"] = alert;
  
  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_BATTERY, payload.c_str(), true);
}

// ============================================================================
// Distance/Ultrasonic Functions
// ============================================================================
float readDistance() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  long duration = pulseIn(PIN_ECHO, HIGH, 25000);
  if (duration == 0) return 999.0f;
  return duration * 0.0343f / 2.0f;
}

void publishDistance() {
  float dist = readDistance();
  distanceCm = dist;
  obstacleDetected = (dist < OBSTACLE_CM);
  
  if (obstacleDetected && currentMode == "MANUAL") {
    motorsStop();
  }
  
  StaticJsonDocument<128> doc;
  doc["cm"] = (int)dist;
  doc["obstacle"] = obstacleDetected;
  
  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_DISTANCE, payload.c_str());
}

// ============================================================================
// Auto Mode Status Functions
// ============================================================================
String autoStateName() {
  switch (autoState) {
    case AUTO_IDLE:
      return "IDLE";
    case AUTO_START_ROW:
    case AUTO_MOVING_FORWARD:
      return "MOVING_FORWARD";
    case AUTO_OBSTACLE_AVOID:
      return "OBSTACLE_AVOID";
    case AUTO_ROW_COMPLETE:
      return "ROW_COMPLETE";
    case AUTO_TURNING_1:
    case AUTO_SHIFTING:
    case AUTO_TURNING_2:
      return "TURNING";
    case AUTO_COMPLETE:
      return "COMPLETE";
    default:
      return "IDLE";
  }
}

void publishAutoStatus() {
  float leftDist = leftPulses * DIST_PER_PULSE;
  float rightDist = rightPulses * DIST_PER_PULSE;
  
  StaticJsonDocument<384> doc;
  doc["state"] = autoStateName();
  doc["row"] = autoRow;
  doc["yaw"] = serialized(String(yaw, 1));
  doc["left_dist_cm"] = serialized(String(leftDist, 1));
  doc["right_dist_cm"] = serialized(String(rightDist, 1));
  doc["coverage_pct"] = (int)coveragePct;
  
  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_AUTO, payload.c_str());
}

// ============================================================================
// MQTT Callback
// ============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String p;
  for (unsigned int i = 0; i < length; i++) {
    p += (char)payload[i];
  }
  
  if (strcmp(topic, T_CMD_MOVEMENT) == 0) {
    if (currentMode == "MANUAL") {
      setMotorsByCmd(p);
    }
  } else if (strcmp(topic, T_CMD_SUCTION) == 0) {
    int val = constrain(p.toInt(), 0, 255);
    ledcWrite(0, val);
    currentSuction = val;
  } else if (strcmp(topic, T_CMD_MODE) == 0) {
    if (p == "AUTO") {
      currentMode = "AUTO";
      autoRow = 0;
      autoState = AUTO_START_ROW;
      coveragePct = 0.0f;
      resetEncoders();
      resetYawRef();
      mqtt.publish(T_STAT_MODE, "AUTO", true);
    } else if (p == "MANUAL") {
      currentMode = "MANUAL";
      motorsStop();
      autoState = AUTO_IDLE;
      mqtt.publish(T_STAT_MODE, "MANUAL", true);
    }
  }
}

// ============================================================================
// MQTT Connect
// ============================================================================
bool connectMQTT() {
  char clientId[32];
  uint64_t mac = ESP.getEfuseMac();
  snprintf(clientId, sizeof(clientId), "vacbot-%02llx%02llx%02llx",
           (mac >> 40) & 0xFF,
           (mac >> 32) & 0xFF,
           (mac >> 24) & 0xFF);
  
  if (!mqtt.connect(clientId, MQTT_USER, MQTT_PASS, T_STAT_ONLINE, 0, true, "offline", false)) {
    return false;
  }
  
  mqtt.publish(T_STAT_ONLINE, "online", true);
  mqtt.subscribe(T_CMD_MOVEMENT);
  mqtt.subscribe(T_CMD_SUCTION);
  mqtt.subscribe(T_CMD_MODE);
  reconnectDelay = 2000;
  return true;
}

// ============================================================================
// Setup
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_IN3, OUTPUT);
  pinMode(PIN_IN4, OUTPUT);
  motorsStop();
  
  ledcSetup(0, 20000, 8);
  ledcAttachPin(PIN_SUCTION, 0);
  ledcWrite(0, 0);
  
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);
  
  pinMode(PIN_ENC_LEFT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_LEFT), leftEncoderISR, RISING);
  
  pinMode(PIN_ENC_RIGHT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_RIGHT), rightEncoderISR, RISING);
  
  Wire.begin(PIN_SDA, PIN_SCL);
  
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found!");
    while (1) {
      digitalWrite(PIN_LED, HIGH);
      delay(100);
      digitalWrite(PIN_LED, LOW);
      delay(100);
    }
  }
  
  mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  lastGyroMs = millis();
  
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000) {
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    delay(500);
  }
  digitalWrite(PIN_LED, LOW);
  
  Serial.print("WiFi connected: ");
  Serial.println(WiFi.localIP());
  
  secureClient.setCACert(ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  
  connectMQTT();
}

// ============================================================================
// Loop
// ============================================================================
void loop() {
  // MQTT reconnect logic
  if (!mqtt.connected()) {
    if (millis() - lastReconnectAttempt > reconnectDelay) {
      lastReconnectAttempt = millis();
      if (!connectMQTT()) {
        reconnectDelay = min(reconnectDelay * 2, 30000UL);
      }
    }
  } else {
    mqtt.loop();
  }
  
  // Update yaw
  updateYaw();
  
  // Publish distance
  if (millis() - lastDistancePub >= 500) {
    publishDistance();
    lastDistancePub = millis();
  }
  
  // Publish battery
  if (millis() - lastBatteryPub >= 2000) {
    publishBattery();
    lastBatteryPub = millis();
  }
  
  // Auto mode status
  if (currentMode == "AUTO" && millis() - lastAutoPub >= 1000) {
    publishAutoStatus();
    lastAutoPub = millis();
  }
  
  // Run auto mode state machine
  if (currentMode == "AUTO") {
    runAutoMode();
  }
}

// ============================================================================
// Auto Mode State Machine
// ============================================================================
void runAutoMode() {
  unsigned long backupTimer = 0;
  unsigned long turnTimer = 0;
  static unsigned long backupStart = 0;
  static unsigned long turnStart = 0;
  
  switch (autoState) {
    case AUTO_IDLE:
      // Waiting for mode command
      break;
      
    case AUTO_START_ROW:
      resetEncoders();
      resetYawRef();
      motorsForward();
      autoState = AUTO_MOVING_FORWARD;
      break;
      
    case AUTO_MOVING_FORWARD:
      if (obstacleDetected) {
        motorsStop();
        obstacleTimer = millis();
        obstacleRetry = 0;
        autoState = AUTO_OBSTACLE_AVOID;
      } else if (avgDistCm() >= ROW_LENGTH_CM) {
        motorsStop();
        autoState = AUTO_ROW_COMPLETE;
      }
      break;
      
    case AUTO_OBSTACLE_AVOID:
      if (millis() - obstacleTimer < 1000) {
        // Wait 1 second
        break;
      }
      if (!obstacleDetected) {
        resetEncoders();
        motorsForward();
        autoState = AUTO_MOVING_FORWARD;
      } else {
        obstacleRetry++;
        if (obstacleRetry > 3) {
          motorsStop();
          ledcWrite(0, 0);
          autoState = AUTO_COMPLETE;
        } else {
          // Backup for 600ms
          backupStart = millis();
          motorsBackward();
          // Will turn in next iteration
        }
      }
      break;
      
    case AUTO_ROW_COMPLETE:
      autoRow++;
      coveragePct = (autoRow / (float)MAX_ROWS) * 100.0f;
      if (autoRow >= MAX_ROWS) {
        motorsStop();
        ledcWrite(0, 0);
        autoState = AUTO_COMPLETE;
        currentMode = "MANUAL";
        mqtt.publish(T_STAT_MODE, "MANUAL", true);
      } else {
        turnDir = (autoRow % 2 == 0) ? 1 : -1;
        resetYawRef();
        if (turnDir == 1) {
          motorsRight();
        } else {
          motorsLeft();
        }
        autoState = AUTO_TURNING_1;
      }
      break;
      
    case AUTO_TURNING_1:
      if (yawDelta() >= TURN_DONE_DEG) {
        motorsStop();
        resetEncoders();
        motorsForward();
        autoState = AUTO_SHIFTING;
      }
      break;
      
    case AUTO_SHIFTING:
      if (avgDistCm() >= ROW_WIDTH_CM) {
        motorsStop();
        resetYawRef();
        if (turnDir == 1) {
          motorsRight();
        } else {
          motorsLeft();
        }
        autoState = AUTO_TURNING_2;
      }
      break;
      
    case AUTO_TURNING_2:
      if (yawDelta() >= TURN_DONE_DEG) {
        motorsStop();
        autoState = AUTO_START_ROW;
      }
      break;
      
    case AUTO_COMPLETE:
      motorsStop();
      ledcWrite(0, 0);
      currentSuction = 0;
      break;
  }
}
