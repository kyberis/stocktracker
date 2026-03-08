#include <Arduino.h>
#include <WiFi.h>
#include <LilyGo_AMOLED.h>
#include <LV_Helper.h>
#include "config.h"
#include "stocks.h"
#include "api_client.h"
#include "ui.h"
#include "ota_updater.h"
#include "wifi_provision.h"
#include "net_task.h"
#include "battery.h"
#include "power_mgr.h"
#include "rtc_data.h"

LilyGo_Class amoled;

static PortfolioData portfolio;
static DeviceConfig device_cfg;
static SparklineData sparkline_buf;
static char token_buf[TOKEN_MAX_LEN];

static uint32_t refresh_interval_ms = 60000;
static uint32_t last_refresh = 0;
static uint32_t last_ota_check = 0;
static const uint32_t OTA_CHECK_INTERVAL_MS = 6UL * 3600UL * 1000UL;
static bool dashboard_active = false;

static int8_t   s_burn_x        = 0;
static int8_t   s_burn_y        = 0;
static uint32_t s_last_shift    = 0;
static uint32_t s_last_heap_log = 0;
static uint32_t s_last_batt_ui  = 0;

static void on_token_submit(const char *entered_token);

static void handle_passkey_revoked() {
    Serial.println("Passkey revoked — returning to setup.");
    config_clear_token();
    dashboard_active = false;
    ui_show_token_entry(on_token_submit);
}

static void fetch_and_show() {
    ui_set_status("Syncing...");
    int status = api_fetch_portfolio(portfolio);
    last_refresh = millis();
    ui_update_countdown(0);
    if (status == 200) {
        ui_update_portfolio(portfolio);
        ui_set_live_state(true);
        ota_mark_valid();
        rtc_save_portfolio(portfolio, 0);
    } else if (status == 401) {
        handle_passkey_revoked();
    } else {
        ui_set_status("Sync failed - retrying...");
        ui_set_live_state(false);
    }
}

static void on_manual_refresh() {
    Serial.println("Manual refresh requested.");
    if (!net_busy()) {
        ui_set_status("Syncing...");
        net_request(NET_PORTFOLIO);
        last_refresh = millis();
        ui_update_countdown(0);
    }
}

static void load_device_config() {
    if (api_fetch_device_config(device_cfg)) {
        refresh_interval_ms = (uint32_t)device_cfg.refreshIntervalSec * 1000;
        ui_set_ai_visible(device_cfg.aiSummaryEnabled);
        ui_settings_set_plan(device_cfg.plan);
        Serial.printf("Config: plan=%s ai=%d refresh=%ds template=%s\n",
                      device_cfg.plan, device_cfg.aiSummaryEnabled,
                      device_cfg.refreshIntervalSec, device_cfg.templateId);
    }
}

static void on_ai_request() {
    if (!device_cfg.aiSummaryEnabled) {
        ui_update_ai_summary("Pro subscription required.");
        return;
    }
    ui_update_ai_summary("Analyzing your portfolio...");
    net_request(NET_AI_SUMMARY);
}

static void on_view_all() {
    ui_update_holdings_list(portfolio);
    ui_show_holdings_list();
}

static void on_holding_tap(int idx) {
    ui_show_stock_detail(idx);
}

static void on_sparkline_request(const char *ticker) {
    Serial.printf("Fetching sparkline for %s...\n", ticker);
    net_request(NET_SPARKLINE, ticker);
}

static void on_brightness_change(uint8_t val) {
    config_save_brightness(val);
    amoled.setBrightness(val);
    Serial.printf("[SET] Brightness: %d\n", val);
}

static void on_timeout_change(uint16_t idle_dim_sec, uint16_t auto_sleep_sec) {
    config_save_idle_dim_sec(idle_dim_sec);
    config_save_auto_sleep_sec(auto_sleep_sec);
    power_mgr_set_timeouts((uint32_t)idle_dim_sec * 1000,
                           (uint32_t)auto_sleep_sec * 1000);
}

static void on_theme_change(const char *template_id) {
    ui_apply_template(template_id);
    Serial.printf("[SET] Theme: %s (takes effect on reboot)\n", template_id);
}

static void on_unlink() {
    Serial.println("[SET] Unlinking device — clearing credentials and rebooting.");
    config_clear_token();
    config_clear_wifi();
    ESP.restart();
}

