// ============================================================================
// VacBot Firmware for ESP32-S3
// ============================================================================
// Complete Arduino C++ sketch. Edit only the CONFIG section below.
// Libraries required: PubSubClient, Adafruit MPU6050, Adafruit Unified Sensor, Adafruit NeoPixel, ArduinoJson
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
#define DRIVE_SPEED              90
#define PIVOT_SPEED              90
#define FRONT_STOP_CM            9
#define SIDE_CLEAR_CM            7
#define VACUUM_TURBO_SPEED       255
#define VACUUM_ECO_SPEED         160
// ============================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>

// GPIO Pin Definitions (from main.cpp hardware truth)
#define PIN_LEFT_ENA    4    // Left motor PWM speed
#define PIN_LEFT_IN1    5    // Left motor direction A
#define PIN_LEFT_IN2    6    // Left motor direction B
#define PIN_RIGHT_ENB   7    // Right motor PWM speed
#define PIN_RIGHT_IN3   15   // Right motor direction A
#define PIN_RIGHT_IN4   16   // Right motor direction B
#define PIN_ENC_LEFT    17   // Left wheel encoder
#define PIN_ENC_RIGHT   18   // Right wheel encoder
#define PIN_TRIG        10   // Shared ultrasonic trigger
#define PIN_ECHO_FRONT  11   // Front ultrasonic echo
#define PIN_ECHO_LEFT   12   // Left ultrasonic echo
#define PIN_ECHO_RIGHT  13   // Right ultrasonic echo
#define PIN_BATTERY     20   // Battery voltage ADC
#define PIN_VAC_PWM     38   // Vacuum motor PWM (TB6612FNG)
#define PIN_VAC_IN1     47   // Vacuum motor direction AIN1+BIN1
#define PIN_VAC_IN2     45   // Vacuum motor direction AIN2+BIN2
#define RGB_PIN         48   // NeoPixel RGB LED
#define NUM_PIXELS      1
#define PIN_SDA         8    // MPU6050 SDA
#define PIN_SCL         9    // MPU6050 SCL

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
Adafruit_NeoPixel rgb(NUM_PIXELS, RGB_PIN, NEO_GRB + NEO_KHZ800);

volatile long leftPulses = 0;
volatile long rightPulses = 0;
float gyroAngle = 0.0f;
float gyroAngleRef = 0.0f;
float gyroBiasZ = 0.0f;
float gyroSign = 1.0f;
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

// Ultrasonic sensor results
struct Sonars {
  long front;
  long left;
  long right;
};

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

// Obstacle avoidance sub-phases
enum AvoidPhase {
  AVOID_WAITING,
  AVOID_READING,
  AVOID_TURNING
};

AutoState autoState = AUTO_IDLE;
AvoidPhase avoidPhase = AVOID_WAITING;
int avoidTurnDir = 0; // 1=left, -1=right
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
// RGB LED
// ============================================================================
void setRGB(uint8_t r, uint8_t g, uint8_t b) {
  rgb.setPixelColor(0, rgb.Color(r, g, b));
  rgb.show();
}

// ============================================================================
// Motor Control Functions (from main.cpp — dual H-bridge with speed PWM)
// ============================================================================
void setLeftMotor(int speed, int direction) {
  analogWrite(PIN_LEFT_ENA, constrain(abs(speed), 0, 255));
  if (direction > 0) {
    digitalWrite(PIN_LEFT_IN1, HIGH);
    digitalWrite(PIN_LEFT_IN2, LOW);
  } else if (direction < 0) {
    digitalWrite(PIN_LEFT_IN1, LOW);
    digitalWrite(PIN_LEFT_IN2, HIGH);
  } else {
    digitalWrite(PIN_LEFT_IN1, LOW);
    digitalWrite(PIN_LEFT_IN2, LOW);
  }
}

