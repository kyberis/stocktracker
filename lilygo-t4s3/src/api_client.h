#pragma once

#include "stocks.h"

void api_init(const char *baseUrl, const char *token);
void api_set_firmware_version(const char *ver);

// Returns 200 on success (fills `out`), 401 on auth failure, -1 on network error.
int api_fetch_portfolio(PortfolioData &out);

// Returns true on success, writes summary into out.aiSummary. False on error.
bool api_fetch_ai_summary(PortfolioData &out);

// Quick token validation: calls portfolio/summary and checks for 200.
bool api_validate_token();

// Fetch device capabilities (plan, features, template). Returns true on success.
bool api_fetch_device_config(DeviceConfig &out);

// Check for firmware update. Returns true if an update is available.
bool api_check_firmware_update(FirmwareInfo &out);

// Fetch 1-month sparkline (20 daily close prices) for a single ticker.
bool api_fetch_sparkline(const char *ticker, SparklineData &out);
