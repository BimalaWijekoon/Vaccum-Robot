// ============================================================================
// VacBot Battery Diagnostic Test
// ============================================================================
// Purpose: Diagnose battery voltage reading issues
// Shows: Raw ADC values, calculated voltages, voltage divider analysis
// ============================================================================

#define PIN_BATTERY     20   // Battery voltage ADC pin
#define BATTERY_MAX_V   12.6f
#define BATTERY_MIN_V   9.0f

// Globals
unsigned long lastPrintMs = 0;
int sampleCount = 0;
float minVoltage = 999.0f;
float maxVoltage = 0.0f;
int minRawADC = 4095;
int maxRawADC = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n");
  Serial.println("########################################");
  Serial.println("#   BATTERY DIAGNOSTIC TEST v1.0       #");
  Serial.println("########################################");
  Serial.println();

  // Configure ADC
  Serial.println("[SETUP] Configuring ADC...");
  analogReadResolution(12);  // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db);  // Full voltage range
  Serial.println("[SETUP] ADC: 12-bit resolution, 11db attenuation");
  Serial.println("[SETUP] Expected range: 0-4095 raw, 0-3.3V input");
  Serial.println();

  // Print header
  Serial.println("========================================");
  Serial.println("BATTERY VOLTAGE DIAGNOSTIC");
  Serial.println("========================================");
  Serial.println();
  Serial.println("Formula Testing:");
  Serial.println("  F1: raw * (3.3/4095) * 5.0");
  Serial.println("  F2: raw * (3.3/4095) * 4.0");
  Serial.println("  F3: raw * (3.3/4095) * 6.0");
  Serial.println("  F4: raw * 0.00402 * 5.0");
  Serial.println();
  Serial.println("Expected readings at ~10.7V battery:");
  Serial.println("  - GPIO 20 (with 1:5 divider): ~2.14V → ADC: ~2650");
  Serial.println("  - GPIO 20 (with 1:4 divider): ~2.68V → ADC: ~3327");
  Serial.println("  - GPIO 20 (with 1:6 divider): ~1.78V → ADC: ~2206");
  Serial.println();
  Serial.println("========================================");
  Serial.println();
}

void loop() {
  unsigned long now = millis();

  // Read ADC (take 10 samples and average)
  int rawSum = 0;
  for (int i = 0; i < 10; i++) {
    rawSum += analogRead(PIN_BATTERY);
    delayMicroseconds(100);
  }
  int rawADC = rawSum / 10;

  // Track min/max
  if (rawADC < minRawADC) minRawADC = rawADC;
  if (rawADC > maxRawADC) maxRawADC = rawADC;

  // Calculate voltages with different formulas
  float v3_3 = rawADC * (3.3f / 4095.0f);  // Raw 3.3V
  float formula1 = rawADC * (3.3f / 4095.0f) * 5.0f;    // Current formula
  float formula2 = rawADC * (3.3f / 4095.0f) * 4.0f;    // 1:4 divider
  float formula3 = rawADC * (3.3f / 4095.0f) * 6.0f;    // 1:6 divider
  float formula4 = rawADC * 0.00402f * 5.0f;            // Simplified

  // Track min/max voltage
  if (formula1 < minVoltage) minVoltage = formula1;
  if (formula1 > maxVoltage) maxVoltage = formula1;

  sampleCount++;

  // Print every 1 second
  if (now - lastPrintMs >= 1000) {
    Serial.println("========================================");
    Serial.print("Sample #");
    Serial.print(sampleCount);
    Serial.print(" | Time: ");
    Serial.print(now / 1000);
    Serial.println("s");
    Serial.println("========================================");

    Serial.print("[ADC-RAW] Value: ");
    Serial.print(rawADC);
    Serial.print(" (0-4095)  Range: ");
    Serial.print(minRawADC);
    Serial.print("-");
    Serial.println(maxRawADC);

    Serial.print("[ADC-3.3V] Input voltage at GPIO 20: ");
    Serial.print(v3_3, 3);
    Serial.println("V");

    Serial.println();
    Serial.println("FORMULA CALCULATIONS:");
    Serial.print("  [F1] raw*3.3/4095*5.0 = ");
    Serial.print(formula1, 2);
    Serial.print("V  (Current formula)");
    int pct1 = (int)(((formula1 - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
    Serial.print("  → ");
    Serial.print(constrain(pct1, 0, 100));
    Serial.println("%");

    Serial.print("  [F2] raw*3.3/4095*4.0 = ");
    Serial.print(formula2, 2);
    Serial.print("V  (1:4 divider)");
    int pct2 = (int)(((formula2 - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
    Serial.print("  → ");
    Serial.print(constrain(pct2, 0, 100));
    Serial.println("%");

    Serial.print("  [F3] raw*3.3/4095*6.0 = ");
    Serial.print(formula3, 2);
    Serial.print("V  (1:6 divider)");
    int pct3 = (int)(((formula3 - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100.0f);
    Serial.print("  → ");
    Serial.print(constrain(pct3, 0, 100));
    Serial.println("%");

    Serial.print("  [F4] raw*0.00402*5.0  = ");
    Serial.print(formula4, 2);
    Serial.println("V  (Simplified)");

    Serial.println();
    Serial.print("[STATS] Min Voltage: ");
    Serial.print(minVoltage, 2);
    Serial.print("V | Max Voltage: ");
    Serial.print(maxVoltage, 2);
    Serial.print("V | Delta: ");
    Serial.print(maxVoltage - minVoltage, 2);
    Serial.println("V");

    Serial.println();
    Serial.println("DIAGNOSTIC NOTES:");
    if (rawADC < 500) {
      Serial.println("  ⚠️  RAW ADC VERY LOW — GPIO 20 might be floating or not connected!");
    } else if (rawADC < 1000) {
      Serial.println("  ⚠️  RAW ADC LOW — Check voltage divider connection");
    } else if (rawADC > 3500) {
      Serial.println("  ⚠️  RAW ADC HIGH — Battery voltage may be too high or divider ratio wrong");
    } else {
      Serial.println("  ✅ RAW ADC IN NORMAL RANGE");
    }

    if (formula1 < 2.0f) {
      Serial.println("  ⚠️  Voltage too low (F1) — Divider might be 1:6 or 1:7 instead of 1:5");
    } else if (formula1 > 14.0f) {
      Serial.println("  ⚠️  Voltage too high (F1) — No voltage divider or broken connection");
    } else if (formula1 >= BATTERY_MIN_V && formula1 <= BATTERY_MAX_V) {
      Serial.println("  ✅ VOLTAGE IN EXPECTED RANGE (F1) — Current formula is correct!");
    } else {
      Serial.println("  ❌ Voltage out of range — Try F2 or F3 formula");
    }

    Serial.println();
    Serial.println("========================================");
    Serial.println();

    lastPrintMs = now;
  }

  delay(100);
}
