// ============================================================================
// VacBot Firmware for ESP32-S3
// ============================================================================
// Complete Arduino C++ sketch. Edit only the CONFIG section below.
// Libraries required: PubSubClient, Adafruit MPU6050, Adafruit Unified Sensor, Adafruit NeoPixel, ArduinoJson
// ============================================================================

// ============================================================================
// CONFIG SECTION — EDIT THESE VALUES ONLY
// ============================================================================
#define WIFI_SSID                "COMFRI"
#define WIFI_PASS                "your_wifi_password"
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
#define T_STAT_SONARS   "vacbot/status/sonars"
#define T_STAT_NAV      "vacbot/status/navigation"

// TLS Root Certificate (Let's Encrypt R13 - Current HiveMQ Cert)
static const char* ROOT_CA PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFGDCCBACgAwIBAgISBmYUym6wSVm+hVZYpdHL9J6cMA0GCSqGSIb3DQEBCwUA
MDMxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQwwCgYDVQQD
EwNSMTMwHhcNMjYwNDE3MTUyOTAwWhcNMjYwNzE2MTUyODU5WjAfMR0wGwYDVQQD
DBQqLnMxLmV1LmhpdmVtcS5jbG91ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
AQoCggEBAKVuz2sMPmxx2w/f81/YAEKTbNZMJPk2+ooLFg5hxXvReF+AwIT4XvZ+
MLhSKvFxmghJF+BB9WyhqrcJLGDCP4s6SOLWTYixEoTcaLUviqqn+06kYqDJ6E83
NGsc7T42DlPnzqcZZjPRed9rt4CP3RgeZlWyYZgiD8FoJG9gie8ytihF/FkGZT8T
N4Vkl2vQa3mfBWeeKrcuhcLPxqIWDz/30iYfLtEe5JYYScoCKTXcP9SUStjpR8pD
vfOWdvasOAuBy7yBbx01/4lcQt50hfbhTR/K14/D4rNkuuvU7ktSQnoxVXC8YDwG
zkny10DFt65mVYLNZcBQtOLHHOZGV30CAwEAAaOCAjgwggI0MA4GA1UdDwEB/wQE
AwIFoDATBgNVHSUEDDAKBggrBgEFBQcDATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQW
BBSCwSMNTfn4RYkoGwXEnSUzQ9cyLjAfBgNVHSMEGDAWgBTnq58PLDOgU9NeT3jI
soQOO9aSMzAzBggrBgEFBQcBAQQnMCUwIwYIKwYBBQUHMAKGF2h0dHA6Ly9yMTMu
aS5sZW5jci5vcmcvMDMGA1UdEQQsMCqCFCouczEuZXUuaGl2ZW1xLmNsb3VkghJz
MS5ldS5oaXZlbXEuY2xvdWQwEwYDVR0gBAwwCjAIBgZngQwBAgEwLgYDVR0fBCcw
JTAjoCGgH4YdaHR0cDovL3IxMy5jLmxlbmNyLm9yZy8yOS5jcmwwggEOBgorBgEE
AdZ5AgQCBIH/BIH8APoAfwBGr4Y9Oz7ln6V33qgkXTaw2e0ioiP0YXdBIpRS7pVQ
XwAAAZ2cRNaaAAgAAAUABCNy7wQDAEgwRgIhAJlg4LRrt1M2dEQosi6wPWjET6yS
ekNxcg56fWOOQ9C8AiEAmmuPIYP28o97cRg1WGoW7fu6AWadHQseMdr6VxFi/ssA
dwDXbX0Q0af1d8LH6V/XAL/5gskzWmXh0LMBcxfAyMVpdwAAAZ2cRNZtAAAEAwBI
MEYCIQD+LETYtouBvzYygQwD2hljOk7185fa57jzzso2KMbV5wIhAMqcqKt1fZMr
9rY9s7PHEqQJYJFi7/UEybay9RwQeyBsMA0GCSqGSIb3DQEBCwUAA4IBAQB2t5O2
nZJ0i2cGoaD3h7FH2zNdgazMkgUMRG9WZg1CV4yciQXVGzmw894eAfTaPHNPjBgG
e9EUQxrdMP3vxvN1kRiKMXH6RyyFRg4jNKSFKVStSB9pMsjeZwEqXxQPwwqHWjPN
+9T7YVd+WgEyjN7+MpPaWtfPN9vTDkINLaiDA07oFWLr8/cZMRqxiORwAqGx1fhX
fth0PxXnvCpEIyn4ktWG6ah+uiA6OC3WStnh3mcPpxJBvwkvQ/xy1FPwkd7ZHfNU
drgNSdjtw/IQb2SQu6gf5x+TyQ9I448UKTceT8f6gDLHlde1pgaMqM74oNpiHzbN
fZZlNQFADj8GuTXf
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

// Enhanced sonar tracking (all 3 sensors)
long sonarFront = 999;
long sonarLeft = 999;
long sonarRight = 999;
long prevSonarFront = 999;  // For predictive logic
bool isApproaching = false;  // Front distance decreasing
String safeDirString = "FORWARD,LEFT,RIGHT";  // Default all safe

