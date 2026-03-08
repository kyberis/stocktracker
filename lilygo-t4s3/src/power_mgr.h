#pragma once

#ifndef SIMULATOR

#include <LilyGo_AMOLED.h>

enum PowerMode : uint8_t {
    PWR_ACTIVE,
    PWR_GLANCE,
    PWR_SLEEPING,
};

void      power_mgr_init(LilyGo_Class &dev);
void      power_mgr_tick();
PowerMode power_mgr_mode();
void      power_mgr_wake();
void      power_mgr_request_sleep();

// Market hours (call after NTP/server time is known)
void      power_mgr_set_epoch(uint32_t unix_epoch);
uint32_t  power_mgr_refresh_interval_ms();

// Configurable timeouts (called from main after loading NVS config)
void      power_mgr_set_timeouts(uint32_t idle_dim_ms, uint32_t auto_sleep_ms);

#endif