static void on_retry() {
    ui_show_token_entry(on_token_submit);
}

static void on_token_submit(const char *entered_token) {
    ui_show_loading("Validating passkey...");

    config_save_token(entered_token);
    api_init(API_BASE_URL, entered_token);

    net_request(NET_VALIDATE_TOKEN);
}

// ── Fast WiFi reconnect (uses saved BSSID + channel from RTC) ────────

static bool wifi_fast_connect(const char *ssid, const char *pass) {
    if (!rtc_valid() || rtc_cache.wifi_channel == 0) return false;

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, pass, rtc_cache.wifi_channel, rtc_cache.wifi_bssid, true);

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 3000) {
        delay(10);
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("Fast WiFi reconnect in %lu ms\n", millis() - start);
        return true;
    }
    return false;
}

static bool wifi_normal_connect(const char *ssid, const char *pass) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, pass);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        lv_task_handler();
        attempts++;
    }
    return WiFi.status() == WL_CONNECTED;
}

static void save_wifi_state() {
    if (WiFi.status() == WL_CONNECTED) {
        rtc_save_wifi(WiFi.BSSID(), WiFi.channel());
    }
}

// ── Headless timer-wake fetch (no display, no UI) ────────────────────

static void headless_timer_wake() {
    Serial.println("[WAKE] Timer wake — headless fetch.");

    char ssid[64], pass[64];
    config_load_wifi_ssid(ssid, sizeof(ssid));
    config_load_wifi_pass(pass, sizeof(pass));

    bool connected = wifi_fast_connect(ssid, pass);
    if (!connected) {
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid, pass);
        uint32_t start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
            delay(50);
        }
        connected = (WiFi.status() == WL_CONNECTED);
    }

    if (connected) {
        save_wifi_state();

        config_load_token(token_buf, sizeof(token_buf));
        api_init(API_BASE_URL, token_buf);

        PortfolioData headless_portfolio;
        portfolio_clear(headless_portfolio);
        int status = api_fetch_portfolio(headless_portfolio);

        if (status == 200) {
            uint32_t epoch = rtc_cache.last_fetch_epoch;
            rtc_save_portfolio(headless_portfolio, epoch);
            Serial.println("[WAKE] Portfolio cached to RTC.");
        } else {
            Serial.printf("[WAKE] Fetch failed: %d\n", status);
        }
    } else {
        Serial.println("[WAKE] WiFi failed, skipping fetch.");
    }

    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // Go back to deep sleep with same wakeup config
    esp_sleep_enable_ext0_wakeup(TOUCH_INT_GPIO, 0);

    // Approximate epoch advance for market hours calculation
    if (rtc_cache.last_fetch_epoch > 0) {
        rtc_cache.last_fetch_epoch += 120; // assume ~2min passed
    }
    rtc_cache.boot_count++;

    Serial.println("[WAKE] Returning to deep sleep.");
    Serial.flush();

    // Re-use the same timer interval approach (simplified — use 2-min default)
    esp_sleep_enable_timer_wakeup(2ULL * 60 * 1000000);
    esp_deep_sleep_start();
}

// ── Touch wake: full boot with cached data ───────────────────────────