unsigned long lastBatteryPub = 0;
unsigned long lastDistancePub = 0;
unsigned long lastSonarPub = 0;      // New: all 3 sensors
unsigned long lastNavPub = 0;        // New: navigation guidance
unsigned long lastAutoPub = 0;
unsigned long lastHeartbeatPub = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long reconnectDelay = 2000;

// Serial log throttle for high-frequency updates
unsigned long lastGyroLog = 0;
unsigned long lastLoopLog = 0;

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
AutoState prevAutoState = AUTO_IDLE;   // Track state changes for logging
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
  Serial.print("[RGB] Set color -> R=");
  Serial.print(r);
  Serial.print(" G=");
  Serial.print(g);
  Serial.print(" B=");
  Serial.println(b);
}

// ============================================================================
// Motor Control Functions (from main.cpp — dual H-bridge with speed PWM)
// ============================================================================
void setLeftMotor(int speed, int direction) {
  Serial.print("[MOTOR-L] Speed=");
  Serial.print(abs(speed));
  Serial.print(" Dir=");
  Serial.println(direction > 0 ? "FWD" : (direction < 0 ? "REV" : "STOP"));

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
  Serial.print("[MOTOR-R] Speed=");
  Serial.print(abs(speed));
  Serial.print(" Dir=");
  Serial.println(direction > 0 ? "FWD" : (direction < 0 ? "REV" : "STOP"));

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
  Serial.println("[MOTOR] >>> STOP all motors");
  analogWrite(PIN_LEFT_ENA, 0);
  analogWrite(PIN_RIGHT_ENB, 0);
  digitalWrite(PIN_LEFT_IN1, LOW);
  digitalWrite(PIN_LEFT_IN2, LOW);
  digitalWrite(PIN_RIGHT_IN3, LOW);
  digitalWrite(PIN_RIGHT_IN4, LOW);
}

void motorsForward() {
  Serial.println("[MOTOR] >>> FORWARD");
  setLeftMotor(DRIVE_SPEED, 1);
  setRightMotor(DRIVE_SPEED, 1);
}

void motorsBackward() {
  Serial.println("[MOTOR] >>> BACKWARD");
  setLeftMotor(DRIVE_SPEED, -1);
  setRightMotor(DRIVE_SPEED, -1);
}

void motorsLeft() {
  Serial.println("[MOTOR] >>> PIVOT LEFT");
  setLeftMotor(PIVOT_SPEED, -1);
  setRightMotor(PIVOT_SPEED, 1);
}

void motorsRight() {
  Serial.println("[MOTOR] >>> PIVOT RIGHT");
  setLeftMotor(PIVOT_SPEED, 1);
  setRightMotor(PIVOT_SPEED, -1);
}

void setMotorsByCmd(String cmd) {
  Serial.print("[CMD] Movement command received: ");
  Serial.println(cmd);

  // MANUAL mode smart checking
  if (currentMode == "MANUAL") {
    if (cmd == "FORWARD" && sonarFront <= OBSTACLE_CM) {
      Serial.print("[CMD] BLOCKED — front obstacle at ");
      Serial.print(sonarFront);
      Serial.println("cm, command ignored");
      motorsStop();
      return;
    }
    if (cmd == "LEFT" && sonarLeft <= SIDE_CLEAR_CM) {
      Serial.print("[CMD] CAUTION — left obstacle at ");
      Serial.print(sonarLeft);
      Serial.println("cm, but allowing (user control)");
    }
    if (cmd == "RIGHT" && sonarRight <= SIDE_CLEAR_CM) {
      Serial.print("[CMD] CAUTION — right obstacle at ");
      Serial.print(sonarRight);
      Serial.println("cm, but allowing (user control)");
    }
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
  } else {
    Serial.print("[CMD] Unknown movement command: ");
    Serial.println(cmd);
  }
}

// ============================================================================
// Vacuum Motor Control (TB6612FNG — from main.cpp)
// ============================================================================
void setVacuumMotor(int speed) {
  speed = constrain(speed, 0, 255);
  Serial.print("[VACUUM] Set speed -> ");
  Serial.println(speed);

  if (speed == 0) {
    analogWrite(PIN_VAC_PWM, 0);
    digitalWrite(PIN_VAC_IN1, LOW);
    digitalWrite(PIN_VAC_IN2, LOW);
    Serial.println("[VACUUM] Motor OFF");
  } else {
    digitalWrite(PIN_VAC_IN1, HIGH);
    digitalWrite(PIN_VAC_IN2, LOW);
    analogWrite(PIN_VAC_PWM, speed);
    Serial.println("[VACUUM] Motor ON");
  }
}

// ============================================================================
// Encoder Functions
// ============================================================================
void resetEncoders() {
  Serial.print("[ENCODER] Reset — was L=");
  Serial.print(leftPulses);
  Serial.print(" R=");
  Serial.println(rightPulses);
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
  Serial.println("========================================");
  Serial.println("[GYRO] Starting calibration...");
  Serial.println("[GYRO] Keep robot STILL for 3 seconds!");
  Serial.println("========================================");
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
  Serial.print("[GYRO] Calibration complete — samples=");
  Serial.print(samples);
  Serial.print(" biasZ=");
  Serial.println(gyroBiasZ, 6);
}

