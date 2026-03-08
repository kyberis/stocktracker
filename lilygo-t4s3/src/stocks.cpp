#include "stocks.h"
#include <cstring>

void portfolio_clear(PortfolioData &d) {
    memset(&d, 0, sizeof(d));
    d.aiSummary[0] = '\0';
    d.aiLoaded = false;
}

void device_config_clear(DeviceConfig &c) {
    memset(&c, 0, sizeof(c));
    strncpy(c.plan, "free", sizeof(c.plan) - 1);
    c.aiSummaryEnabled = false;
    c.topHoldingsCount = MAX_TOP_HOLDINGS;
    c.refreshIntervalSec = 120;
    strncpy(c.templateId, "classic-dark", sizeof(c.templateId) - 1);
}

void firmware_info_clear(FirmwareInfo &f) {
    memset(&f, 0, sizeof(f));
}
