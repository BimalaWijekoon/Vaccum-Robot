// ============================================================================
// VacBot MOCK TEST Firmware for ESP32-S3
// ============================================================================
// Simulates sensor data and publishes to MQTT for testing Dashboard
// WITHOUT requiring any hardware (motors, sensors, etc)
// ============================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIG SECTION — MATCH YOUR ROBOT
// ============================================================================
#define WIFI_SSID                "COMFRI"  // ← Change to your WiFi
#define WIFI_PASS                "your_wifi_password"  // ← Change
#define MQTT_HOST                "0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud"
#define MQTT_PORT                8883
#define MQTT_USER                "VaccumRobot"
#define MQTT_PASS                "Vaccum@12345"

// MQTT Topics (same as real firmware)
#define T_CMD_MOVEMENT  "vacbot/cmd/movement"
#define T_CMD_SUCTION   "vacbot/cmd/suction"
#define T_CMD_MODE      "vacbot/cmd/mode"
#define T_STAT_BATTERY  "vacbot/status/battery"
#define T_STAT_DISTANCE "vacbot/status/distance"
#define T_STAT_MODE     "vacbot/status/mode"
#define T_STAT_AUTO     "vacbot/status/auto"
#define T_STAT_ONLINE   "vacbot/status/online"

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

// Global MQTT client
WiFiClientSecure secureClient;
PubSubClient mqtt(secureClient);

// Mock state variables
String currentMode = "MANUAL";
int batteryPercent = 85;
float batteryVoltage = 11.2f;
int distance_cm = 50;
bool obstacleDetected = false;
int autoRow = 0;
float gyroAngle = 0.0f;
int autoMode = 0;  // 0 = MANUAL, 1 = AUTO

unsigned long lastBatteryPub = 0;
unsigned long lastDistancePub = 0;
unsigned long lastAutoPub = 0;
unsigned long lastHeartbeat = 0;

// ============================================================================
// MQTT Callback — receives commands from Dashboard
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

  if (strcmp(topic, T_CMD_MOVEMENT) == 0) {
    Serial.println("[MOCK] Received movement command (ignored in MANUAL)");
  } else if (strcmp(topic, T_CMD_SUCTION) == 0) {
    int val = p.toInt();
    Serial.print("[MOCK] Suction set to: ");
    Serial.println(val);
  } else if (strcmp(topic, T_CMD_MODE) == 0) {
    Serial.print("[MOCK] Mode changed: ");
    Serial.println(p);
    if (p == "AUTO") {
      currentMode = "AUTO";
      autoMode = 1;
      autoRow = 0;
      gyroAngle = 0.0f;
      Serial.println("[MOCK] Switching to AUTO mode");
    } else if (p == "MANUAL") {
      currentMode = "MANUAL";
      autoMode = 0;
      Serial.println("[MOCK] Switching to MANUAL mode");
    }
  }
  Serial.println("========================================");
}