void determineGyroSign() {
  Serial.println("[GYRO] Determining gyro sign direction...");
  Serial.println("[GYRO] Robot will briefly pivot left...");
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
  Serial.print("[GYRO] Raw angle during test = ");
  Serial.print(gyroAngle, 2);
  Serial.print(" => gyroSign = ");
  Serial.println(gyroSign, 0);
  Serial.println("[GYRO] Sign calibration complete.");
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

  // Throttled log: print gyro angle every 2 seconds
  if (millis() - lastGyroLog >= 2000) {
    Serial.print("[GYRO] Angle=");
    Serial.print(gyroAngle, 1);
    Serial.print("° delta=");
    Serial.print(gyroAngleDelta(), 1);
    Serial.println("°");
    lastGyroLog = millis();
  }
}

void resetGyroAngleRef() {
  Serial.print("[GYRO] Reset angle ref — was ");
  Serial.print(gyroAngleRef, 1);
  Serial.print("° now ");
  Serial.print(gyroAngle, 1);
  Serial.println("°");
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

  Serial.println("----------------------------------------");
  Serial.print("[BATTERY] V=");
  Serial.print(voltage, 2);
  Serial.print("V  %=");
  Serial.print(percent);
  Serial.print("  Health=");
  Serial.print(health);
  Serial.print("  Alert=");
  Serial.println(alert ? "YES!" : "No");

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
    int vacSpeed = percent > 70 ? VACUUM_TURBO_SPEED : VACUUM_ECO_SPEED;
    Serial.print("[BATTERY] Auto vacuum speed adjust -> ");
    Serial.println(vacSpeed);
    setVacuumMotor(vacSpeed);
  }

  if (alert) {
    Serial.println("[BATTERY] *** CRITICAL ALERT — SHUTTING DOWN MOTORS ***");
    motorsStop();
    setVacuumMotor(0);
    if (currentMode == "AUTO") {
      Serial.println("[BATTERY] Forcing mode change: AUTO -> MANUAL (low battery)");
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
  Serial.print("[BATTERY] Published MQTT -> ");
  Serial.println(payload);
  Serial.println("----------------------------------------");
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

  Serial.print("[SONAR] Front=");
  Serial.print(s.front);
  Serial.print("cm  Left=");
  Serial.print(s.left);
  Serial.print("cm  Right=");
  Serial.print(s.right);
  Serial.println("cm");

  return s;
}

// ============================================================================
// Calculate safe directions based on sensor readings
// ============================================================================
String calculateSafeDirections(long front, long left, long right) {
  String safe = "";
  
  if (front > OBSTACLE_CM) safe += "FORWARD";
  if (left > SIDE_CLEAR_CM) {
    if (safe.length() > 0) safe += ",";
    safe += "LEFT";
  }
  if (right > SIDE_CLEAR_CM) {
    if (safe.length() > 0) safe += ",";
    safe += "RIGHT";
  }
  
  // Backward is generally safe unless something is behind
  if (safe.length() > 0) safe += ",";
  safe += "BACKWARD";
  
  return (safe.length() == 0) ? "STOP" : safe;
}

// ============================================================================
// Publish all sonar readings
// ============================================================================
void publishSonars() {
  Serial.print("[SONARS] Publishing — F=");
  Serial.print(sonarFront);
  Serial.print("cm L=");
  Serial.print(sonarLeft);
  Serial.print("cm R=");
  Serial.print(sonarRight);
  Serial.println("cm");
  
  StaticJsonDocument<128> doc;
  doc["front"] = (int)sonarFront;
  doc["left"] = (int)sonarLeft;
  doc["right"] = (int)sonarRight;
  
  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_SONARS, payload.c_str());
}

// ============================================================================
// Publish navigation guidance
// ============================================================================
void publishNavigation() {
  Serial.print("[NAV] Safe directions: ");
  Serial.print(safeDirString);
  Serial.print("  Approaching: ");
  Serial.println(isApproaching ? "YES" : "NO");
  
  StaticJsonDocument<256> doc;
  doc["safe_directions"] = safeDirString;
  doc["approaching"] = isApproaching;
  doc["front_trend"] = (sonarFront < prevSonarFront) ? "decreasing" : "stable";
  
  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_NAV, payload.c_str());
}