static void touch_wake_setup() {
    Serial.println("[WAKE] Touch wake — full boot.");

    beginLvglHelper(amoled);
    config_init();

    char fw_ver[24];
    config_load_fw_version(fw_ver, sizeof(fw_ver));
    api_set_firmware_version(fw_ver);

    ui_init();
    ui_set_ai_callback(on_ai_request);
    ui_set_retry_callback(on_retry);
    ui_set_refresh_callback(on_manual_refresh);
    ui_set_view_all_callback(on_view_all);
    ui_set_holding_tap_callback(on_holding_tap);
    ui_set_sparkline_callback(on_sparkline_request);
    ui_set_settings_callbacks(on_brightness_change, on_timeout_change,
                              on_theme_change, on_unlink);

    // Restore saved settings
    uint8_t saved_bright = config_load_brightness();
    amoled.setBrightness(saved_bright);
    ui_settings_set_brightness(saved_bright);

    uint16_t saved_dim = config_load_idle_dim_sec();
    uint16_t saved_sleep = config_load_auto_sleep_sec();
    ui_settings_set_timeouts(saved_dim, saved_sleep);

    battery_init(amoled);
    power_mgr_init(amoled);
    power_mgr_set_timeouts((uint32_t)saved_dim * 1000, (uint32_t)saved_sleep * 1000);

    if (rtc_valid() && rtc_cache.had_dashboard) {
        // Show cached data instantly
        portfolio = rtc_cache.portfolio;
        dashboard_active = true;

        config_load_token(token_buf, sizeof(token_buf));
        api_init(API_BASE_URL, token_buf);

        ui_show_dashboard();
        ui_update_portfolio(portfolio);
        ui_set_status("Waking up...");
        ui_set_live_state(false);
        lv_task_handler();

        // Connect WiFi and refresh in background
        char ssid[64], pass[64];
        config_load_wifi_ssid(ssid, sizeof(ssid));
        config_load_wifi_pass(pass, sizeof(pass));

        bool connected = wifi_fast_connect(ssid, pass);
        if (!connected) connected = wifi_normal_connect(ssid, pass);

        if (connected) {
            save_wifi_state();
            WiFi.setSleep(true);

            net_task_init(&portfolio, &device_cfg, &sparkline_buf);
            net_request(NET_PORTFOLIO);
            last_refresh = millis();
            ui_update_countdown(0);
            last_ota_check = millis();
        } else {
            ui_set_status("WiFi failed — showing cached data");
        }
    } else {
        // No cached data — full cold boot path
        ui_show_loading("Connecting to WiFi...");
        lv_task_handler();

        char ssid[64], pass[64];
        config_load_wifi_ssid(ssid, sizeof(ssid));
        config_load_wifi_pass(pass, sizeof(pass));

        bool connected = wifi_fast_connect(ssid, pass);
        if (!connected) connected = wifi_normal_connect(ssid, pass);

        if (!connected) {
            ui_show_error("WiFi connection failed.\nHold to reconfigure.");
            return;
        }

        save_wifi_state();
        WiFi.setSleep(true);

        if (config_has_token()) {
            config_load_token(token_buf, sizeof(token_buf));
            api_init(API_BASE_URL, token_buf);
            ui_show_loading("Loading portfolio...");
            lv_task_handler();

            if (api_validate_token()) {
                dashboard_active = true;
                load_device_config();
                ui_show_dashboard();
                fetch_and_show();
            } else {
                config_clear_token();
                ui_show_token_entry(on_token_submit);
            }
        } else {
            ui_show_token_entry(on_token_submit);
        }

        net_task_init(&portfolio, &device_cfg, &sparkline_buf);
        last_ota_check = millis();
    }

    Serial.printf("[MEM] Heap: %u free, %u largest | PSRAM: %u free\n",
                  ESP.getFreeHeap(), ESP.getMaxAllocHeap(), ESP.getFreePsram());
    Serial.println("Ready.");
}

// ═════════════════════════════════════════════════════════════════════

