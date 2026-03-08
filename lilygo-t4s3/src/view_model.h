#pragma once

#include "stocks.h"
#include "template_def.h"
#include <cstdint>

struct HoldingVM {
    char ticker[12];
    char name[40];
    char weightStr[12];   // "32.1%"
    char changeStr[12];   // "+1.20%"
    bool positive;
};

struct PortfolioVM {
    char totalValueStr[20];
    char dayChangeStr[32];
    bool dayPositive;
    char costBasisStr[24];
    char gainLossStr[20];
    char gainLossAmtStr[20];
    bool gainPositive;
    char holdingsCountStr[24];

    int holdingCount;
    HoldingVM holdings[MAX_TOP_HOLDINGS];

    bool aiEnabled;
    char aiText[AI_SUMMARY_MAX];
};

// Compute display-ready values from raw portfolio data and device config.
void view_model_compute(const PortfolioData &data, const DeviceConfig &cfg, PortfolioVM &vm);
