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

LilyGo_Class amoled;

static PortfolioData portfolio;
static DeviceConfig device_cfg;
static char token_buf[TOKEN_MAX_LEN];

static uint32_t refresh_interval_ms = 60000;
static uint32_t last_refresh = 0;
static uint32_t last_ota_check = 0;
static const uint32_t OTA_CHECK_INTERVAL_MS = 6UL * 3600UL * 1000UL; // 6 hours
static bool dashboard_active = false;

static void fetch_and_show() {
    ui_set_status("Syncing...");
    bool ok = api_fetch_portfolio(portfolio);
    last_refresh = millis();
    ui_update_countdown(0);
    if (ok) {
        ui_update_portfolio(portfolio);
        ui_set_live_state(true);
        ota_mark_valid();
    } else {
        ui_set_status("Sync failed - retrying...");
        ui_set_live_state(false);
    }
}

static void on_manual_refresh() {
    Serial.println("Manual refresh requested.");
    fetch_and_show();
}

static void load_device_config() {
    if (api_fetch_device_config(device_cfg)) {
        refresh_interval_ms = (uint32_t)device_cfg.refreshIntervalSec * 1000;
        ui_set_ai_visible(device_cfg.aiSummaryEnabled);
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
    lv_task_handler();
    if (api_fetch_ai_summary(portfolio)) {
        ui_update_ai_summary(portfolio.aiSummary);
    } else if (portfolio.aiSummary[0] != '\0') {
        ui_update_ai_summary(portfolio.aiSummary);
    } else {
        ui_update_ai_summary("Unable to load AI summary.\nPlease try again later.");
    }
    ui_update_ai_usage(portfolio.aiUsed, portfolio.aiLimit);
}

static SparklineData sparkline_buf;

static void on_view_all() {
    ui_update_holdings_list(portfolio);
    ui_show_holdings_list();
}

static void on_holding_tap(int idx) {
    ui_show_stock_detail(idx);
}

static void on_sparkline_request(const char *ticker) {
    Serial.printf("Fetching sparkline for %s...\n", ticker);
    lv_task_handler();
    if (api_fetch_sparkline(ticker, sparkline_buf)) {
        ui_update_sparkline(sparkline_buf);
        Serial.printf("Sparkline loaded: %d points\n", sparkline_buf.count);
    } else {
        SparklineData empty;
        sparkline_clear(empty);
        ui_update_sparkline(empty);
        Serial.println("Sparkline fetch failed.");
    }
}

static void on_token_submit(const char *entered_token);

static void on_retry() {
    ui_show_token_entry(on_token_submit);
}

static void on_token_submit(const char *entered_token) {
    ui_show_loading("Validating passkey...");

    config_save_token(entered_token);
    api_init(API_BASE_URL, entered_token);

    if (api_validate_token()) {
        Serial.println("Token valid, loading dashboard.");
        dashboard_active = true;
        load_device_config();
        ui_show_dashboard();
        fetch_and_show();
    } else {
        config_clear_token();
        ui_show_error("Invalid passkey. Check and try again.");
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("trefolio T4-S3 booting...");

    if (!amoled.begin()) {
        Serial.println("AMOLED init failed!");
        while (1) delay(1000);
    }

    Serial.printf("Display: %dx%d  Board: %s\n",
                  amoled.width(), amoled.height(), amoled.getName());

    beginLvglHelper(amoled);
    config_init();

    // Set firmware version for API headers
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

    // WiFi provisioning: if no credentials stored, enter setup mode
    if (!wifi_provision_has_credentials()) {
        ui_show_loading("Setup mode...\nConnect to trefolio AP");
        lv_task_handler();
        wifi_provision_start();
        // wifi_provision_start() reboots after save, so we won't reach here
        return;
    }

    ui_show_loading("Connecting to WiFi...");
    lv_task_handler();

    char wifi_ssid[64], wifi_pass[64];
    config_load_wifi_ssid(wifi_ssid, sizeof(wifi_ssid));
    config_load_wifi_pass(wifi_pass, sizeof(wifi_pass));

    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid, wifi_pass);
    Serial.printf("Connecting to WiFi '%s'...\n", wifi_ssid);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        lv_task_handler();
        attempts++;
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi connection failed.");
        // After 3 consecutive failures, offer re-provisioning
        ui_show_error("WiFi connection failed.\nHold to reconfigure.");
        return;
    }

    Serial.printf("WiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());

    // Check for firmware updates on boot
    ui_show_loading("Checking for updates...");
    lv_task_handler();
    ota_check_and_update(); // reboots if update applied
    last_ota_check = millis();

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

    Serial.println("Ready.");
}

void loop() {
    if (dashboard_active) {
        uint32_t now = millis();

        // Periodic data refresh
        if (now - last_refresh >= refresh_interval_ms) {
            fetch_and_show();
        } else {
            int elapsed = (int)((now - last_refresh) / 1000);
            ui_update_countdown(elapsed);
        }

        // Periodic OTA check (every 6 hours)
        if (now - last_ota_check >= OTA_CHECK_INTERVAL_MS) {
            last_ota_check = now;
            ota_check_and_update();
        }
    }

    lv_task_handler();
    delay(5);
}