void setup() {
    Serial.begin(115200);
    Serial.println("trefolio Leaf booting...");

    if (!amoled.begin()) {
        Serial.println("AMOLED init failed!");
        while (1) delay(1000);
    }

    Serial.printf("Display: %dx%d  Board: %s\n",
                  amoled.width(), amoled.height(), amoled.getName());

    // ── Deep sleep wake: timer or touch ──────────────────────────────
    if (is_deep_sleep_wake()) {
        rtc_cache.boot_count++;
        Serial.printf("[WAKE] Boot #%u, cause: %s\n",
                      rtc_cache.boot_count,
                      is_timer_wake() ? "TIMER" : "TOUCH");

        config_init();

        if (is_timer_wake() && !config_has_token()) {
            // No token → can't fetch, just sleep again
            esp_sleep_enable_ext0_wakeup(TOUCH_INT_GPIO, 0);
            esp_sleep_enable_timer_wakeup(30ULL * 60 * 1000000);
            esp_deep_sleep_start();
        }

        if (is_timer_wake()) {
            headless_timer_wake();
            return; // never reached (deep sleep restarts)
        }

        // Touch wake → full UI path
        touch_wake_setup();
        return;
    }

    // ── Cold boot (first power-on or reset) ──────────────────────────
    rtc_invalidate();
    rtc_cache.boot_count = 0;

    beginLvglHelper(amoled);
    config_init();

    char fw_ver[24];
    config_load_fw_version(fw_ver, sizeof(fw_ver));
    api_set_firmware_version(fw_ver);

    ui_init();
    ui_set_ai_callback(on_ai_request);
    ui_set_retry_callback(on_retry);
    ui_set_refresh_callback(on_manual_refresh);
    ui_set_view_all_callback(on_view_all);
    ui_set_holding_tap_callback(on_holding_tap);
    ui_set_sparkline_callback(on_sparkline_request);
    ui_set_settings_callbacks(on_brightness_change, on_timeout_change,
                              on_theme_change, on_unlink);

    // Restore saved settings
    uint8_t saved_bright = config_load_brightness();
    amoled.setBrightness(saved_bright);
    ui_settings_set_brightness(saved_bright);

    uint16_t saved_dim = config_load_idle_dim_sec();
    uint16_t saved_sleep = config_load_auto_sleep_sec();
    ui_settings_set_timeouts(saved_dim, saved_sleep);

    battery_init(amoled);
    power_mgr_init(amoled);
    power_mgr_set_timeouts((uint32_t)saved_dim * 1000, (uint32_t)saved_sleep * 1000);

    if (!wifi_provision_has_credentials()) {
        ui_show_loading("Setup mode...\nConnect to trefolio AP");
        lv_task_handler();
        wifi_provision_start();
        return;
    }

    ui_show_loading("Connecting to WiFi...");
    lv_task_handler();

    char wifi_ssid[64], wifi_pass[64];
    config_load_wifi_ssid(wifi_ssid, sizeof(wifi_ssid));
    config_load_wifi_pass(wifi_pass, sizeof(wifi_pass));

    if (!wifi_normal_connect(wifi_ssid, wifi_pass)) {
        Serial.println("WiFi connection failed.");
        ui_show_error("WiFi connection failed.\nHold to reconfigure.");
        return;
    }

    Serial.printf("WiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
    save_wifi_state();

    WiFi.setSleep(true);
    Serial.println("WiFi modem sleep enabled.");

    // OTA check at boot (synchronous — runs before net_task starts)
    ui_show_loading("Checking for updates...");
    lv_task_handler();
    ota_check_and_update();
    last_ota_check = millis();

    // Boot-time validation and initial load (synchronous — net_task not started yet)
    if (config_has_token()) {
        config_load_token(token_buf, sizeof(token_buf));
        api_init(API_BASE_URL, token_buf);
        ui_show_loading("Loading portfolio...");
        lv_task_handler();

        if (api_validate_token()) {
            dashboard_active = true;
            load_device_config();
            ui_show_dashboard();
            fetch_and_show();
        } else {
            Serial.println("Stored token invalid, clearing.");
            config_clear_token();
            ui_show_token_entry(on_token_submit);
        }
    } else {
        ui_show_token_entry(on_token_submit);
    }

    // Start async network task (all subsequent HTTP goes through core 0)
    net_task_init(&portfolio, &device_cfg, &sparkline_buf);

    Serial.printf("[MEM] Heap: %u free, %u largest | PSRAM: %u free\n",
                  ESP.getFreeHeap(), ESP.getMaxAllocHeap(), ESP.getFreePsram());
    Serial.println("Ready.");
}

void loop() {
    // ── Drain async network results ─────────────────────────────────
    NetResult result;
    while (net_poll(result)) {
        switch (result.type) {
        case NET_PORTFOLIO:
            if (result.status == 200) {
                ui_update_portfolio(portfolio);
                ui_set_live_state(true);
                ota_mark_valid();
                rtc_save_portfolio(portfolio, 0);
            } else if (result.status == 401) {
                handle_passkey_revoked();
            } else {
                ui_set_status("Sync failed - retrying...");
                ui_set_live_state(false);
            }
            break;

        case NET_AI_SUMMARY:
            if (result.success) {
                ui_update_ai_summary(portfolio.aiSummary);
            } else if (portfolio.aiSummary[0] != '\0') {
                ui_update_ai_summary(portfolio.aiSummary);
            } else {
                ui_update_ai_summary("Unable to load AI summary.\nPlease try again later.");
            }
            ui_update_ai_usage(portfolio.aiUsed, portfolio.aiLimit);
            break;

        case NET_SPARKLINE:
            if (result.success) {
                ui_update_sparkline(sparkline_buf);
                Serial.printf("Sparkline loaded: %d points\n", sparkline_buf.count);
            } else {
                SparklineData empty;
                sparkline_clear(empty);
                ui_update_sparkline(empty);
                Serial.println("Sparkline fetch failed.");
            }
            break;

        case NET_VALIDATE_TOKEN:
            if (result.success) {
                Serial.println("Token valid, loading config...");
                net_request(NET_DEVICE_CONFIG);
            } else {
                config_clear_token();
                ui_show_error("Invalid passkey. Check and try again.");
            }
            break;

        case NET_DEVICE_CONFIG:
            if (result.success) {
                refresh_interval_ms = (uint32_t)device_cfg.refreshIntervalSec * 1000;
                ui_set_ai_visible(device_cfg.aiSummaryEnabled);
                ui_settings_set_plan(device_cfg.plan);
                Serial.printf("Config: plan=%s ai=%d refresh=%ds\n",
                              device_cfg.plan, device_cfg.aiSummaryEnabled,
                              device_cfg.refreshIntervalSec);
            }
            dashboard_active = true;
            ui_show_dashboard();
            ui_set_status("Syncing...");
            net_request(NET_PORTFOLIO);
            last_refresh = millis();
            ui_update_countdown(0);
            break;

        default:
            break;
        }
    }

    // ── Dashboard active logic ──────────────────────────────────────
    if (dashboard_active) {
        uint32_t now = millis();

        // Determine effective refresh interval (battery-aware or server-defined)
        uint32_t eff_refresh = refresh_interval_ms;
        uint32_t batt_refresh = power_mgr_refresh_interval_ms();
        if (batt_refresh > 0 && batt_refresh > eff_refresh) {
            eff_refresh = batt_refresh;
        }

        // Periodic data refresh (async)
        if (eff_refresh > 0 && now - last_refresh >= eff_refresh && !net_busy()
            && power_mgr_mode() == PWR_ACTIVE) {
            // Only fetch when Active and WiFi is available
            if (WiFi.status() == WL_CONNECTED) {
                ui_set_status("Syncing...");
                net_request(NET_PORTFOLIO);
                last_refresh = now;
                ui_update_countdown(0);
            }
        } else if (eff_refresh > 0) {
            int elapsed = (int)((now - last_refresh) / 1000);
            ui_update_countdown(elapsed);
        }

        // OTA check every 6 hours (synchronous, only when net_task idle & Active)
        if (now - last_ota_check >= OTA_CHECK_INTERVAL_MS && !net_busy()
            && power_mgr_mode() == PWR_ACTIVE) {
            last_ota_check = now;
            ota_check_and_update();
        }

        // Battery UI update (every 30s)
        if (now - s_last_batt_ui >= 30000) {
            s_last_batt_ui = now;
            int pct = battery_percent();
            bool chg = battery_charging();
            ui_update_battery(pct, chg);
            ui_update_settings_battery(pct, chg, battery_voltage(), battery_on_battery());
        }

        // Heap monitoring (once per refresh cycle)
        if (now - s_last_heap_log >= eff_refresh && eff_refresh > 0) {
            s_last_heap_log = now;
            Serial.printf("[MEM] Heap: %u free, %u largest | PSRAM: %u free\n",
                          ESP.getFreeHeap(), ESP.getMaxAllocHeap(), ESP.getFreePsram());
        }

        // Burn-in prevention: subtle pixel shift every 10 minutes
        if (now - s_last_shift >= 600000) {
            s_last_shift = now;
            s_burn_x = (s_burn_x >= 2) ? -2 : s_burn_x + 1;
            s_burn_y = (s_burn_y >= 2) ? -2 : s_burn_y + 1;
            lv_obj_t *scr = lv_scr_act();
            if (scr) {
                lv_obj_set_style_translate_x(scr, s_burn_x, 0);
                lv_obj_set_style_translate_y(scr, s_burn_y, 0);
            }
        }
    }

    // ── Power management tick (handles Active→Glance→Sleep) ─────────
    power_mgr_tick();

    lv_task_handler();
    delay(5);
}