void setRightMotor(int speed, int direction) {
  analogWrite(PIN_RIGHT_ENB, constrain(abs(speed), 0, 255));
  if (direction > 0) {
    digitalWrite(PIN_RIGHT_IN3, HIGH);
    digitalWrite(PIN_RIGHT_IN4, LOW);
  } else if (direction < 0) {
    digitalWrite(PIN_RIGHT_IN3, LOW);
    digitalWrite(PIN_RIGHT_IN4, HIGH);
  } else {
    digitalWrite(PIN_RIGHT_IN3, LOW);
    digitalWrite(PIN_RIGHT_IN4, LOW);
  }
}

void motorsStop() {
  analogWrite(PIN_LEFT_ENA, 0);
  analogWrite(PIN_RIGHT_ENB, 0);
  digitalWrite(PIN_LEFT_IN1, LOW);
  digitalWrite(PIN_LEFT_IN2, LOW);
  digitalWrite(PIN_RIGHT_IN3, LOW);
  digitalWrite(PIN_RIGHT_IN4, LOW);
}

void motorsForward() {
  setLeftMotor(DRIVE_SPEED, 1);
  setRightMotor(DRIVE_SPEED, 1);
}

void motorsBackward() {
  setLeftMotor(DRIVE_SPEED, -1);
  setRightMotor(DRIVE_SPEED, -1);
}

void motorsLeft() {
  setLeftMotor(PIVOT_SPEED, -1);
  setRightMotor(PIVOT_SPEED, 1);
}

