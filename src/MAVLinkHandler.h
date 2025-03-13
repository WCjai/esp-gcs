#ifndef MAVLINKHANDLER_H
#define MAVLINKHANDLER_H

#include <Arduino.h>


// Function declarations for MAVLink handling.
void processMAVLink();
void setupMAVLinkTimers();

void sendMissionAck(bool missionSuccessful);
#endif  // MAVLINKHANDLER_H
