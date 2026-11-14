#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#include "config.h"

// ================================
// RFID PIN CONFIGURATION
// ================================

#define RFID_SS   5
#define RFID_RST  22
#define RFID_SCK  18
#define RFID_MISO 19
#define RFID_MOSI 23

// ================================
// OUTPUT PIN CONFIGURATION
// ================================

#define SERVO_PIN  13
#define GREEN_LED  26
#define RED_LED    27
#define BUZZER_PIN 25

// ================================
// AUTHORIZED RFID UID
// ================================

const byte AUTHORIZED_UID[] = {
  0x2C, 0xD2, 0x16, 0x49
};

const byte AUTHORIZED_UID_SIZE = sizeof(AUTHORIZED_UID);

// ================================
// DOOR CONFIGURATION
// ================================

const int LOCKED_ANGLE = 0;
const int UNLOCKED_ANGLE = 90;
const unsigned long UNLOCK_TIME_MS = 4000;
const unsigned long STATUS_INTERVAL_MS = 15000;

MFRC522 rfid(RFID_SS, RFID_RST);
Servo doorServo;

bool doorIsOpen = false;
unsigned long doorOpenedAt = 0;
unsigned long lastScanAt = 0;
unsigned long lastStatusAt = 0;

void setStatus(bool authorized) {
  digitalWrite(GREEN_LED, authorized ? HIGH : LOW);
  digitalWrite(RED_LED, authorized ? LOW : HIGH);
}

bool isAuthorizedCard() {
  if (rfid.uid.size != AUTHORIZED_UID_SIZE) {
    return false;
  }

  for (byte i = 0; i < AUTHORIZED_UID_SIZE; i++) {
    if (rfid.uid.uidByte[i] != AUTHORIZED_UID[i]) {
      return false;
    }
  }

  return true;
}

void beep(unsigned int frequency, unsigned long durationMs) {
  tone(BUZZER_PIN, frequency, durationMs);
  delay(durationMs);
  noTone(BUZZER_PIN);
}

String currentUid() {
  String uid;

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(rfid.uid.uidByte[i], HEX);

    if (i + 1 < rfid.uid.size) {
      uid += ":";
    }
  }

  uid.toUpperCase();
  return uid;
}

void printUID() {
  Serial.print("Card UID: ");
  Serial.println(currentUid());
}

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting to Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startedAt = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected!");
    Serial.print("ESP32 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed; continuing offline.");
  }
}

void sendAccessEvent(bool granted, const String& uid) {
  connectToWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Event not sent: Wi-Fi is disconnected.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  if (!http.begin(client, ACCESS_EVENTS_API_URL)) {
    Serial.println("Event not sent: invalid API URL.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-api-key", ESP32_API_KEY);
  http.setTimeout(3000);

  String payload = "{\"uid\":\"";
  payload += uid;
  payload += "\",\"granted\":";
  payload += (granted ? "true" : "false");
  payload += ",\"deviceId\":\"";
  payload += DEVICE_ID;
  payload += "\",\"reason\":\"";
  payload += (granted ? "Authorized RFID card" : "Unauthorized RFID card");
  payload += "\"}";

  const int responseCode = http.POST(payload);

  Serial.print("Access event sent: ");
  Serial.println(granted ? "GRANTED" : "DENIED");
  Serial.print("API response code: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println("Failed to send access event.");
  }

  http.end();
}

void sendDeviceStatus() {
  connectToWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Device status not sent: Wi-Fi is disconnected.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  if (!http.begin(client, DEVICE_STATUS_API_URL)) {
    Serial.println("Device status not sent: invalid API URL.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-api-key", ESP32_API_KEY);
  http.setTimeout(3000);

  String payload = "{\"deviceId\":\"";
  payload += DEVICE_ID;
  payload += "\",\"doorOpen\":";
  payload += (doorIsOpen ? "true" : "false");
  payload += ",\"wifiRssi\":";
  payload += String(WiFi.RSSI());
  payload += ",\"ipAddress\":\"";
  payload += WiFi.localIP().toString();
  payload += "\"}";

  const int responseCode = http.POST(payload);
  Serial.print("Device status response code: ");
  Serial.println(responseCode);
  if (responseCode > 0) {
    Serial.print("Device status response: ");
    Serial.println(http.getString());
  } else {
    Serial.print("Device status request failed: ");
    Serial.println(http.errorToString(responseCode));
  }
  http.end();
}

void setup() {
  Serial.begin(9600);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println(" ESP32 RFID DOOR ACCESS SYSTEM ");
  Serial.println("================================");

  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);

  doorServo.setPeriodHertz(50);
  doorServo.attach(SERVO_PIN, 500, 2400);
  doorServo.write(LOCKED_ANGLE);

  SPI.begin(RFID_SCK, RFID_MISO, RFID_MOSI, RFID_SS);
  rfid.PCD_Init();

  connectToWiFi();
  sendDeviceStatus();
  lastStatusAt = millis();

  Serial.println("RC522 initialized!");
  Serial.println("Authorized device: BLUE KEY FOB");
  Serial.println("White card: ACCESS DENIED");
  Serial.println("Door status: LOCKED");
  Serial.println("Waiting for RFID scan...");
}

void loop() {
  if (millis() - lastStatusAt >= STATUS_INTERVAL_MS) {
    lastStatusAt = millis();
    sendDeviceStatus();
  }

  if (doorIsOpen &&
      millis() - doorOpenedAt >= UNLOCK_TIME_MS) {
    doorServo.write(LOCKED_ANGLE);
    doorIsOpen = false;
    digitalWrite(GREEN_LED, LOW);
    Serial.println("AUTO-LOCK: Door locked again.");
    sendDeviceStatus();
  }

  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  if (millis() - lastScanAt < 700) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastScanAt = millis();
  const String uid = currentUid();
  printUID();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (isAuthorizedCard()) {
    Serial.println("ACCESS GRANTED!");
    Serial.println("Blue key fob recognized.");
    Serial.println("Door unlocked.");

    setStatus(true);
    doorServo.write(UNLOCKED_ANGLE);
    doorIsOpen = true;
    doorOpenedAt = millis();
    beep(1800, 120);
    sendDeviceStatus();
    Serial.println("Sending authorized access event...");
    sendAccessEvent(true, uid);
  } else {
    Serial.println("ACCESS DENIED!");
    Serial.println("Unauthorized RFID device.");
    Serial.println("Door locked.");

    setStatus(false);
    beep(450, 350);
    delay(500);
    digitalWrite(RED_LED, LOW);
    sendAccessEvent(false, uid);
  }

}

