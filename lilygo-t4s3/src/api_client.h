#pragma once

#include "stocks.h"

void api_init(const char *baseUrl, const char *token);

// Returns true on success, fills `out`. Returns false on HTTP/parse error.
bool api_fetch_portfolio(PortfolioData &out);

// Returns true on success, writes summary into out.aiSummary. False on error.
bool api_fetch_ai_summary(PortfolioData &out);

// Quick token validation: calls portfolio/summary and checks for 200.
bool api_validate_token();
