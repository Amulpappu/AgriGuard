/*
  AgriGuard IoT Node Firmware
  Target: ESP32 DevKit V1
  Sensors:
    - DHT22 / DHT11 (Temperature & Humidity) on GPIO 4
    - Capacitive Soil Moisture Sensor v1.2 (Analog) on GPIO 34 (ADC1)
    - I2C 16x2 LCD Display (SDA on GPIO 21, SCL on GPIO 22)
  
  Sends calibrated sensor readings to AgriGuard FastAPI backend.
  Displays live readings on I2C LCD and Serial Monitor.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ─── Network Configuration ───────────────────────────────────────────────────
const char* WIFI_SSID     = "Lohith";
const char* WIFI_PASSWORD = "lohith&2024";

// Backend API endpoint (points to your laptop on local Wi-Fi)
const char* API_ENDPOINT  = "http://192.168.0.3:8000/api/v1/sensors/readings";

// Authentication key (must match hashed key in AgriGuard database)
const char* DEVICE_KEY    = "agriguard-esp32-key-demo";

// ─── Sensor & LCD Pins ───────────────────────────────────────────────────────
#define DHTPIN 4
#define DHTTYPE DHT11  // 3-pin blue humidity sensor is DHT11
DHT dht(DHTPIN, DHTTYPE);

#define SOIL_PIN 34  // Analog ADC1 channel (safe to use with Wi-Fi)
#define SDA_PIN  21  // I2C Data
#define SCL_PIN  22  // I2C Clock

// I2C 16x2 LCD Object (supports default 0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);
bool lcdFound = false;

// Capacitive Soil Moisture Calibration (12-bit ADC: 0 - 4095)
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

// Reporting interval: 5 seconds for live feedback
const unsigned long REPORT_INTERVAL_MS = 5000;
unsigned long lastReportTime = 0;

// Status LED
#define STATUS_LED 2

void initLCD() {
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Test address 0x27
  Wire.beginTransmission(0x27);
  if (Wire.endTransmission() == 0) {
    lcd = LiquidCrystal_I2C(0x27, 16, 2);
    lcdFound = true;
  } else {
    // Test alternative address 0x3F
    Wire.beginTransmission(0x3F);
    if (Wire.endTransmission() == 0) {
      lcd = LiquidCrystal_I2C(0x3F, 16, 2);
      lcdFound = true;
    }
  }

  if (lcdFound) {
    lcd.init();
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("AgriGuard IoT");
    lcd.setCursor(0, 1);
    lcd.print("Connecting Wi-Fi");
    Serial.println("[LCD] 16x2 I2C Display Initialized!");
  } else {
    Serial.println("[LCD] No I2C LCD detected at 0x27 or 0x3F (continuing without LCD)");
  }
}

void updateLCD(float temp, float humidity, float soil) {
  if (!lcdFound) return;
  lcd.clear();
  
  // Row 1: Temp & Humidity
  lcd.setCursor(0, 0);
  lcd.printf("T:%.1fC  H:%.0f%%", temp, humidity);

  // Row 2: Soil Moisture
  lcd.setCursor(0, 1);
  lcd.printf("Soil Mois: %.1f%%", soil);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\nConnecting to Wi-Fi '%s'...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());
    digitalWrite(STATUS_LED, HIGH);
    if (lcdFound) {
      lcd.setCursor(0, 1);
      lcd.print("Wi-Fi Connected!");
    }
  } else {
    Serial.println("\n[Wi-Fi] Not connected yet. Will retry in background.");
    digitalWrite(STATUS_LED, LOW);
  }
}

float readSoilMoisture() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(SOIL_PIN);
    delay(20);
  }
  int raw = sum / 10;
  raw = constrain(raw, SOIL_WET_RAW, SOIL_DRY_RAW);
  float pct = map(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 1000) / 10.0;
  return pct;
}

bool sendTelemetry(float moisture, float temp, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(4000);

  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"soil_moisture\":%.1f,\"temp_c\":%.1f,\"humidity\":%.1f}",
           moisture, temp, humidity);

  int httpCode = http.POST(payload);
  bool success = (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED);
  if (success) {
    Serial.printf("[HTTP 200] Telemetry delivered to %s\n", API_ENDPOINT);
  }
  http.end();
  return success;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================");
  Serial.println("   AgriGuard ESP32 Sensor Node Online   ");
  Serial.println("========================================");

  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  // Initialize sensors & LCD
  dht.begin();
  initLCD();

  // Connect to Wi-Fi
  connectWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastReportTime >= REPORT_INTERVAL_MS || lastReportTime == 0) {
    lastReportTime = currentMillis;

    float humidity = dht.readHumidity();
    float temp_c   = dht.readTemperature();
    float soil_pct = readSoilMoisture();

    // If DHT hasn't responded yet on first read, retry
    if (isnan(humidity) || isnan(temp_c)) {
      Serial.println("[Sensor Waiting] Reading DHT22 sensor...");
      delay(1000);
      humidity = dht.readHumidity();
      temp_c   = dht.readTemperature();
    }

    if (isnan(humidity)) humidity = 0.0;
    if (isnan(temp_c)) temp_c = 0.0;

    Serial.printf("\n--- Telemetry Reading ---\n");
    Serial.printf("  Temperature:   %.1f C\n", temp_c);
    Serial.printf("  Humidity:      %.1f %%\n", humidity);
    Serial.printf("  Soil Moisture: %.1f %%\n", soil_pct);

    // Update physical LCD display
    updateLCD(temp_c, humidity, soil_pct);

    // Send to AgriGuard backend
    sendTelemetry(soil_pct, temp_c, humidity);
  }

  delay(100);
}
