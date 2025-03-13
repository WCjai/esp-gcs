#include <Arduino.h>
#include <WiFi.h>
#include <SPIFFS.h>
#include "DroneData.h"
#include "MAVLinkHandler.h"
#include "WebServerHandler.h"

#define MAVLINK_RX_PIN 16
#define MAVLINK_TX_PIN 17
#define MAVLINK_BAUD   115200




// Setup hardware serial for MAVLink communication.
void setup() {
  Serial.begin(115200);
  Serial2.begin(MAVLINK_BAUD, SERIAL_8N1, MAVLINK_RX_PIN, MAVLINK_TX_PIN);
  Serial.println("MAVLink Serial2 started");

  // Setup heartbeat timers and other MAVLink related tasks.
  setupMAVLinkTimers();

  // Initialize SPIFFS for file serving.
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS Mount Failed");
    return;
  }

  // Initialize the web server.
  setupWebServer();
  clearMission();

  Serial.println("Setup complete.");
}

void loop() {
  // Process incoming MAVLink messages.
  processMAVLink();
  // Handle any incoming web server requests.
  handleWebServerClient();

}