// ============================================================================
// MQTT Connection
// ============================================================================
bool connectMQTT() {
  Serial.println("[MQTT] Attempting connection...");
  Serial.print("[MQTT] Broker: ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  // Test DNS resolution
  Serial.println("[MQTT] Testing DNS resolution...");
  IPAddress brokerIP;
  if (WiFi.hostByName(MQTT_HOST, brokerIP) == 0) {
    Serial.println("[MQTT] ❌ DNS FAILED — cannot resolve broker hostname!");
    Serial.println("[MQTT] Check internet connection or broker hostname");
    return false;
  }
  Serial.print("[MQTT] DNS resolved: ");
  Serial.println(brokerIP);

  char clientId[32];
  snprintf(clientId, sizeof(clientId), "mock-vacbot-%04x", random(0xFFFF));
  Serial.print("[MQTT] Client ID: ");
  Serial.println(clientId);

  Serial.println("[MQTT] Starting TLS handshake (15s timeout)...");
  unsigned long startTime = millis();
  
  bool connected = mqtt.connect(clientId, MQTT_USER, MQTT_PASS, T_STAT_ONLINE, 0, true, "offline", false);
  unsigned long elapsed = millis() - startTime;
  
  Serial.print("[MQTT] TLS handshake took ");
  Serial.print(elapsed);
  Serial.println("ms");

  if (!connected) {
    int state = mqtt.state();
    Serial.print("[MQTT] ❌ CONNECTION FAILED — state=");
    Serial.println(state);
    
    Serial.println("[MQTT] State meanings:");
    Serial.println("[MQTT]   -4 = MQTT_CONNECTION_TIMEOUT (TLS timeout)");
    Serial.println("[MQTT]   -3 = MQTT_CONNECTION_LOST");
    Serial.println("[MQTT]   -2 = MQTT_CONNECT_FAILED (wrong credentials or cert)");
    Serial.println("[MQTT]   -1 = MQTT_DISCONNECTED");
    Serial.println("[MQTT]    0 = MQTT_CONNECTED");
    Serial.println("[MQTT]    1 = MQTT_CONNECT_BAD_PROTOCOL");
    Serial.println("[MQTT]    2 = MQTT_CONNECT_BAD_CLIENT_ID");
    Serial.println("[MQTT]    3 = MQTT_CONNECT_UNAVAILABLE");
    Serial.println("[MQTT]    4 = MQTT_CONNECT_BAD_CREDENTIALS");
    Serial.println("[MQTT]    5 = MQTT_CONNECT_UNAUTHORIZED");
    
    if (state == -2 || state == -4) {
      Serial.println("\n[MQTT] Likely causes:");
      Serial.println("[MQTT]   • TLS certificate mismatch");
      Serial.println("[MQTT]   • Connection timeout (broker unreachable)");
      Serial.println("[MQTT]   • Firewall blocking port 8883");
      Serial.println("[MQTT]   • Invalid MQTT broker address");
    } else if (state == 4) {
      Serial.println("\n[MQTT] Bad credentials!");
      Serial.println("[MQTT]   Check MQTT_USER and MQTT_PASS (lines 19-20)");
    }
    
    return false;
  }
  
  Serial.println("[MQTT] ✅ CONNECTED SUCCESSFULLY!");

  // IMMEDIATELY publish "online" to override any retained "offline" message
  for (int i = 0; i < 3; i++) {
    mqtt.publish(T_STAT_ONLINE, "online", true);
    delay(50);
  }
  Serial.println("[MQTT] ✅ Published online status (3x to ensure)");

  // Subscribe to all command topics
  mqtt.subscribe(T_CMD_MOVEMENT);
  mqtt.subscribe(T_CMD_SUCTION);
  mqtt.subscribe(T_CMD_MODE);
  Serial.println("[MQTT] Subscribed to command topics");

  // Publish online status
  mqtt.publish(T_STAT_ONLINE, "online", true);
  Serial.println("[MQTT] Published: online");

  return true;
}

// ============================================================================
// Mock Data Publishing
// ============================================================================
void publishBattery() {
  // Simulate battery drain
  batteryPercent -= random(0, 2);
  batteryPercent = constrain(batteryPercent, 10, 100);
  batteryVoltage = 9.0f + (batteryPercent / 100.0f) * 3.6f;

  String health = "GOOD";
  if (batteryPercent > 75) health = "EXCELLENT";
  else if (batteryPercent > 50) health = "GOOD";
  else if (batteryPercent > 25) health = "FAIR";
  else health = "CRITICAL";

  StaticJsonDocument<256> doc;
  doc["voltage"] = serialized(String(batteryVoltage, 1));
  doc["percent"] = batteryPercent;
  doc["health"] = health;
  doc["alert"] = (batteryPercent < 25);

  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_BATTERY, payload.c_str(), true);

  Serial.print("[PUB] Battery: ");
  Serial.print(batteryPercent);
  Serial.print("% ");
  Serial.print(batteryVoltage, 1);
  Serial.print("V — ");
  Serial.println(health);
}

void publishDistance() {
  // Simulate distance changes
  distance_cm += random(-5, 6);
  distance_cm = constrain(distance_cm, 5, 200);

  obstacleDetected = (distance_cm < 15);  // Obstacle if < 15cm

  StaticJsonDocument<128> doc;
  doc["cm"] = distance_cm;
  doc["obstacle"] = obstacleDetected;

  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_DISTANCE, payload.c_str());

  Serial.print("[PUB] Distance: ");
  Serial.print(distance_cm);
  Serial.print("cm — Obstacle: ");
  Serial.println(obstacleDetected ? "YES" : "No");
}

void publishMode() {
  mqtt.publish(T_STAT_MODE, currentMode.c_str(), true);
  Serial.print("[PUB] Mode: ");
  Serial.println(currentMode);
}

