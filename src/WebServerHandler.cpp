#include "WebServerHandler.h"
#include "DroneData.h"
#include "Utilities.h"
#include "MAVLinkHandler.h"
#include <WebServer.h>
#include <SPIFFS.h>
#include "ardupilotmega/mavlink.h"
#include <DNSServer.h>
#include <ArduinoJson.h>

DNSServer dnsServer;
const byte DNS_PORT = 53;

// WiFi access point credentials.
const char* ap_ssid     = "ESP32_HUD";
const char* ap_password = "12345678";

// Create the web server on port 80.
WebServer server(80);

extern uint8_t mavlinkBuffer[];
extern unsigned long lastMavlinkTime;

// -------------------------
// Mission JSON Handling
// -------------------------

size_t missionItemCount =0;
MissionItem missionItems[MAX_MISSION_ITEMS];



void handleClearMission() {
  clearMission();
  server.send(200, "text/plain", "cleared Mission.");
}


void clearMission() {
  mavlink_message_t msg;
  mavlink_msg_mission_clear_all_pack(
    MAVLINK_SYSTEM_ID,
    MAVLINK_COMPONENT_ID,
    &msg,
    TARGET_SYSTEM,
    TARGET_COMPONENT,
    0  // mission_type: 0 for a regular mission.
  );
  sendMessage(msg);
  Serial.println("Sent mission clear.");
}

void sendMessage(mavlink_message_t &msg) {
  uint8_t buffer[MAVLINK_MAX_PACKET_LEN];
  uint16_t len = mavlink_msg_to_send_buffer(buffer, &msg);

  // Non-blocking wait until there's enough room in the serial output buffer.
  unsigned long startTime = millis();
  while (Serial2.availableForWrite() < len) {
    // Optionally, add a timeout (e.g., 50ms) to avoid an infinite loop.
    if (millis() - startTime > 50) {
      break; // Or handle error accordingly.
    }
    yield();
  }

  Serial2.write(buffer, len);
}

void uploadMission() {
  mavlink_message_t msg;
  mavlink_msg_mission_count_pack(
    MAVLINK_SYSTEM_ID,
    MAVLINK_COMPONENT_ID,
    &msg,
    TARGET_SYSTEM,
    TARGET_COMPONENT,
    missionItemCount, // Total number of mission items.
    MAV_MISSION_TYPE_MISSION,               // mission_type (0 for regular mission)
    0                // opaque_id (use 0 if not used)
  );
  sendMessage(msg);
  Serial.printf("Sent mission count: %d\n", missionItemCount);
}

// Helper to send a COMMAND_LONG message.
void sendCommandLong(uint16_t command,
  float param1, float param2, float param3,
  float param4, float param5, float param6,
  float param7) {
mavlink_message_t msg;
mavlink_msg_command_long_pack(
MAVLINK_SYSTEM_ID,
MAVLINK_COMPONENT_ID,
&msg,
TARGET_SYSTEM,
TARGET_COMPONENT,
command,
0,  // confirmation
param1,
param2,
param3,
param4,
param5,
param6,
param7
);
sendMessage(msg);
}

// Arm the vehicle using a COMMAND_LONG message.
void armVehicle() {
  Serial.println("Arming vehicle...");
  // MAV_CMD_COMPONENT_ARM_DISARM (command 400) with param1 = 1 arms the vehicle.
  sendCommandLong(MAV_CMD_COMPONENT_ARM_DISARM, 1, 0, 0, 0, 0, 0, 0);
}

// Set the vehicle mode to AUTO (which will start the mission).
void setModeAuto() {
  Serial.println("Setting mode to AUTO (mission start)...");
  // Example: using MAV_CMD_DO_SET_MODE (command 176) with custom mode parameters.
  sendCommandLong(MAV_CMD_DO_SET_MODE, 1, 4, 0, 0, 0, 0, 0);
}



void startMission() {
  armVehicle();

  setModeAuto();
  Serial.println("Mission started.");
}

void handleStartMission() {
  startMission();
  server.send(200, "text/plain", "Mission started.");
}

