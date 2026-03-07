#include <Arduino.h>
#include <WiFi.h>
#include <LilyGo_AMOLED.h>
#include <LV_Helper.h>
#include "config.h"
#include "stocks.h"
#include "api_client.h"
#include "ui.h"

LilyGo_Class amoled;

static PortfolioData portfolio;
static char token_buf[TOKEN_MAX_LEN];

static const uint32_t REFRESH_INTERVAL_MS = 60000;
static uint32_t last_refresh = 0;
static bool dashboard_active = false;

static void fetch_and_show() {
    ui_set_status("Syncing...");
    if (api_fetch_portfolio(portfolio)) {
        ui_update_portfolio(portfolio);
        char status[64];
        snprintf(status, sizeof(status), "%d holdings   Synced", portfolio.holdingsCount);
        ui_set_status(status);
    } else {
        ui_set_status("Sync failed - retrying...");
    }
    last_refresh = millis();
}

static void on_ai_request() {
    ui_update_ai_summary("Loading AI summary...");
    if (api_fetch_ai_summary(portfolio)) {
        ui_update_ai_summary(portfolio.aiSummary);
    } else {
        ui_update_ai_summary("AI summary unavailable. Pro subscription required or service error.");
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
        ui_show_dashboard();
        fetch_and_show();
    } else {
        config_clear_token();
        ui_show_error("Invalid passkey. Check and try again.");
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("StockTracker T4-S3 booting...");

    if (!amoled.begin()) {
        Serial.println("AMOLED init failed!");
        while (1) delay(1000);
    }

    Serial.printf("Display: %dx%d  Board: %s\n",
                  amoled.width(), amoled.height(), amoled.getName());

    beginLvglHelper(amoled);
    config_init();
    ui_init();
    ui_set_ai_callback(on_ai_request);
    ui_set_retry_callback(on_retry);

    ui_show_loading("Connecting to WiFi...");
    lv_task_handler();

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("Connecting to WiFi '%s'...\n", WIFI_SSID);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        lv_task_handler();
        attempts++;
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi connection failed.");
        ui_show_error("WiFi connection failed.\nCheck credentials in config.h");
        return;
    }

    Serial.printf("WiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());

    if (config_has_token()) {
        config_load_token(token_buf, sizeof(token_buf));
        api_init(API_BASE_URL, token_buf);
        ui_show_loading("Loading portfolio...");
        lv_task_handler();

        if (api_validate_token()) {
            dashboard_active = true;
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
        if (now - last_refresh >= REFRESH_INTERVAL_MS) {
            fetch_and_show();
        }

        uint32_t remaining = (REFRESH_INTERVAL_MS - (millis() - last_refresh)) / 1000;
        char status[80];
        snprintf(status, sizeof(status), "%d holdings   Refresh in %lus",
                 portfolio.holdingsCount, (unsigned long)remaining);
        ui_set_status(status);
    }

    lv_task_handler();
    delay(5);
}
