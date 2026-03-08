#pragma once

#ifdef SIMULATOR
#include <cstdint>
#include <cstring>
#else
#include <Arduino.h>
#endif

constexpr int MAX_DASH_HOLDINGS = 5;   // rows shown on dashboard summary
constexpr int MAX_ALL_HOLDINGS  = 30;  // max holdings device can store
constexpr int AI_SUMMARY_MAX    = 512;
constexpr int MAX_SPARKLINE_PTS = 20;  // 1-month daily close prices

struct TopHolding {
    char  ticker[12];
    char  name[40];
    float weight;
    float dayChange;
    float shares;
    float price;
    char  currency[8];
};

struct SparklineData {
    char  ticker[12];
    int   count;
    float close[MAX_SPARKLINE_PTS];
};

struct PortfolioData {
    float totalValueEUR;
    float costBasis;
    float dayChangeEUR;
    float dayChangePercent;
    float totalGainLoss;
    float totalGainLossPercent;
    int   holdingsCount;
    int   topCount;
    TopHolding top[MAX_ALL_HOLDINGS];
    char  aiSummary[AI_SUMMARY_MAX];
    bool  aiLoaded;
    int   aiUsed;
    int   aiLimit;
};

void portfolio_clear(PortfolioData &d);
void sparkline_clear(SparklineData &s);

// Device capabilities returned by /api/device/config
struct DeviceConfig {
    char plan[8];             // "free" or "pro"
    bool aiSummaryEnabled;
    int  topHoldingsCount;
    int  refreshIntervalSec;
    char templateId[32];
    char latestFirmware[24];
};

void device_config_clear(DeviceConfig &c);

// Firmware update info returned by /api/device/firmware
struct FirmwareInfo {
    bool available;
    char version[24];
    char url[256];
    char sha256[65];
    int  size;
};

void firmware_info_clear(FirmwareInfo &f);
