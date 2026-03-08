#include "battery.h"

#ifndef SIMULATOR

static LilyGo_Class *s_dev = nullptr;

void battery_init(LilyGo_Class &dev) {
    s_dev = &dev;
    Serial.println("[BAT] Battery monitor ready.");
}

float battery_voltage() {
    if (!s_dev) return 0.0f;
    return s_dev->getBattVoltage() / 1000.0f;
}

int battery_percent() {
    float v = battery_voltage();
    if (v >= 4.15f) return 100;
    if (v <= 3.20f) return 0;
    // Piecewise linear approximation for LiPo discharge curve
    if (v >= 3.95f) return 80  + (int)((v - 3.95f) / 0.20f * 20);
    if (v >= 3.80f) return 50  + (int)((v - 3.80f) / 0.15f * 30);
    if (v >= 3.60f) return 20  + (int)((v - 3.60f) / 0.20f * 30);
    return (int)((v - 3.20f) / 0.40f * 20);
}

bool battery_charging() {
    return s_dev ? s_dev->isCharging() : false;
}

bool battery_on_battery() {
    return s_dev ? !s_dev->isVbusIn() : false;
}

#endif
