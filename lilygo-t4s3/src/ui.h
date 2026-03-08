#pragma once

#include <lvgl.h>
#include "stocks.h"

typedef void (*TokenSubmitCb)(const char *token);
typedef void (*AiRequestCb)();
typedef void (*RefreshCb)();
typedef void (*HoldingTapCb)(int holdingIndex);
typedef void (*SparklineRequestCb)(const char *ticker);
typedef void (*BrightnessChangeCb)(uint8_t brightness);
typedef void (*TimeoutChangeCb)(uint16_t idle_dim_sec, uint16_t auto_sleep_sec);
typedef void (*ThemeChangeCb)(const char *template_id);
typedef void (*UnlinkCb)();

void ui_init();

typedef void (*RetryCb)();

void ui_show_loading(const char *msg);
void ui_show_error(const char *msg);
void ui_set_retry_callback(RetryCb cb);

void ui_show_token_entry(TokenSubmitCb onSubmit);
void ui_show_dashboard();

void ui_update_portfolio(const PortfolioData &data);
void ui_update_ai_summary(const char *text);
void ui_update_ai_usage(int used, int limit);
void ui_set_ai_callback(AiRequestCb cb);
void ui_set_ai_visible(bool visible);
void ui_set_status(const char *text);
void ui_set_refresh_callback(RefreshCb cb);
void ui_update_countdown(int seconds_elapsed);
void ui_set_live_state(bool ok);
void ui_apply_template(const char *template_id);

// Battery indicator (dashboard header)
void ui_update_battery(int percent, bool charging);

// All Holdings list screen
void ui_show_holdings_list();
void ui_update_holdings_list(const PortfolioData &data);
void ui_set_view_all_callback(RefreshCb cb);

// Stock detail screen
void ui_show_stock_detail(int holdingIndex);
void ui_update_sparkline(const SparklineData &data);
void ui_set_holding_tap_callback(HoldingTapCb cb);
void ui_set_sparkline_callback(SparklineRequestCb cb);

// Settings screen
void ui_show_settings();
void ui_set_settings_callbacks(BrightnessChangeCb bright_cb, TimeoutChangeCb timeout_cb,
                               ThemeChangeCb theme_cb, UnlinkCb unlink_cb);
void ui_update_settings_battery(int percent, bool charging, float voltage, bool on_battery);
void ui_settings_set_plan(const char *plan);
void ui_settings_set_brightness(uint8_t val);
void ui_settings_set_timeouts(uint16_t idle_dim_sec, uint16_t auto_sleep_sec);