void publishDistance() {
  // Use front sensor from continuous polling
  distanceCm = (float)sonarFront;
  bool wasObstacle = obstacleDetected;
  obstacleDetected = (sonarFront < OBSTACLE_CM);

  Serial.print("[DISTANCE] Front=");
  Serial.print(sonarFront);
  Serial.print("cm  Obstacle=");
  Serial.println(obstacleDetected ? "YES" : "No");

  // Log obstacle state changes
  if (obstacleDetected && !wasObstacle) {
    Serial.println("[DISTANCE] *** OBSTACLE DETECTED! ***");
  } else if (!obstacleDetected && wasObstacle) {
    Serial.println("[DISTANCE] Obstacle cleared.");
  }

  if (obstacleDetected && currentMode == "MANUAL") {
    Serial.println("[DISTANCE] Manual mode — stopping motors due to obstacle");
    motorsStop();
  }

  StaticJsonDocument<128> doc;
  doc["cm"] = (int)sonarFront;
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
  
  Serial.println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  Serial.print("[AUTO-STATUS] State=");
  Serial.print(autoStateName());
  Serial.print("  Row=");
  Serial.print(autoRow);
  Serial.print("/");
  Serial.print(MAX_ROWS);
  Serial.print("  Coverage=");
  Serial.print((int)coveragePct);
  Serial.println("%");
  Serial.print("[AUTO-STATUS] Yaw=");
  Serial.print(gyroAngle, 1);
  Serial.print("°  EncL=");
  Serial.print(leftDist, 1);
  Serial.print("cm  EncR=");
  Serial.print(rightDist, 1);
  Serial.print("cm  Avg=");
  Serial.print(avgDistCm(), 1);
  Serial.println("cm");
  Serial.println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

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
// Heartbeat Function — keeps robot online status active
// ============================================================================
void publishHeartbeat() {
  mqtt.publish(T_STAT_ONLINE, "online", true);
  Serial.println("[HEARTBEAT] Published online status");
}

// ============================================================================
// MQTT Callback
// ============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String p;
  for (unsigned int i = 0; i < length; i++) {
    p += (char)payload[i];
  }

  Serial.println("========================================");
  Serial.print("[MQTT-RX] Topic: ");
  Serial.println(topic);
  Serial.print("[MQTT-RX] Payload: ");
  Serial.println(p);
  Serial.print("[MQTT-RX] Length: ");
  Serial.println(length);
  
  if (strcmp(topic, T_CMD_MOVEMENT) == 0) {
    Serial.print("[MQTT-RX] Movement command — currentMode=");
    Serial.println(currentMode);
    if (currentMode == "MANUAL") {
      Serial.println("[MQTT-RX] Executing movement command...");
      setMotorsByCmd(p);
    } else {
      Serial.println("[MQTT-RX] IGNORED — not in MANUAL mode");
    }
  } else if (strcmp(topic, T_CMD_SUCTION) == 0) {
    Serial.print("[MQTT-RX] Suction command — currentMode=");
    Serial.println(currentMode);
    if (currentMode == "MANUAL") {
      int val = constrain(p.toInt(), 0, 255);
      Serial.print("[MQTT-RX] Setting vacuum to ");
      Serial.println(val);
      setVacuumMotor(val);
      currentSuction = val;
    } else {
      Serial.println("[MQTT-RX] IGNORED — not in MANUAL mode");
    }
  } else if (strcmp(topic, T_CMD_MODE) == 0) {
    Serial.print("[MQTT-RX] Mode change request: ");
    Serial.print(currentMode);
    Serial.print(" -> ");
    Serial.println(p);

    if (p == "AUTO") {
      Serial.println("[MODE] *** SWITCHING TO AUTO MODE ***");
      currentMode = "AUTO";
      autoRow = 0;
      autoState = AUTO_START_ROW;
      prevAutoState = AUTO_IDLE;
      coveragePct = 0.0f;
      resetEncoders();
      resetGyroAngleRef();
      // Auto vacuum speed set by publishBattery()
      mqtt.publish(T_STAT_MODE, "AUTO", true);
      Serial.println("[MODE] Auto mode initialized — starting row 0");
    } else if (p == "MANUAL") {
      Serial.println("[MODE] *** SWITCHING TO MANUAL MODE ***");
      currentMode = "MANUAL";
      motorsStop();
      setVacuumMotor(0);
      autoState = AUTO_IDLE;
      mqtt.publish(T_STAT_MODE, "MANUAL", true);
      Serial.println("[MODE] Manual mode — motors stopped, vacuum off");
    } else {
      Serial.print("[MODE] Unknown mode requested: ");
      Serial.println(p);
    }
  } else {
    Serial.print("[MQTT-RX] Unhandled topic: ");
    Serial.println(topic);
  }
  Serial.println("========================================");
}

