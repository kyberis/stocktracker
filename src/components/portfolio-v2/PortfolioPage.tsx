"use client";

import { useCallback, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { getMarketStatus } from "@/lib/market-hours";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";
import AssetTypeFilter from "@/components/dashboard-v2/AssetTypeFilter";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import PortfolioHeader from "./PortfolioHeader";
import PortfolioValueChart from "./PortfolioValueChart";
import BackfillCTA from "./BackfillCTA";
import MarketAwareBreakdown from "./MarketAwareBreakdown";
import type { Holding, QuoteData, ExchangeRates } from "@/lib/types";

/**
 * Compute day P/L only from holdings whose market is currently open.
 * Crypto counts as always-open. Stocks/ETFs with closed markets contribute 0 day change.
 */
function computeMarketAwareDayPL(
  holdings: Holding[],
  quotes: Record<string, QuoteData>,
  exchangeRates: ExchangeRates,
  baseCurrency: string,
): number {
  let dayPL = 0;
  for (const h of holdings) {
    const isCrypto = h.assetType === "crypto";
    if (!isCrypto) {
      if (!getMarketStatus(h.exchange).isOpen) continue;
    }
    const quote = quotes[h.ticker];
    if (!quote || quote.regularMarketPrice <= 0) continue;
    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
    const dayDelta = h.shares * (quote.regularMarketChange ?? 0);
    dayPL += convertCurrency(dayDelta, quoteCurrency, baseCurrency, exchangeRates);
  }
  return dayPL;
}

export default function PortfolioPage() {
  const {
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    activePortfolioCurrency,
    isInitializing,
  } = usePortfolio();

  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const baseCurrency = activePortfolioCurrency;

  const filteredHoldings = useMemo(() => {
    if (assetFilter === "all") return holdings;
    return holdings.filter((h) => (h.assetType ?? "stock") === assetFilter);
  }, [holdings, assetFilter]);

  const effectiveCash = assetFilter === "all" ? cashEntries : [];

  const totals = useMemo(
    () => calculatePortfolioTotals(filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency),
    [filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency],
  );

  const dayGainLoss = useMemo(
    () => computeMarketAwareDayPL(filteredHoldings, quotes, exchangeRates, baseCurrency),
    [filteredHoldings, quotes, exchangeRates, baseCurrency],
  );

  const handleBackfillComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (isInitializing) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="h-[500px] flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <PortfolioHeader
        totalValue={totals.totalCurrentEUR}
        dayGainLoss={dayGainLoss}
        dayGainLossPercent={
          totals.totalCurrentEUR > 0
            ? (dayGainLoss / (totals.totalCurrentEUR - dayGainLoss)) * 100
            : 0
        }
        totalGainLossPercent={totals.totalGainLossPercent}
        currency={baseCurrency}
      />

      {/* Asset Type Filter */}
      <AssetTypeFilter value={assetFilter} onChange={setAssetFilter} />

      {/* Backfill CTA */}
      <BackfillCTA holdingsCount={holdings.length} onComplete={handleBackfillComplete} />

      {/* Chart */}
      <PortfolioValueChart
        holdings={holdings}
        assetFilter={assetFilter}
        refreshKey={refreshKey}
      />

      {/* Asset Breakdown Cards */}
      <MarketAwareBreakdown
        holdings={holdings}
        cashEntries={cashEntries}
        onFilterChange={setAssetFilter}
        activeFilter={assetFilter}
      />
    </div>
  );
}
