#include "stocks.h"
#include <cstring>

void portfolio_clear(PortfolioData &d) {
    memset(&d, 0, sizeof(d));
    d.aiSummary[0] = '\0';
    d.aiLoaded = false;
}
