/*
  AgriGuard IoT Node Firmware
  Target: ESP32 DevKit V1
  Sensors:
    - DHT22 (Temperature & Humidity) on GPIO 4
    - Capacitive Soil Moisture Sensor v1.2 (Analog) on GPIO 34 (ADC1)
  
  Sends calibrated sensor readings to AgriGuard FastAPI backend every 60s.
  Includes Wi-Fi auto-reconnect and HTTP retry with backoff.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ─── Network Configuration ───────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API endpoint (adjust IP/port for your local network)
const char* API_ENDPOINT  = "http://192.168.1.100:8000/api/v1/sensors/readings";

// Authentication key (must match hashed key in AgriGuard database)
const char* DEVICE_KEY    = "agriguard-esp32-key-demo";

// ─── Sensor Pins & Constants ────────────────────────────────────────────────
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define SOIL_PIN 34  // Analog ADC1 channel (safe to use with Wi-Fi)

// Capacitive Soil Moisture Sensor Calibration Constants (12-bit ADC: 0 - 4095)
// Dry air reading (~3100-3300) = 0% moisture
// Submerged in water reading (~1400-1600) = 100% moisture
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

// Reporting interval: 60 seconds
const unsigned long REPORT_INTERVAL_MS = 60000;
unsigned long lastReportTime = 0;

// Status LED
#define STATUS_LED 2

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== AgriGuard ESP32 Sensor Node Starting ===");

  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  // Initialize DHT
  dht.begin();

  // Connect to Wi-Fi
  connectWiFi();
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("Connecting to Wi-Fi '%s'...", WIFI_SSID);
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
  } else {
    Serial.println("\n[Wi-Fi] Connection failed. Will retry during loop.");
    digitalWrite(STATUS_LED, LOW);
  }
}

float readSoilMoisture() {
  // Take 10 readings and average to smooth ADC noise
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(SOIL_PIN);
    delay(20);
  }
  int raw = sum / 10;

  // Constrain to calibrated range
  raw = constrain(raw, SOIL_WET_RAW, SOIL_DRY_RAW);

  // Map to 0 - 100% (Dry -> 0%, Wet -> 100%)
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
  http.setTimeout(8000); // 8 second timeout

  // Build JSON payload
  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"soil_moisture\":%.1f,\"temp_c\":%.1f,\"humidity\":%.1f}",
           moisture, temp, humidity);

  Serial.printf("[HTTP] POST %s -> %s\n", API_ENDPOINT, payload);
  int httpCode = http.POST(payload);

  bool success = false;
  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    Serial.printf("[HTTP] Success (code %d): %s\n", httpCode, response.c_str());
    success = true;
  } else {
    Serial.printf("[HTTP] Failed, code: %d, error: %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
  return success;
}

void loop() {
  unsigned long currentMillis = millis();

  // Handle periodic reporting
  if (currentMillis - lastReportTime >= REPORT_INTERVAL_MS || lastReportTime == 0) {
    lastReportTime = currentMillis;

    // Read sensors
    float humidity = dht.readHumidity();
    float temp_c   = dht.readTemperature();
    float soil_pct = readSoilMoisture();

    // Check DHT read validity
    if (isnan(humidity) || isnan(temp_c)) {
      Serial.println("[Sensor Error] Failed to read from DHT sensor!");
      return;
    }

    Serial.printf("\n--- Telemetry Reading ---\n");
    Serial.printf("  Soil Moisture: %.1f %%\n", soil_pct);
    Serial.printf("  Temperature:   %.1f C\n", temp_c);
    Serial.printf("  Humidity:      %.1f %%\n", humidity);

    // Send with retry
    bool sent = sendTelemetry(soil_pct, temp_c, humidity);
    if (!sent) {
      Serial.println("[Retry] Retrying in 5 seconds...");
      delay(5000);
      sendTelemetry(soil_pct, temp_c, humidity);
    }
  }

  delay(100);
}