void handleMission() {
  String missionJSON = server.arg("plain");
  Serial.println("Received Mission JSON:");
  Serial.println(missionJSON);
  
  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, missionJSON);
  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    server.send(400, "text/plain", "Invalid mission JSON");
    return;
  }
  
  // Parse mission items into the global array.
  missionItemCount = 0;
  JsonArray missionArray = doc["mission"].as<JsonArray>();
  for (JsonObject item : missionArray) {
    if (missionItemCount >= MAX_MISSION_ITEMS)
      break;
      
    missionItems[missionItemCount].seq = item["seq"] | 0;
    missionItems[missionItemCount].cmd = item["cmd"] | 0;
    missionItems[missionItemCount].latitude = item.containsKey("latitude") ? item["latitude"].as<float>() : NAN;
    missionItems[missionItemCount].longitude = item.containsKey("longitude") ? item["longitude"].as<float>() : NAN;
    missionItems[missionItemCount].altitude = item.containsKey("altitude") ? item["altitude"].as<float>() : NAN;
    missionItems[missionItemCount].param1 = item.containsKey("param1") ? item["param1"].as<float>() : NAN;
    missionItems[missionItemCount].param2 = item.containsKey("param2") ? item["param2"].as<float>() : NAN;
    missionItems[missionItemCount].param3 = item.containsKey("param3") ? item["param3"].as<float>() : NAN;
    missionItems[missionItemCount].param4 = item.containsKey("param4") ? item["param4"].as<float>() : NAN;
    missionItems[missionItemCount].param5 = item.containsKey("param5") ? item["param5"].as<float>() : 0;
    
    missionItemCount++;
  }
  
  Serial.print("Parsed ");
  Serial.print(missionItemCount);
  Serial.println(" mission items.");
  
  for (size_t i = 0; i < missionItemCount; i++) {
    Serial.print("Seq: ");
    Serial.print(missionItems[i].seq);
    Serial.print(", Cmd: ");
    Serial.print(missionItems[i].cmd);
    Serial.print(", Lat: ");
    Serial.print(missionItems[i].latitude, 7);
    Serial.print(", Lon: ");
    Serial.print(missionItems[i].longitude, 7);
    Serial.print(", Alt: ");
    Serial.print(missionItems[i].altitude, 2);
    Serial.print(", Param1: ");
    Serial.print(missionItems[i].param1);
    Serial.print(", Param2: ");
    Serial.print(missionItems[i].param2);
    Serial.print(", Param3: ");
    Serial.print(missionItems[i].param3);
    Serial.print(", Param4: ");
    Serial.print(missionItems[i].param4);
    Serial.print(", Param5: ");
    Serial.println(missionItems[i].param5);
  }
  
  // Clear the previous mission on the autopilot.
  clearMission();
  
  // Instead of using delay(), use a non-blocking wait.
  unsigned long clearStart = millis();
  while (millis() - clearStart < 1000) {
    yield();
  }
  
  // Upload the mission count.
  uploadMission();
  
  
  server.send(200, "text/plain", "Mission JSON received and parsed.");
}

// -------------------------
// Existing Web Server Code
// -------------------------

// Helper: Stream a file from SPIFFS.
void handleFileRequest(const char* path, const char* contentType) {
  File file = SPIFFS.open(path, "r");
  if (!file) {
    server.send(500, "text/plain", String("Failed to open ") + path);
    return;
  }
  server.streamFile(file, contentType);
  file.close();
}

// New handler that adds cache headers.
void handleFileRequestWithCache(const char* path, const char* contentType) {
  File file = SPIFFS.open(path, "r");
  if (!file) {
    server.send(500, "text/plain", String("Failed to open ") + path);
    return;
  }
  // Cache these files for one day (86400 seconds)
  server.sendHeader("Cache-Control", "public, max-age=86400");
  server.streamFile(file, contentType);
  file.close();
}

// Helper: Set up a route with caching.
void setupStaticRouteWithCache(const char* url, const char* spiffsPath, const char* contentType) {
  server.on(url, HTTP_GET, [=]() {
    handleFileRequestWithCache(spiffsPath, contentType);
  });
}

void setupStaticRoute(const char* url, const char* spiffsPath, const char* contentType) {
  server.on(url, HTTP_GET, [=]() {
    handleFileRequest(spiffsPath, contentType);
  });
}

void handleRoot()    { handleFileRequest("/index.html", "text/html"); }
void handleStyles()  { handleFileRequest("/CSS/styles.css", "text/css"); }
void handleScript()  { handleFileRequest("/JavaScript/script.js", "application/javascript"); }

// Custom tile handler with cache headers.
void handleTileRequest() {
  String uri = server.uri();  // e.g., "/tiles/16/59921/39659.png"
  File file = SPIFFS.open(uri, "r");
  if (!file) {
    server.send(404, "text/plain", "Tile not found");
    return;
  }
  server.sendHeader("Cache-Control", "public, max-age=86400");
  server.streamFile(file, "image/png");
  file.close();
}

String getDroneStatusJSON() {
  String json = "{";
  json += "\"speed\":" + String(droneData.speed, 2) + ",";
  json += "\"altitude\":" + String(droneData.altitude, 2) + ",";
  json += "\"heading\":" + String(droneData.heading, 2) + ",";
  json += "\"pitch\":" + String(droneData.pitch, 2) + ",";
  json += "\"roll\":" + String(droneData.roll, 2) + ",";
  json += "\"rssi\":" + String(droneData.rssi) + ",";
  json += "\"connected\":" + String(droneData.connected ? 1 : 0) + ",";
  json += "\"armed\":" + String(droneData.armed ? 1 : 0) + ",";
  json += "\"flightMode\":\"" + droneData.flightMode + "\",";
  json += "\"batteryVoltage\":" + String(droneData.batteryVoltage, 2) + ",";
  json += "\"latitude\":" + String(droneData.latitude, 7) + ",";
  json += "\"longitude\":" + String(droneData.longitude, 7) + ",";
  json += "\"statustext\":[\"" + escapeJson(lastStatusText[0]) + "\",";
  json += "\"" + escapeJson(lastStatusText[1]) + "\",";
  json += "\"" + escapeJson(lastStatusText[2]) + "\"]";
  json += "}";
  return json;
}