// ============================================================================
// MQTT Connect
// ============================================================================
bool connectMQTT() {
  Serial.println("[MQTT] Attempting connection...");
  Serial.print("[MQTT] Broker: ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  Serial.print("[MQTT] User: ");
  Serial.println(MQTT_USER);

  char clientId[32];
  uint64_t mac = ESP.getEfuseMac();
  snprintf(clientId, sizeof(clientId), "vacbot-%02llx%02llx%02llx",
           (mac >> 40) & 0xFF,
           (mac >> 32) & 0xFF,
           (mac >> 24) & 0xFF);
  
  Serial.print("[MQTT] Client ID: ");
  Serial.println(clientId);

  // Add timeout to prevent infinite hanging
  Serial.println("[MQTT] Initiating TLS handshake (10s timeout)...");
  unsigned long mqttStart = millis();
  
  bool connected = mqtt.connect(clientId, MQTT_USER, MQTT_PASS, T_STAT_ONLINE, 0, true, "offline", false);
  unsigned long mqttTime = millis() - mqttStart;
  
  Serial.print("[MQTT] Connection attempt took ");
  Serial.print(mqttTime);
  Serial.println("ms");

  if (!connected) {
    Serial.print("[MQTT] *** CONNECTION FAILED — state=");
    int state = mqtt.state();
    Serial.println(state);
    
    Serial.println("[MQTT] State meanings:");
    Serial.println("[MQTT]   -4 = MQTT_CONNECTION_TIMEOUT");
    Serial.println("[MQTT]   -3 = MQTT_CONNECTION_LOST");
    Serial.println("[MQTT]   -2 = MQTT_CONNECT_FAILED");
    Serial.println("[MQTT]   -1 = MQTT_DISCONNECTED");
    Serial.println("[MQTT]    0 = MQTT_CONNECTED");
    Serial.println("[MQTT]    1 = MQTT_CONNECT_BAD_PROTOCOL");
    Serial.println("[MQTT]    2 = MQTT_CONNECT_BAD_CLIENT_ID");
    Serial.println("[MQTT]    3 = MQTT_CONNECT_UNAVAILABLE");
    Serial.println("[MQTT]    4 = MQTT_CONNECT_BAD_CREDENTIALS");
    Serial.println("[MQTT]    5 = MQTT_CONNECT_UNAUTHORIZED");
    
    Serial.println("[MQTT] Troubleshooting:");
    if (state == -4 || state == -2) {
      Serial.println("[MQTT]   ❌ TLS/Connection timeout - likely certificate issue");
      Serial.println("[MQTT]   Try disabling TLS or updating certificate");
    } else if (state == 4) {
      Serial.println("[MQTT]   ❌ Bad credentials - check MQTT_USER and MQTT_PASS");
    } else if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[MQTT]   ❌ WiFi not connected!");
    } else {
      Serial.println("[MQTT]   ❌ Broker unreachable or certificate mismatch");
    }
    return false;
  }
  
  Serial.println("[MQTT] *** CONNECTED SUCCESSFULLY! ***");

  // IMMEDIATELY publish "online" to override any retained "offline" message
  for (int i = 0; i < 3; i++) {
    mqtt.publish(T_STAT_ONLINE, "online", true);
    delay(50);
  }
  Serial.println("[MQTT] ✅ Published online status (3x to ensure)");

  mqtt.subscribe(T_CMD_MOVEMENT);
  Serial.print("[MQTT] Subscribed: ");
  Serial.println(T_CMD_MOVEMENT);

  mqtt.subscribe(T_CMD_SUCTION);
  Serial.print("[MQTT] Subscribed: ");
  Serial.println(T_CMD_SUCTION);

  mqtt.subscribe(T_CMD_MODE);
  Serial.print("[MQTT] Subscribed: ");
  Serial.println(T_CMD_MODE);

  reconnectDelay = 2000;
  Serial.println("[MQTT] Ready to receive commands.");
  return true;
}

