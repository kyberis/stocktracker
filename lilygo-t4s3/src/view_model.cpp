#include "view_model.h"
#include <cstdio>
#include <cstring>

void view_model_compute(const PortfolioData &data, const DeviceConfig &cfg, PortfolioVM &vm) {
    memset(&vm, 0, sizeof(vm));

    // Total value
    if (data.totalValueEUR >= 100000)
        snprintf(vm.totalValueStr, sizeof(vm.totalValueStr), "%.1fK", data.totalValueEUR / 1000.0);
    else
        snprintf(vm.totalValueStr, sizeof(vm.totalValueStr), "%.0f", data.totalValueEUR);

    // Day change
    vm.dayPositive = data.dayChangeEUR >= 0;
    snprintf(vm.dayChangeStr, sizeof(vm.dayChangeStr), "%s%.2f (%s%.2f%%)",
             vm.dayPositive ? "+" : "", data.dayChangeEUR,
             data.dayChangePercent >= 0 ? "+" : "", data.dayChangePercent);

    // Cost basis
    snprintf(vm.costBasisStr, sizeof(vm.costBasisStr), "Cost: %.0f EUR", data.costBasis);

    // Gain/loss
    vm.gainPositive = data.totalGainLoss >= 0;
    snprintf(vm.gainLossStr, sizeof(vm.gainLossStr), "%s%.2f%%",
             data.totalGainLossPercent >= 0 ? "+" : "", data.totalGainLossPercent);
    snprintf(vm.gainLossAmtStr, sizeof(vm.gainLossAmtStr), "%s%.0f EUR",
             vm.gainPositive ? "+" : "", data.totalGainLoss);

    // Holdings count
    snprintf(vm.holdingsCountStr, sizeof(vm.holdingsCountStr), "%d holdings", data.holdingsCount);

    // Top holdings (respect config limit)
    int maxHoldings = cfg.topHoldingsCount > 0 ? cfg.topHoldingsCount : MAX_DASH_HOLDINGS;
    if (maxHoldings > MAX_DASH_HOLDINGS) maxHoldings = MAX_DASH_HOLDINGS;
    vm.holdingCount = 0;
    for (int i = 0; i < data.topCount && i < maxHoldings; i++) {
        HoldingVM &h = vm.holdings[vm.holdingCount++];
        strncpy(h.ticker, data.top[i].ticker, sizeof(h.ticker) - 1);
        strncpy(h.name, data.top[i].name, sizeof(h.name) - 1);
        snprintf(h.weightStr, sizeof(h.weightStr), "%.1f%%", data.top[i].weight);
        snprintf(h.changeStr, sizeof(h.changeStr), "%s%.2f%%",
                 data.top[i].dayChange >= 0 ? "+" : "", data.top[i].dayChange);
        h.positive = data.top[i].dayChange >= 0;
    }

    // AI
    vm.aiEnabled = cfg.aiSummaryEnabled;
    if (data.aiLoaded) {
        strncpy(vm.aiText, data.aiSummary, AI_SUMMARY_MAX - 1);
    } else {
        strncpy(vm.aiText, vm.aiEnabled ? "Tap to request AI summary" : "Pro subscription required", AI_SUMMARY_MAX - 1);
    }
}
