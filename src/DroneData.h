#ifndef DRONEDATA_H
#define DRONEDATA_H

#include <Arduino.h>

// Structure to hold drone data.
struct DroneData {
  float speed;          // Ground speed (m/s)
  float altitude;       // Relative altitude (m)
  float heading;        // Heading (degrees)
  float pitch;          // Pitch (degrees)
  float roll;           // Roll (degrees)
  int rssi;             // RSSI (0–100)
  bool connected;       // MAVLink connection status
  bool armed;           // Armed status
  String flightMode;    // Flight mode (e.g., "Manual", "Auto")
  float batteryVoltage; // Battery voltage (V)
  float latitude;       // Gps latitude 
  float longitude;      // Gps longitude
};

extern DroneData droneData;

// Array to store the last three STATUSTEXT messages.
extern String lastStatusText[3];

#endif  // DRONEDATA_H