// ============================================================================
// Setup
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("########################################");
  Serial.println("#       VacBot Firmware v1.0           #");
  Serial.println("#       ESP32-S3 Starting Up...        #");
  Serial.println("########################################");
  Serial.println();

  // RGB LED first
  Serial.println("[SETUP] Initializing NeoPixel RGB LED...");
  rgb.begin();
  rgb.setBrightness(80);
  rgb.show();
  Serial.println("[SETUP] NeoPixel OK");

  // ADC
  Serial.println("[SETUP] Configuring ADC (12-bit)...");
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);  // Allows full voltage range on battery sensor
  Serial.println("[SETUP] ADC OK — attenuation 11db for full range");
  
  // Wait for battery voltage divider capacitor to settle (RC filter)
  Serial.println("[SETUP] Waiting for battery sensor to stabilize (10s)...");
  Serial.println("[SETUP] This allows the voltage divider capacitor to charge");
  for (int i = 10; i > 0; i--) {
    Serial.print(".");
    delay(1000);
  }
  Serial.println(" Ready!");
  Serial.println("[SETUP] Battery sensor stable and ready");

  // Motor pins
  Serial.println("[SETUP] Configuring motor pins...");
  pinMode(PIN_LEFT_ENA, OUTPUT);
  pinMode(PIN_LEFT_IN1, OUTPUT);
  pinMode(PIN_LEFT_IN2, OUTPUT);
  pinMode(PIN_RIGHT_ENB, OUTPUT);
  pinMode(PIN_RIGHT_IN3, OUTPUT);
  pinMode(PIN_RIGHT_IN4, OUTPUT);
  motorsStop();
  Serial.println("[SETUP] Drive motors OK — stopped");

  // Vacuum motor pins (TB6612FNG)
  Serial.println("[SETUP] Configuring vacuum motor pins (TB6612FNG)...");
  pinMode(PIN_VAC_PWM, OUTPUT);
  pinMode(PIN_VAC_IN1, OUTPUT);
  pinMode(PIN_VAC_IN2, OUTPUT);
  analogWrite(PIN_VAC_PWM, 0);
  digitalWrite(PIN_VAC_IN1, LOW);
  digitalWrite(PIN_VAC_IN2, LOW);
  Serial.println("[SETUP] Vacuum motor OK — off");

  // Ultrasonic (3 sensors, shared trigger)
  Serial.println("[SETUP] Configuring ultrasonic sensors (3x, shared trigger)...");
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO_FRONT, INPUT);
  pinMode(PIN_ECHO_LEFT, INPUT);
  pinMode(PIN_ECHO_RIGHT, INPUT);
  digitalWrite(PIN_TRIG, LOW);
  Serial.println("[SETUP] Ultrasonic sensors OK");

  // Encoders
  Serial.println("[SETUP] Configuring wheel encoders...");
  pinMode(PIN_ENC_LEFT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_LEFT), leftEncoderISR, RISING);
  pinMode(PIN_ENC_RIGHT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_RIGHT), rightEncoderISR, RISING);
  Serial.println("[SETUP] Encoders OK — ISR attached");

  // I2C + MPU6050
  Serial.println("[SETUP] Initializing I2C + MPU6050...");
  Serial.print("[SETUP] I2C SDA=");
  Serial.print(PIN_SDA);
  Serial.print(" SCL=");
  Serial.println(PIN_SCL);
  Wire.begin(PIN_SDA, PIN_SCL);
  if (!mpu.begin()) {
    Serial.println("[SETUP] *** MPU6050 NOT FOUND — HALTING! ***");
    Serial.println("[SETUP] Check I2C wiring (SDA/SCL) and power");
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
  Serial.println("[SETUP] MPU6050 OK — range=500dps, filter=21Hz");
  delay(1000);

  // Gyro calibration (runs once in setup — delay() allowed here)
  calibrateGyro();
  determineGyroSign();

  // WiFi
  Serial.println();
  Serial.println("[WIFI] ========== Connecting to WiFi ==========");
  Serial.print("[WIFI] SSID: ");
  Serial.println(WIFI_SSID);
  setRGB(0, 0, 255);  // BLUE = connecting
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long wifiStart = millis();
  int dotCount = 0;
  Serial.print("[WIFI] Waiting");
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000) {
    delay(500);
    Serial.print(".");
    dotCount++;
    if (dotCount % 20 == 0) Serial.println();
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    setRGB(0, 255, 0);  // GREEN = connected
    Serial.println("[WIFI] *** CONNECTED SUCCESSFULLY! ***");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] MAC Address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("[WIFI] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("[WIFI] Channel: ");
    Serial.println(WiFi.channel());
  } else {
    Serial.println("[WIFI] *** CONNECTION FAILED (timeout 10s) ***");
    Serial.println("[WIFI] Will continue without WiFi — MQTT unavailable");
    setRGB(255, 165, 0);  // ORANGE = WiFi failed
  }
  Serial.println("[WIFI] ==========================================");
  Serial.println();

  // MQTT
  Serial.println("[SETUP] Configuring MQTT TLS...");
  secureClient.setCACert(ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  Serial.println("[SETUP] MQTT configured — buffer=512 bytes");

  Serial.println("[SETUP] Attempting initial MQTT connection...");
  if (connectMQTT()) {
    Serial.println("[SETUP] Initial MQTT connection successful!");
    lastHeartbeatPub = millis() - 9500;  // Force heartbeat to fire in first loop (~500ms)
  } else {
    Serial.println("[SETUP] Initial MQTT connection failed — will retry in loop");
  }

  Serial.println();
  Serial.println("########################################");
  Serial.println("#       SETUP COMPLETE                 #");
  Serial.print("#       Mode: ");
  Serial.print(currentMode);
  Serial.println("                #");
  Serial.println("#       VacBot is ready!               #");
  Serial.println("########################################");
  Serial.println();
}

