#pragma once

#ifdef SIMULATOR
#include <cstdint>
#include <cstring>
#else
#include <Arduino.h>
#endif

constexpr int MAX_TOP_HOLDINGS = 5;
constexpr int AI_SUMMARY_MAX   = 512;

struct TopHolding {
    char ticker[12];
    char name[40];
    float weight;
    float dayChange;
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
    TopHolding top[MAX_TOP_HOLDINGS];
    char  aiSummary[AI_SUMMARY_MAX];
    bool  aiLoaded;
    int   aiUsed;
    int   aiLimit;
};

void portfolio_clear(PortfolioData &d);

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