void motorsRight() {
  setLeftMotor(PIVOT_SPEED, 1);
  setRightMotor(PIVOT_SPEED, -1);
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
// Vacuum Motor Control (TB6612FNG — from main.cpp)
// ============================================================================
void setVacuumMotor(int speed) {
  speed = constrain(speed, 0, 255);
  if (speed == 0) {
    analogWrite(PIN_VAC_PWM, 0);
    digitalWrite(PIN_VAC_IN1, LOW);
    digitalWrite(PIN_VAC_IN2, LOW);
  } else {
    digitalWrite(PIN_VAC_IN1, HIGH);
    digitalWrite(PIN_VAC_IN2, LOW);
    analogWrite(PIN_VAC_PWM, speed);
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
// Gyro/IMU Functions (from main.cpp — with bias and sign correction)
// ============================================================================
void calibrateGyro() {
  Serial.println("\nKeep robot still for calibration...");
  float sumZ = 0;
  int samples = 0;
  unsigned long start = millis();
  while (millis() - start < 3000) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    sumZ += g.gyro.z;
    samples++;
    delay(5);
  }
  gyroBiasZ = sumZ / samples;
  Serial.print("Gyro Bias Z = ");
  Serial.println(gyroBiasZ, 6);
}

void determineGyroSign() {
  Serial.println("Checking gyro direction...");
  gyroAngle = 0;
  lastGyroMs = millis();
  motorsLeft();  // brief pivot left
  unsigned long start = millis();
  while (millis() - start < 300) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    unsigned long now = millis();
    float dt = (now - lastGyroMs) / 1000.0f;
    lastGyroMs = now;
    gyroAngle += ((g.gyro.z - gyroBiasZ) * 180.0f / PI) * dt;
  }
  motorsStop();
  delay(300);
  gyroSign = (gyroAngle < 0) ? -1.0f : 1.0f;
  Serial.println("Gyro sign configured.");
  gyroAngle = 0;
}

void updateGyroAngle() {
  if (millis() - lastGyroMs < 50) {
    return;
  }
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float dt = (millis() - lastGyroMs) / 1000.0f;
  float correctedZ = (g.gyro.z - gyroBiasZ) * gyroSign;
  gyroAngle += correctedZ * (180.0f / PI) * dt;
  lastGyroMs = millis();
}

void resetGyroAngleRef() {
  gyroAngleRef = gyroAngle;
}

float gyroAngleDelta() {
  return abs(gyroAngle - gyroAngleRef);
}

// ============================================================================
// Battery Functions
// ============================================================================
float readVoltage() {
  return analogRead(PIN_BATTERY) * (3.3f / 4095.0f) * 5.0f;
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

  // RGB LED battery color indication (from main.cpp)
  if (percent > 70) {
    setRGB(0, 255, 0);       // GREEN
  } else if (percent > 40) {
    setRGB(255, 255, 0);     // YELLOW
  } else if (percent > 15) {
    setRGB(255, 80, 0);      // ORANGE
  } else {
    setRGB(255, 0, 0);       // RED
  }

  // Auto vacuum speed control based on battery
  if (currentMode == "AUTO" && !alert) {
    setVacuumMotor(percent > 70 ? VACUUM_TURBO_SPEED : VACUUM_ECO_SPEED);
  }

  if (alert) {
    motorsStop();
    setVacuumMotor(0);
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
// Ultrasonic Functions (3-sensor from main.cpp)
// ============================================================================
long readSonar(int echoPin) {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(4);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long duration = pulseIn(echoPin, HIGH, 20000);
  if (duration == 0) return 999;
  return duration * 0.034 / 2;
}

Sonars readAllSonars() {
  Sonars s;
  s.front = readSonar(PIN_ECHO_FRONT);
  delay(30);
  s.left = readSonar(PIN_ECHO_LEFT);
  delay(30);
  s.right = readSonar(PIN_ECHO_RIGHT);
  delay(30);
  return s;
}

void publishDistance() {
  long dist = readSonar(PIN_ECHO_FRONT);
  distanceCm = (float)dist;
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
  doc["yaw"] = serialized(String(gyroAngle, 1));
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
    if (currentMode == "MANUAL") {
      int val = constrain(p.toInt(), 0, 255);
      setVacuumMotor(val);
      currentSuction = val;
    }
  } else if (strcmp(topic, T_CMD_MODE) == 0) {
    if (p == "AUTO") {
      currentMode = "AUTO";
      autoRow = 0;
      autoState = AUTO_START_ROW;
      coveragePct = 0.0f;
      resetEncoders();
      resetGyroAngleRef();
      // Auto vacuum speed set by publishBattery()
      mqtt.publish(T_STAT_MODE, "AUTO", true);
    } else if (p == "MANUAL") {
      currentMode = "MANUAL";
      motorsStop();
      setVacuumMotor(0);
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

  // RGB LED first
  rgb.begin();
  rgb.setBrightness(80);
  rgb.show();

  // ADC
  analogReadResolution(12);

  // Motor pins
  pinMode(PIN_LEFT_ENA, OUTPUT);
  pinMode(PIN_LEFT_IN1, OUTPUT);
  pinMode(PIN_LEFT_IN2, OUTPUT);
  pinMode(PIN_RIGHT_ENB, OUTPUT);
  pinMode(PIN_RIGHT_IN3, OUTPUT);
  pinMode(PIN_RIGHT_IN4, OUTPUT);
  motorsStop();

  // Vacuum motor pins (TB6612FNG)
  pinMode(PIN_VAC_PWM, OUTPUT);
  pinMode(PIN_VAC_IN1, OUTPUT);
  pinMode(PIN_VAC_IN2, OUTPUT);
  analogWrite(PIN_VAC_PWM, 0);
  digitalWrite(PIN_VAC_IN1, LOW);
  digitalWrite(PIN_VAC_IN2, LOW);

  // Ultrasonic (3 sensors, shared trigger)
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO_FRONT, INPUT);
  pinMode(PIN_ECHO_LEFT, INPUT);
  pinMode(PIN_ECHO_RIGHT, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  // Encoders
  pinMode(PIN_ENC_LEFT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_LEFT), leftEncoderISR, RISING);
  pinMode(PIN_ENC_RIGHT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_RIGHT), rightEncoderISR, RISING);

  // I2C + MPU6050
  Wire.begin(PIN_SDA, PIN_SCL);
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found!");
    while (1) {
      setRGB(255, 0, 0);  // RED = error
      delay(100);
      setRGB(0, 0, 0);
      delay(100);
    }
  }
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  lastGyroMs = millis();
  Serial.println("MPU6050 connected");
  delay(1000);

  // Gyro calibration (runs once in setup — delay() allowed here)
  calibrateGyro();
  determineGyroSign();

  // WiFi
  setRGB(0, 0, 255);  // BLUE = connecting
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000) {
    delay(500);
  }
  setRGB(0, 255, 0);  // GREEN = connected
  Serial.print("WiFi connected: ");
  Serial.println(WiFi.localIP());

  // MQTT
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

  // Update gyro angle
  updateGyroAngle();

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
  switch (autoState) {
    case AUTO_IDLE:
      // Waiting for mode command
      break;

    case AUTO_START_ROW:
      resetEncoders();
      resetGyroAngleRef();
      motorsForward();
      autoState = AUTO_MOVING_FORWARD;
      break;

    case AUTO_MOVING_FORWARD:
      if (obstacleDetected) {
        motorsStop();
        obstacleTimer = millis();
        obstacleRetry = 0;
        avoidPhase = AVOID_WAITING;
        autoState = AUTO_OBSTACLE_AVOID;
      } else if (avgDistCm() >= ROW_LENGTH_CM) {
        motorsStop();
        autoState = AUTO_ROW_COMPLETE;
      }
      break;

    case AUTO_OBSTACLE_AVOID:
      // Non-blocking obstacle avoidance (from main.cpp avoidObstacle logic)
      switch (avoidPhase) {
        case AVOID_WAITING:
          // Wait 2 seconds after obstacle detected
          if (millis() - obstacleTimer >= 2000) {
            avoidPhase = AVOID_READING;
          }
          break;

        case AVOID_READING: {
          // Read all 3 sensors and decide turn direction
          Sonars s = readAllSonars();
          bool leftClear = (s.left > SIDE_CLEAR_CM);
          bool rightClear = (s.right > SIDE_CLEAR_CM);

          if (leftClear && rightClear) {
            avoidTurnDir = (s.left >= s.right) ? 1 : -1;
          } else if (leftClear) {
            avoidTurnDir = 1;
          } else if (rightClear) {
            avoidTurnDir = -1;
          } else {
            avoidTurnDir = 1;  // Both blocked, default left
          }

          // Start pivoting
          resetGyroAngleRef();
          if (avoidTurnDir > 0) {
            motorsLeft();
          } else {
            motorsRight();
          }
          avoidPhase = AVOID_TURNING;
          break;
        }

        case AVOID_TURNING:
          // Wait for turn to complete (non-blocking)
          if (gyroAngleDelta() >= TURN_DONE_DEG) {
            motorsStop();
            obstacleRetry++;
            if (obstacleRetry > 3) {
              motorsStop();
              setVacuumMotor(0);
              autoState = AUTO_COMPLETE;
            } else {
              // Resume forward
              resetEncoders();
              motorsForward();
              autoState = AUTO_MOVING_FORWARD;
            }
          }
          break;
      }
      break;

    case AUTO_ROW_COMPLETE:
      autoRow++;
      coveragePct = (autoRow / (float)MAX_ROWS) * 100.0f;
      if (autoRow >= MAX_ROWS) {
        motorsStop();
        setVacuumMotor(0);
        autoState = AUTO_COMPLETE;
        currentMode = "MANUAL";
        mqtt.publish(T_STAT_MODE, "MANUAL", true);
      } else {
        turnDir = (autoRow % 2 == 0) ? 1 : -1;
        resetGyroAngleRef();
        if (turnDir == 1) {
          motorsRight();
        } else {
          motorsLeft();
        }
        autoState = AUTO_TURNING_1;
      }
      break;

    case AUTO_TURNING_1:
      if (gyroAngleDelta() >= TURN_DONE_DEG) {
        motorsStop();
        resetEncoders();
        motorsForward();
        autoState = AUTO_SHIFTING;
      }
      break;

    case AUTO_SHIFTING:
      if (avgDistCm() >= ROW_WIDTH_CM) {
        motorsStop();
        resetGyroAngleRef();
        if (turnDir == 1) {
          motorsRight();
        } else {
          motorsLeft();
        }
        autoState = AUTO_TURNING_2;
      }
      break;

    case AUTO_TURNING_2:
      if (gyroAngleDelta() >= TURN_DONE_DEG) {
        motorsStop();
        autoState = AUTO_START_ROW;
      }
      break;

    case AUTO_COMPLETE:
      motorsStop();
      setVacuumMotor(0);
      currentSuction = 0;
      break;
  }
}
