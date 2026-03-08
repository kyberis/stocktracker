#pragma once

#ifndef SIMULATOR

#include <LilyGo_AMOLED.h>

void  battery_init(LilyGo_Class &dev);
float battery_voltage();
int   battery_percent();
bool  battery_charging();
bool  battery_on_battery();

#endif
