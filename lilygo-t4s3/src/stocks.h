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
};

void portfolio_clear(PortfolioData &d);
