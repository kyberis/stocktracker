#include "power_mgr.h"

#ifndef SIMULATOR

#include <WiFi.h>
#include <lvgl.h>
#include "rtc_data.h"
#include "battery.h"

static LilyGo_Class *s_dev       = nullptr;
static PowerMode     s_mode      = PWR_ACTIVE;
static uint32_t      s_mode_ts   = 0;     // millis when current mode started
static uint32_t      s_epoch     = 0;     // last known unix time
static uint32_t      s_epoch_ms  = 0;     // millis() when epoch was set

static uint32_t s_active_to_glance_ms = 60000;   // 60s idle → Glance
static uint32_t s_glance_to_sleep_ms = 600000;   // 10min in Glance → Sleep

// Deep sleep timer intervals (microseconds)
static constexpr uint64_t SLEEP_TIMER_MARKET_US   = 2ULL  * 60 * 1000000; // 2 min
static constexpr uint64_t SLEEP_TIMER_OFFHOURS_US = 30ULL * 60 * 1000000; // 30 min
static constexpr uint64_t SLEEP_TIMER_NIGHT_US    = 0;                    // no timer (touch only)

// ── Market hours helpers ─────────────────────────────────────────────

static uint32_t current_epoch() {
    if (s_epoch == 0) return 0;
    return s_epoch + (millis() - s_epoch_ms) / 1000;
}

enum MarketPeriod : uint8_t { MKT_TRADING, MKT_OFFHOURS, MKT_NIGHT };

static MarketPeriod market_period() {
    uint32_t epoch = current_epoch();
    if (epoch == 0) return MKT_TRADING; // unknown → assume trading (safest)

    // UTC-based day-of-week (0=Thu epoch, but we need 0=Sun..6=Sat)
    uint32_t days = epoch / 86400;
    uint8_t dow = (days + 4) % 7; // 0=Sun, 1=Mon, ..., 6=Sat
    if (dow == 0 || dow == 6) return MKT_OFFHOURS; // weekends

    // CET = UTC+1 (simplified; ignores summer time)
    uint32_t sod = (epoch + 3600) % 86400; // seconds of day in CET
    uint8_t hour = sod / 3600;

    if (hour >= 23 || hour < 7)  return MKT_NIGHT;
    if (hour >= 9 && hour < 18)  return MKT_TRADING;
    return MKT_OFFHOURS;
}

static uint64_t sleep_timer_us() {
    switch (market_period()) {
    case MKT_TRADING:  return SLEEP_TIMER_MARKET_US;
    case MKT_OFFHOURS: return SLEEP_TIMER_OFFHOURS_US;
    case MKT_NIGHT:    return SLEEP_TIMER_NIGHT_US;
    }
    return SLEEP_TIMER_OFFHOURS_US;
}

// ── State transitions ────────────────────────────────────────────────

static void enter_active() {
    s_mode    = PWR_ACTIVE;
    s_mode_ts = millis();

    setCpuFrequencyMhz(240);
    s_dev->setBrightness(255);
    s_dev->disp_wakeup();

    Serial.println("[PWR] → ACTIVE");
}

static void enter_glance() {
    s_mode    = PWR_GLANCE;
    s_mode_ts = millis();

    s_dev->setBrightness(25);
    setCpuFrequencyMhz(80);

    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    Serial.println("[PWR] → GLANCE");
}

static void enter_sleep() {
    s_mode = PWR_SLEEPING;
    Serial.println("[PWR] → SLEEPING");

    rtc_cache.had_dashboard = 1;
    rtc_cache.boot_count++;

    // Save WiFi reconnect data
    if (WiFi.status() == WL_CONNECTED) {
        rtc_save_wifi(WiFi.BSSID(), WiFi.channel());
    }

    // Display sleep
    s_dev->disp_sleep();
    s_dev->setBrightness(0);

    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // Configure wakeup sources
    esp_sleep_enable_ext0_wakeup(TOUCH_INT_GPIO, 0); // LOW-active touch IRQ

    uint64_t timer = sleep_timer_us();
    if (timer > 0) {
        esp_sleep_enable_timer_wakeup(timer);
        Serial.printf("[PWR] Timer wake in %llu s\n", timer / 1000000);
    }

    Serial.flush();
    esp_deep_sleep_start();
}

// ── Public API ───────────────────────────────────────────────────────

void power_mgr_init(LilyGo_Class &dev) {
    s_dev     = &dev;
    s_mode    = PWR_ACTIVE;
    s_mode_ts = millis();
}

void power_mgr_tick() {
    if (!battery_on_battery()) {
        // USB-powered: stay Active, full brightness based on idle
        if (s_mode != PWR_ACTIVE) enter_active();

        uint32_t idle = lv_disp_get_inactive_time(nullptr);
        uint8_t brightness;
        if (idle < 60000)       brightness = 255;
        else if (idle < 300000) brightness = 128;
        else                    brightness = 25;

        static uint8_t s_last_br = 255;
        if (brightness != s_last_br) {
            s_last_br = brightness;
            s_dev->setBrightness(brightness);
        }
        return;
    }

    // ── Battery-powered state machine ────────────────────────────────
    uint32_t idle = lv_disp_get_inactive_time(nullptr);

    switch (s_mode) {
    case PWR_ACTIVE:
        if (idle >= s_active_to_glance_ms) {
            enter_glance();
        }
        break;

    case PWR_GLANCE:
        if (idle < 500) {
            enter_active();
        } else if (millis() - s_mode_ts >= s_glance_to_sleep_ms) {
            enter_sleep();
        }
        break;

    case PWR_SLEEPING:
        break;
    }
}

PowerMode power_mgr_mode() {
    return s_mode;
}

void power_mgr_wake() {
    if (s_mode != PWR_ACTIVE) {
        enter_active();
    }
}

void power_mgr_request_sleep() {
    enter_sleep();
}

void power_mgr_set_epoch(uint32_t unix_epoch) {
    s_epoch    = unix_epoch;
    s_epoch_ms = millis();

    // Also persist to RTC for timer-wake path
    rtc_cache.last_fetch_epoch = unix_epoch;
}

uint32_t power_mgr_refresh_interval_ms() {
    if (!battery_on_battery()) return 0; // use server-defined interval

    switch (market_period()) {
    case MKT_TRADING:  return 120000;  // 2 min
    case MKT_OFFHOURS: return 1800000; // 30 min
    case MKT_NIGHT:    return 0;       // no refresh (sleeping)
    }
    return 300000;
}

void power_mgr_set_timeouts(uint32_t idle_dim_ms, uint32_t auto_sleep_ms) {
    s_active_to_glance_ms = idle_dim_ms;
    s_glance_to_sleep_ms  = auto_sleep_ms;
    Serial.printf("[PWR] Timeouts: dim=%lu ms, sleep=%lu ms\n",
                  (unsigned long)idle_dim_ms, (unsigned long)auto_sleep_ms);
}

#endif