void publishAutoStatus() {
  if (autoMode == 0) return;  // Only publish in AUTO mode

  // Simulate row progression
  if (autoRow < 10) {
    autoRow++;
  }

  // Simulate gyro angle
  gyroAngle += random(-10, 11);
  if (gyroAngle > 360) gyroAngle -= 360;
  if (gyroAngle < 0) gyroAngle += 360;

  String autoState = "MOVING_FORWARD";
  if (obstacleDetected) autoState = "OBSTACLE_AVOID";
  if (autoRow >= 10) autoState = "COMPLETE";

  float coverage = (autoRow * 10.0f);

  StaticJsonDocument<256> doc;
  doc["state"] = autoState;
  doc["row"] = autoRow;
  doc["yaw"] = serialized(String(gyroAngle, 1));
  doc["left_dist_cm"] = serialized(String(50 + random(-10, 11)));
  doc["right_dist_cm"] = serialized(String(50 + random(-10, 11)));
  doc["coverage_pct"] = (int)coverage;

  String payload;
  serializeJson(doc, payload);
  mqtt.publish(T_STAT_AUTO, payload.c_str());

  Serial.print("[PUB] Auto: Row ");
  Serial.print(autoRow);
  Serial.print("/10 — State: ");
  Serial.print(autoState);
  Serial.print(" — Yaw: ");
  Serial.print(gyroAngle, 1);
  Serial.println("°");
}

void publishHeartbeat() {
  mqtt.publish(T_STAT_ONLINE, "online");
  Serial.println("[PUB] Heartbeat");
}

// ============================================================================
// Setup
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n");
  Serial.println("########################################");
  Serial.println("#   VacBot MOCK TEST FIRMWARE v1.0     #");
  Serial.println("#   Testing Dashboard ↔ MQTT ↔ Robot   #");
  Serial.println("########################################");
  Serial.println();

  // WiFi
  Serial.println("[WIFI] Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long wifiStart = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WIFI] ✅ Connected!");
    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WIFI] ❌ Connection FAILED!");
    while (1) delay(1000);
  }

  // MQTT Setup
  Serial.println("[MQTT] Setting up TLS...");
  secureClient.setCACert(ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  
  // Wait for battery sensor to stabilize (if using real hardware later)
  Serial.println("[SETUP] Waiting 2 seconds for stability...");
  delay(2000);

  // Connect to MQTT
  if (!connectMQTT()) {
    Serial.println("[MQTT] Initial connection failed!");
    Serial.println("\n[MQTT] DIAGNOSTIC: Attempting fallback (insecure mode)...");
    Serial.println("[MQTT] This will help identify if it's a certificate issue");
    
    // Reset and try WITHOUT TLS certificate verification
    secureClient.setInsecure();  // Disable TLS verification
    delay(1000);
    
    if (connectMQTT()) {
      Serial.println("\n[MQTT] ✅ SUCCESS with insecure mode!");
      Serial.println("[MQTT] This confirms it's a CERTIFICATE issue, not network");
      Serial.println("[MQTT] The TLS cert in the code may be outdated");
    } else {
      Serial.println("\n[MQTT] Still failed with insecure mode");
      Serial.println("[MQTT] This suggests a network/firewall issue, not certificate");
    }
  } else {
    // Force heartbeat to fire in first loop (~500ms)
    lastHeartbeat = millis() - 9500;
  }

  Serial.println();
  Serial.println("########################################");
  Serial.println("#  MOCK TEST READY                    #");
  Serial.println("#  Publishing data every second       #");
  Serial.println("#  Try sending commands via Dashboard #");
  Serial.println("########################################");
  Serial.println();
}

// ============================================================================
// Loop
// ============================================================================
void loop() {
  // Reconnect if needed
  if (!mqtt.connected()) {
    Serial.println("[MQTT] Disconnected — reconnecting...");
    if (!connectMQTT()) {
      delay(5000);
      return;
    }
  }

  mqtt.loop();

  unsigned long now = millis();

  // Publish battery every 2 seconds
  if (now - lastBatteryPub >= 2000) {
    publishBattery();
    publishMode();  // Publish mode too
    lastBatteryPub = now;
  }

  // Publish distance every 500ms
  if (now - lastDistancePub >= 500) {
    publishDistance();
    lastDistancePub = now;
  }

  // Publish auto status every 1 second
  if (now - lastAutoPub >= 1000) {
    publishAutoStatus();
    lastAutoPub = now;
  }

  // Publish heartbeat every 10 seconds
  if (now - lastHeartbeat >= 10000) {
    publishHeartbeat();
    lastHeartbeat = now;
  }

  delay(50);  // Small delay to prevent overwhelming the loop
}
