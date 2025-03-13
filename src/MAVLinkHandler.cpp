#include "MAVLinkHandler.h"
#include "WebServerHandler.h"
#include "DroneData.h"
#include "Utilities.h"
#include <math.h>
#include "ardupilotmega/mavlink.h"

//#define MAVLINK_MAX_PACKET_LEN 263

// Global MAVLink buffer.
uint8_t mavlinkBuffer[MAVLINK_MAX_PACKET_LEN];
// Last time a MAVLink message was processed.
extern unsigned long lastMavlinkTime;
unsigned long lastMavlinkTime = 0;

void sendMissionItem(uint16_t seq, const MissionItem &item) {
  if (seq >= missionItemCount) return; // Out-of-range check

  mavlink_message_t msg;
  uint16_t command = item.cmd;
  uint8_t autocontinue = 1;
  float param1 = item.param1;                // For TAKEOFF, param1 may represent the minimum pitch.
  float param2 = item.param2;                // Acceptance radius.
  float param3 = item.param3;                // For waypoints, this could represent fly-through (set to 1 as default).
  float param4 = item.param4;              // Set yaw to NAN to let the drone decide the heading.
  float current = item.param5;
  float lat = item.latitude;
  float lon = item.longitude;
  float alt = item.altitude;
  
  mavlink_msg_mission_item_pack(
    MAVLINK_SYSTEM_ID,
    MAVLINK_COMPONENT_ID,
    &msg,
    TARGET_SYSTEM,
    TARGET_COMPONENT,
    seq,
    MAV_FRAME_GLOBAL_RELATIVE_ALT,
    command,
    current,   // current flag.
    autocontinue,
    param1,
    param2,
    param3,
    param4,
    lat,
    lon,
    alt,
    0   // mission_type (0 for regular mission).
  );
  sendMessage(msg);
}





void processMAVLink() {
  while (Serial2.available() > 0) {
    uint8_t c = Serial2.read();
    static mavlink_message_t msg;
    static mavlink_status_t mavStatus;
    if (mavlink_parse_char(MAVLINK_COMM_0, c, &msg, &mavStatus)) {
      // Process messages only from system 1, component 1.
      if (msg.sysid != 1 || msg.compid != 1) continue;


      switch (msg.msgid) {
        case MAVLINK_MSG_ID_ATTITUDE: {
          mavlink_attitude_t att;
          mavlink_msg_attitude_decode(&msg, &att);
          droneData.roll  = att.roll * 57.2958;
          droneData.pitch = att.pitch * 57.2958;
          float heading = att.yaw * 57.2958;
          droneData.heading = (heading < 0) ? heading + 360 : heading;
          break;
        }
        case MAVLINK_MSG_ID_RC_CHANNELS: {
          mavlink_rc_channels_t radioStatus;
          mavlink_msg_rc_channels_decode(&msg, &radioStatus);
          droneData.rssi = radioStatus.rssi;
          lastMavlinkTime = millis();
          droneData.connected = true;
          break;
        }
        case MAVLINK_MSG_ID_GLOBAL_POSITION_INT: {
          mavlink_global_position_int_t globalPos;
          mavlink_msg_global_position_int_decode(&msg, &globalPos);
          droneData.latitude = globalPos.lat / 10000000.0;
          droneData.longitude = globalPos.lon / 10000000.0;
          droneData.altitude = globalPos.relative_alt / 1000.0;
          float vx = globalPos.vx / 100.0;
          float vy = globalPos.vy / 100.0;
          droneData.speed = sqrt(vx * vx + vy * vy);
          break;
        }
        case MAVLINK_MSG_ID_SYS_STATUS: {
          mavlink_sys_status_t sysStatus;
          mavlink_msg_sys_status_decode(&msg, &sysStatus);
          if (sysStatus.voltage_battery > 0 && sysStatus.voltage_battery < UINT16_MAX)
            droneData.batteryVoltage = sysStatus.voltage_battery / 1000.0;
          else
            droneData.batteryVoltage = 0;
          break;
        }
        case MAVLINK_MSG_ID_HEARTBEAT: {
          mavlink_heartbeat_t hb;
          mavlink_msg_heartbeat_decode(&msg, &hb);
          droneData.armed = (hb.base_mode & MAV_MODE_FLAG_SAFETY_ARMED) != 0;
          if (hb.autopilot == MAV_AUTOPILOT_ARDUPILOTMEGA)
            droneData.flightMode = getAPFlightMode(hb.custom_mode);
          else if (hb.autopilot == MAV_AUTOPILOT_PX4)
            droneData.flightMode = getPX4FlightMode(hb.custom_mode);
          else
            droneData.flightMode = "UNKNOWN";
          break;
        }
        case MAVLINK_MSG_ID_STATUSTEXT: {
          mavlink_statustext_t st;
          mavlink_msg_statustext_decode(&msg, &st);
          char textBuffer[51];
          memcpy(textBuffer, st.text, 50);
          textBuffer[50] = '\0';
          String newText = String(textBuffer);
          static unsigned long lastUpdateTime = 0;
          unsigned long now = millis();
          if ((now - lastUpdateTime > 500) || (newText != lastStatusText[0])) {
            lastStatusText[2] = lastStatusText[1];
            lastStatusText[1] = lastStatusText[0];
            lastStatusText[0] = newText;
            lastUpdateTime = now;
          }
          break;
        }
        case MAVLINK_MSG_ID_MISSION_REQUEST: {
          mavlink_mission_request_t req;
          mavlink_msg_mission_request_decode(&msg, &req);
          uint16_t seq = req.seq;  // Update global sequence number.
          if (seq < missionItemCount) {
            sendMissionItem(seq, missionItems[seq]);
            Serial.printf("Sent mission item %d\n", seq);
          } else {
            ESP_LOGE("AutoPilot", "Requested mission item %d is out-of-range (max %d)", seq,  missionItemCount);
          }
          break;
        }



        default:

          break;
      }
    }
  }
}

// Callback function for heartbeat timer.
void sendHeartbeat(void* arg) {
  mavlink_message_t msg;
  mavlink_msg_heartbeat_pack(MAVLINK_SYSTEM_ID, MAVLINK_COMPONENT_ID, &msg,
                             MAV_TYPE_GCS, MAV_AUTOPILOT_INVALID,
                             MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, 0, MAV_STATE_ACTIVE);
   sendMessage(msg);
}

// Sets up a periodic timer for sending heartbeat messages.
void setupMAVLinkTimers() {
  esp_timer_handle_t heartbeat_timer;
  const esp_timer_create_args_t heartbeat_timer_args = {
    .callback = &sendHeartbeat,
    .name = "heartbeat_sender"
  };
  esp_timer_create(&heartbeat_timer_args, &heartbeat_timer);
  esp_timer_start_periodic(heartbeat_timer, 1000000);  // 1 second period
}


