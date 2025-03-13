#ifndef UTILITIES_H
#define UTILITIES_H

#include <Arduino.h>
#include <stdint.h>

// Escapes JSON special characters in the given string.
String escapeJson(const String &input);

// Maps ArduPilot custom_mode to a flight mode string.
String getAPFlightMode(uint32_t custom_mode);

// Maps PX4 custom_mode to a flight mode string.
String getPX4FlightMode(uint32_t custom_mode);

#endif  // UTILITIES_H
