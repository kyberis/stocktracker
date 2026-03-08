#pragma once

#include <lvgl.h>
#include "stocks.h"

typedef void (*TokenSubmitCb)(const char *token);
typedef void (*AiRequestCb)();
typedef void (*RefreshCb)();
typedef void (*HoldingTapCb)(int holdingIndex);
typedef void (*SparklineRequestCb)(const char *ticker);

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

// All Holdings list screen
void ui_show_holdings_list();
void ui_update_holdings_list(const PortfolioData &data);
void ui_set_view_all_callback(RefreshCb cb);

// Stock detail screen
void ui_show_stock_detail(int holdingIndex);
void ui_update_sparkline(const SparklineData &data);
void ui_set_holding_tap_callback(HoldingTapCb cb);
void ui_set_sparkline_callback(SparklineRequestCb cb);