void handleStatus() {
  if (millis() - lastMavlinkTime > 2000) {
    droneData.connected = false;
    droneData.rssi = 0;
  }
  server.send(200, "application/json", getDroneStatusJSON());
}

void handleSetMode() {
  if (!server.hasArg("mode")) {
    server.send(400, "text/plain", "Missing mode parameter");
    return;
  }
  String modeParam = server.arg("mode");
  uint32_t base_mode = 0, main_mode = 0, sub_mode = 0;
  if (modeParam == "position") {
    base_mode = 209; main_mode = 3; sub_mode = 0;
  } else if (modeParam == "altitude") {
    base_mode = 193; main_mode = 2; sub_mode = 0;
  } else if (modeParam == "stabilize") {
    base_mode = 209; main_mode = 7; sub_mode = 0;
  } else if (modeParam == "land") {
    base_mode = 217; main_mode = 4; sub_mode = 6;
  } else {
    server.send(400, "text/plain", "Unknown mode parameter");
    return;
  }
  mavlink_message_t msg;
  mavlink_command_long_t cmd;
  cmd.target_system = TARGET_SYSTEM;
  cmd.target_component = TARGET_COMPONENT;
  cmd.command = MAV_CMD_DO_SET_MODE;
  cmd.confirmation = 0;
  cmd.param1 = base_mode;
  cmd.param2 = main_mode;
  cmd.param3 = sub_mode;
  cmd.param4 = 0;
  cmd.param5 = 0;
  cmd.param6 = 0;
  cmd.param7 = 0;
  mavlink_msg_command_long_encode(MAVLINK_SYSTEM_ID, MAVLINK_COMPONENT_ID, &msg, &cmd);
  sendMessage(msg);
}

void setupStaticRoute(const char* url, const char* spiffsPath) {
  server.serveStatic(url, SPIFFS, spiffsPath);
}

void setupWebServer() {
  WiFi.softAP(ap_ssid, ap_password);
  Serial.println("Access Point Started");
  IPAddress apIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(apIP);
  dnsServer.start(DNS_PORT, "*", apIP);

  server.on("/", HTTP_GET, handleRoot);

  // Cached static files.
  setupStaticRouteWithCache("/blockly_compressed.js", "/blockly_compressed.js", "application/javascript");
  setupStaticRouteWithCache("/blocks_compressed.js", "/blocks_compressed.js", "application/javascript");
  setupStaticRouteWithCache("/leaflet.js", "/leaflet.js", "application/javascript");
  setupStaticRouteWithCache("/leaflet.rotatedMarker.js", "/leaflet.rotatedMarker.js", "application/javascript");
  setupStaticRouteWithCache("/msg/js/en.js", "/msg/js/en.js", "application/javascript");
  setupStaticRouteWithCache("/leaflet.css", "/leaflet.css", "text/css");

  // Other files without caching (or with different caching as needed).
  setupStaticRoute("/javascript_compressed.js", "/javascript_compressed.js", "application/javascript");
  setupStaticRoute("/styles.css", "/CSS/styles.css", "text/css");
  setupStaticRoute("/sw.js", "/sw.js", "application/javascript");
  setupStaticRoute("/script.js", "/JavaScript/script.js", "application/javascript");
  setupStaticRoute("/click.mp3", "/click.mp3", "audio/mpeg");
  setupStaticRoute("/delete.mp3", "/delete.mp3", "audio/mpeg");
  setupStaticRoute("/disconnect.wav", "/disconnect.wav", "audio/wav");
  setupStaticRoute("/sprites.png", "/sprites.png", "image/png");
  setupStaticRoute("/images/marker-icon.png", "/images/marker-icon.png", "image/png");

  // Intercept tile requests to add cache headers.
  server.onNotFound([](){
    String uri = server.uri();  // e.g., "/tiles/16/59921/39659.png"
    if (uri.startsWith("/tiles/")) {
      handleTileRequest();
      return;
    }
    server.send(404, "text/plain", "Not found");
  });

  server.on("/status", HTTP_GET, handleStatus);
  server.on("/setmode", HTTP_GET, handleSetMode);
  server.on("/mission", HTTP_POST, handleMission);
  server.on("/startmission", HTTP_GET, handleStartMission);
  server.on("/clearmission", HTTP_GET, handleClearMission);
  server.begin();
  Serial.println("Web server started.");
}

void handleWebServerClient() {
  server.handleClient();
  dnsServer.processNextRequest();
}
