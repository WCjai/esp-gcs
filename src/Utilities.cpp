#include "Utilities.h"

String escapeJson(const String &input) {
  String output = "";
  for (size_t i = 0; i < input.length(); i++) {
    char c = input.charAt(i);
    switch (c) {
      case '\"': output += "\\\""; break;
      case '\\': output += "\\\\"; break;
      case '\b': output += "\\b";  break;
      case '\f': output += "\\f";  break;
      case '\n': output += "\\n";  break;
      case '\r': output += "\\r";  break;
      case '\t': output += "\\t";  break;
      default:
        if (c < 0x20) {
          output += " ";
        } else {
          output += c;
        }
    }
  }
  return output;
}



String getAPFlightMode(uint32_t custom_mode) {
  switch(custom_mode) {
    case 0:  return "STABILIZE";
    case 1:  return "ACRO";
    case 2:  return "ALT HOLD";
    case 3:  return "AUTO";
    case 4:  return "GUIDED";
    case 5:  return "LOITER";  
    case 6:  return "RTL";
    case 7:  return "CIRCLE";
    case 9:  return "LAND";
    case 11: return "DRIFT";
    case 13: return "SPORT";
    case 14: return "FLIP";
    case 15: return "AUTOTUNE";
    case 16: return "POSHOLD";
    case 17: return "BRAKE";
    default: return "UNKNOWN";
  }
}

String getPX4FlightMode(uint32_t custom_mode) {

  switch(custom_mode) {
    case 65536:  return "Manual";
    case 131072:  return "Altitude";
    case 196608:  return "Position";
    case 458752:  return "Stabilized";
    case 50593792:  return "Hold";
    case 67371008:  return "Mission";
    case 100925440:  return "Land";
    case 393216:  return "Offboard";
    case 84148224:  return "RTL";
    default: return "UNKNOWN";
  }
}
