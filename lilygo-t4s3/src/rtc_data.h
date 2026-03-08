#pragma once

#ifndef SIMULATOR

#include <Arduino.h>
#include <esp_sleep.h>
#include "stocks.h"

// Touch interrupt GPIO on the T4-S3 (CST226SE)
constexpr gpio_num_t TOUCH_INT_GPIO = GPIO_NUM_8;

struct RtcCache {
    uint32_t      magic;           // 0xCAFE1EAF when valid
    PortfolioData portfolio;       // ~2.8 KB cached portfolio
    uint8_t       wifi_bssid[6];
    uint8_t       wifi_channel;
    uint32_t      last_fetch_epoch;
    uint16_t      boot_count;
    uint8_t       had_dashboard;   // 1 if dashboard was active before sleep
};

constexpr uint32_t RTC_MAGIC = 0xCAFE1EAF;

extern RTC_DATA_ATTR RtcCache rtc_cache;

inline bool rtc_valid() { return rtc_cache.magic == RTC_MAGIC; }

inline void rtc_invalidate() { rtc_cache.magic = 0; }

inline void rtc_save_wifi(const uint8_t *bssid, uint8_t channel) {
    memcpy(rtc_cache.wifi_bssid, bssid, 6);
    rtc_cache.wifi_channel = channel;
}

inline void rtc_save_portfolio(const PortfolioData &p, uint32_t epoch) {
    rtc_cache.portfolio = p;
    rtc_cache.last_fetch_epoch = epoch;
    rtc_cache.magic = RTC_MAGIC;
}

inline bool is_deep_sleep_wake() {
    return esp_sleep_get_wakeup_cause() != ESP_SLEEP_WAKEUP_UNDEFINED;
}

inline bool is_timer_wake() {
    return esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_TIMER;
}

inline bool is_touch_wake() {
    return esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0;
}

#endif
