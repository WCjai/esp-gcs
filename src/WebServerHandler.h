#ifndef WEBSERVERHANDLER_H
#define WEBSERVERHANDLER_H

#include <Arduino.h>
#include "ardupilotmega/mavlink.h"
#define MAX_MISSION_ITEMS     20
#define MAVLINK_SYSTEM_ID     2                             // Our (ESP32) system ID
#define MAVLINK_COMPONENT_ID  MAV_COMP_ID_MISSIONPLANNER    // Our component ID
#define TARGET_SYSTEM         1                             // Flight controller system ID
#define TARGET_COMPONENT      1                             // Flight controller component (often 1 or 0)

struct MissionItem {
    int seq;            // Sequence number
    uint16_t cmd;       // Command type ("takeoff", "goto", "land", "wait", etc.)
    float latitude;     // degrees (used for GPS commands)
    float longitude;    // degrees (used for GPS commands)
    float altitude;     // meters (used for GPS commands)
    float param1;       // Extra parameter 1 (e.g., wait duration)
    float param2;       // Extra parameter 2
    float param3;       // Extra parameter 3
    float param4;       // Extra parameter 4
    float param5;       // Extra parameter 5
  };
  
extern MissionItem missionItems[MAX_MISSION_ITEMS];
extern size_t missionItemCount;
// Initializes WiFi and web server endpoints.
void setupWebServer();

// Handles client requests.
void handleWebServerClient();
void sendMessage(mavlink_message_t &msg);
void clearMission();
#endif  // WEBSERVERHANDLER_H