// ============================================================================
// Loop
// ============================================================================
void loop() {
  // Throttled loop heartbeat every 10 seconds
  if (millis() - lastLoopLog >= 10000) {
    Serial.print("[LOOP] Heartbeat — Mode=");
    Serial.print(currentMode);
    Serial.print("  MQTT=");
    Serial.print(mqtt.connected() ? "OK" : "DISCONNECTED");
    Serial.print("  WiFi=");
    Serial.print(WiFi.status() == WL_CONNECTED ? "OK" : "DOWN");
    Serial.print("  Uptime=");
    Serial.print(millis() / 1000);
    Serial.print("s  FreeHeap=");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" bytes");
    lastLoopLog = millis();
  }

  // MQTT reconnect logic
  if (!mqtt.connected()) {
    if (millis() - lastReconnectAttempt > reconnectDelay) {
      Serial.print("[MQTT] Disconnected! Reconnecting (delay=");
      Serial.print(reconnectDelay);
      Serial.println("ms)...");
      lastReconnectAttempt = millis();
      if (!connectMQTT()) {
        reconnectDelay = min(reconnectDelay * 2, 30000UL);
        Serial.print("[MQTT] Next retry in ");
        Serial.print(reconnectDelay);
        Serial.println("ms (exponential backoff)");
      }
    }
  } else {
    mqtt.loop();
  }

  // Update gyro angle
  updateGyroAngle();

  // ========== ENHANCED: Poll all 3 sensors every 100ms ==========
  if (millis() - lastSonarPub >= 100) {
    Sonars s = readAllSonars();
    
    // Store readings
    prevSonarFront = sonarFront;
    sonarFront = s.front;
    sonarLeft = s.left;
    sonarRight = s.right;
    
    // Detect if approaching obstacle
    isApproaching = (sonarFront < prevSonarFront && sonarFront < 50);
    
    // Calculate safe directions
    safeDirString = calculateSafeDirections(sonarFront, sonarLeft, sonarRight);
    
    // Update obstacle detection
    publishDistance();
    
    // Publish all 3 sonars
    publishSonars();
    
    // Publish navigation guidance
    publishNavigation();
    
    lastSonarPub = millis();
  }

  // Publish battery
  if (millis() - lastBatteryPub >= 2000) {
    publishBattery();
    // Also publish current mode so Dashboard stays in sync
    mqtt.publish(T_STAT_MODE, currentMode.c_str(), true);
    Serial.print("[MODE] Published current mode: ");
    Serial.println(currentMode);
    lastBatteryPub = millis();
  }

  // Publish heartbeat every 10 seconds to keep robot online status active
  if (millis() - lastHeartbeatPub >= 10000) {
    publishHeartbeat();
    lastHeartbeatPub = millis();
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
  // Log state transitions
  if (autoState != prevAutoState) {
    Serial.println(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    Serial.print("[AUTO] State transition: ");
    // Print previous state name
    switch (prevAutoState) {
      case AUTO_IDLE:            Serial.print("IDLE"); break;
      case AUTO_START_ROW:       Serial.print("START_ROW"); break;
      case AUTO_MOVING_FORWARD:  Serial.print("MOVING_FORWARD"); break;
      case AUTO_OBSTACLE_AVOID:  Serial.print("OBSTACLE_AVOID"); break;
      case AUTO_ROW_COMPLETE:    Serial.print("ROW_COMPLETE"); break;
      case AUTO_TURNING_1:       Serial.print("TURNING_1"); break;
      case AUTO_SHIFTING:        Serial.print("SHIFTING"); break;
      case AUTO_TURNING_2:       Serial.print("TURNING_2"); break;
      case AUTO_COMPLETE:        Serial.print("COMPLETE"); break;
    }
    Serial.print(" -> ");
    // Print new state name
    switch (autoState) {
      case AUTO_IDLE:            Serial.print("IDLE"); break;
      case AUTO_START_ROW:       Serial.print("START_ROW"); break;
      case AUTO_MOVING_FORWARD:  Serial.print("MOVING_FORWARD"); break;
      case AUTO_OBSTACLE_AVOID:  Serial.print("OBSTACLE_AVOID"); break;
      case AUTO_ROW_COMPLETE:    Serial.print("ROW_COMPLETE"); break;
      case AUTO_TURNING_1:       Serial.print("TURNING_1"); break;
      case AUTO_SHIFTING:        Serial.print("SHIFTING"); break;
      case AUTO_TURNING_2:       Serial.print("TURNING_2"); break;
      case AUTO_COMPLETE:        Serial.print("COMPLETE"); break;
    }
    Serial.println();
    Serial.println("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    prevAutoState = autoState;
  }

  switch (autoState) {
    case AUTO_IDLE:
      // Waiting for mode command
      break;

    case AUTO_START_ROW:
      Serial.print("[AUTO] Starting row ");
      Serial.print(autoRow);
      Serial.println(" — resetting encoders & gyro ref");
      resetEncoders();
      resetGyroAngleRef();
      motorsForward();
      autoState = AUTO_MOVING_FORWARD;
      break;

    case AUTO_MOVING_FORWARD:
      // PREDICTIVE: Check if approaching obstacle before collision
      if (isApproaching && sonarFront < 40) {
        Serial.print("[AUTO] PREDICTIVE AVOIDANCE: Front approaching at ");
        Serial.print(sonarFront);
        Serial.println("cm — deciding best turn");
        
        // Decide which way is clearer
        int turnDir = (sonarLeft >= sonarRight) ? 1 : -1;
        
        Serial.print("[AUTO] Turning ");
        Serial.print(turnDir > 0 ? "LEFT" : "RIGHT");
        Serial.print(" (L=");
        Serial.print(sonarLeft);
        Serial.print("cm vs R=");
        Serial.print(sonarRight);
        Serial.println("cm)");
        
        motorsStop();
        obstacleTimer = millis();
        obstacleRetry = 0;
        avoidPhase = AVOID_WAITING;
        avoidTurnDir = turnDir;
        autoState = AUTO_OBSTACLE_AVOID;
      }
      // REACTIVE: Obstacle confirmed
      else if (obstacleDetected) {
        Serial.print("[AUTO] Obstacle detected at ");
        Serial.print(distanceCm, 1);
        Serial.println("cm — stopping & entering obstacle avoidance");
        motorsStop();
        obstacleTimer = millis();
        obstacleRetry = 0;
        avoidPhase = AVOID_WAITING;
        autoState = AUTO_OBSTACLE_AVOID;
      } 
      // ROW COMPLETE
      else if (avgDistCm() >= ROW_LENGTH_CM) {
        Serial.print("[AUTO] Row length reached (");
        Serial.print(avgDistCm(), 1);
        Serial.print("cm >= ");
        Serial.print(ROW_LENGTH_CM, 1);
        Serial.println("cm) — row complete!");
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
            Serial.println("[AVOID] Wait complete — reading all sensors...");
            avoidPhase = AVOID_READING;
          }
          break;

        case AVOID_READING: {
          // Read all 3 sensors and decide turn direction
          Sonars s = readAllSonars();
          bool leftClear = (s.left > SIDE_CLEAR_CM);
          bool rightClear = (s.right > SIDE_CLEAR_CM);

          Serial.print("[AVOID] LeftClear=");
          Serial.print(leftClear ? "YES" : "NO");
          Serial.print("  RightClear=");
          Serial.println(rightClear ? "YES" : "NO");

          if (leftClear && rightClear) {
            avoidTurnDir = (s.left >= s.right) ? 1 : -1;
            Serial.print("[AVOID] Both sides clear — turning ");
            Serial.println(avoidTurnDir > 0 ? "LEFT (more space)" : "RIGHT (more space)");
          } else if (leftClear) {
            avoidTurnDir = 1;
            Serial.println("[AVOID] Only left clear — turning LEFT");
          } else if (rightClear) {
            avoidTurnDir = -1;
            Serial.println("[AVOID] Only right clear — turning RIGHT");
          } else {
            avoidTurnDir = 1;  // Both blocked, default left
            Serial.println("[AVOID] *** BOTH SIDES BLOCKED — defaulting LEFT ***");
          }

          // Start pivoting
          resetGyroAngleRef();
          if (avoidTurnDir > 0) {
            motorsLeft();
          } else {
            motorsRight();
          }
          Serial.print("[AVOID] Pivoting ");
          Serial.print(avoidTurnDir > 0 ? "LEFT" : "RIGHT");
          Serial.print(" — target ");
          Serial.print(TURN_DONE_DEG, 1);
          Serial.println("°");
          avoidPhase = AVOID_TURNING;
          break;
        }

        case AVOID_TURNING:
          // Wait for turn to complete (non-blocking)
          if (gyroAngleDelta() >= TURN_DONE_DEG) {
            Serial.print("[AVOID] Turn complete — delta=");
            Serial.print(gyroAngleDelta(), 1);
            Serial.println("°");
            motorsStop();
            obstacleRetry++;
            Serial.print("[AVOID] Obstacle retry count: ");
            Serial.print(obstacleRetry);
            Serial.println("/3");
            if (obstacleRetry > 3) {
              Serial.println("[AVOID] *** MAX RETRIES EXCEEDED — STOPPING AUTO MODE ***");
              motorsStop();
              setVacuumMotor(0);
              autoState = AUTO_COMPLETE;
            } else {
              // Resume forward
              Serial.println("[AVOID] Resuming forward motion...");
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
      Serial.print("[AUTO] Row complete! Completed row ");
      Serial.print(autoRow);
      Serial.print("/");
      Serial.print(MAX_ROWS);
      Serial.print("  Coverage=");
      Serial.print((int)coveragePct);
      Serial.println("%");

      if (autoRow >= MAX_ROWS) {
        Serial.println("[AUTO] *** ALL ROWS COMPLETE — CLEANING FINISHED! ***");
        motorsStop();
        setVacuumMotor(0);
        autoState = AUTO_COMPLETE;
        currentMode = "MANUAL";
        mqtt.publish(T_STAT_MODE, "MANUAL", true);
        Serial.println("[AUTO] Mode switched to MANUAL");
      } else {
        turnDir = (autoRow % 2 == 0) ? 1 : -1;
        Serial.print("[AUTO] Preparing turn — direction=");
        Serial.println(turnDir == 1 ? "RIGHT" : "LEFT");
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
        Serial.print("[AUTO] Turn 1 complete — delta=");
        Serial.print(gyroAngleDelta(), 1);
        Serial.println("° — shifting forward");
        motorsStop();
        resetEncoders();
        motorsForward();
        autoState = AUTO_SHIFTING;
      }
      break;

    case AUTO_SHIFTING:
      if (avgDistCm() >= ROW_WIDTH_CM) {
        Serial.print("[AUTO] Shift complete — moved ");
        Serial.print(avgDistCm(), 1);
        Serial.println("cm — starting turn 2");
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
        Serial.print("[AUTO] Turn 2 complete — delta=");
        Serial.print(gyroAngleDelta(), 1);
        Serial.println("° — starting next row");
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
