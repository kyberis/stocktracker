"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { getMarketStatus, wasMarketOpenToday } from "@/lib/market-hours";
import { convertCurrency, resolveQuoteCurrency } from "@/lib/utils";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import BackfillCTA from "./BackfillCTA";
import MarketAwareBreakdown from "./MarketAwareBreakdown";
import WarrentDrawer from "@/components/warrent/WarrentDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";

const PortfolioValueChart = dynamic(() => import("./PortfolioValueChart"), {
  ssr: false,
  loading: () => (
    <div className="card rounded-xl h-[480px] animate-pulse bg-gray-50 dark:bg-white/[0.02]" />
  ),
});
import { AssetTypeReviewLauncher } from "@/components/AssetTypeReviewModal";
import type { Holding, QuoteData, ExchangeRates, HoldingAssetType } from "@/lib/types";

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
  const [recalculating, setRecalculating] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

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

  const cashValueBase = useMemo(
    () =>
      effectiveCash.reduce(
        (sum, c) => sum + convertCurrency(c.amountEUR, "EUR", baseCurrency, exchangeRates),
        0,
      ),
    [effectiveCash, baseCurrency, exchangeRates],
  );
  const investedValueBase = Math.max(0, totals.totalCurrentEUR - cashValueBase);

  const dayGainLoss = useMemo(
    () => computeMarketAwareDayPL(filteredHoldings, quotes, exchangeRates, baseCurrency),
    [filteredHoldings, quotes, exchangeRates, baseCurrency],
  );

  const dayChangePctByType = useMemo(() => {
    const result: Partial<Record<AssetFilter, number>> = {};
    const groups: AssetFilter[] = ["all", "stock", "etf", "crypto"];
    for (const group of groups) {
      const groupHoldings = group === "all" ? holdings : holdings.filter((h) => (h.assetType ?? "stock") === group);
      if (groupHoldings.length === 0) continue;

      let weightedChange = 0;
      let totalValue = 0;
      for (const h of groupHoldings) {
        const quote = quotes[h.ticker];
        if (!quote || quote.regularMarketPrice <= 0) continue;
        const isCrypto = h.assetType === "crypto";
        const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
        const posValue = Math.abs(h.shares * quote.regularMarketPrice);
        const posValueBase = convertCurrency(posValue, quoteCurrency, baseCurrency, exchangeRates);

        if (!isCrypto && !wasMarketOpenToday(h.exchange)) {
          totalValue += posValueBase;
          continue;
        }

        const dayDelta = h.shares * (quote.regularMarketChange ?? 0);
        const dayDeltaBase = convertCurrency(dayDelta, quoteCurrency, baseCurrency, exchangeRates);
        weightedChange += dayDeltaBase;
        totalValue += posValueBase;
      }
      result[group] = totalValue > 0 ? (weightedChange / totalValue) * 100 : 0;
    }
    return result;
  }, [holdings, quotes, exchangeRates, baseCurrency]);

  const handleBackfillComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/portfolio/backfill-snapshots", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("recalculate failed");
      setRefreshKey((k) => k + 1);
    } catch {
      // Silently fail — the user can retry
    } finally {
      setRecalculating(false);
    }
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
      {/* Backfill CTA */}
      <BackfillCTA holdingsCount={holdings.length} onComplete={handleBackfillComplete} />

      {holdings.length > 0 && (
        <div className="flex justify-end -mt-1">
          <AssetTypeReviewLauncher />
        </div>
      )}

      {/* Chart (with integrated header + filter) */}
      <ErrorBoundary>
        <PortfolioValueChart
          holdings={holdings}
          assetFilter={assetFilter}
          refreshKey={refreshKey}
          onRecalculate={handleRecalculate}
          recalculating={recalculating}
          onOpenAi={() => setAiDrawerOpen(true)}
          totalValue={totals.totalCurrentEUR}
          investedValue={investedValueBase}
          cashValue={cashValueBase}
          dayGainLoss={dayGainLoss}
          dayGainLossPercent={
            investedValueBase - dayGainLoss > 0
              ? (dayGainLoss / (investedValueBase - dayGainLoss)) * 100
              : 0
          }
          totalGainLossPercent={totals.totalGainLossPercent}
          onAssetFilterChange={setAssetFilter}
          dayChangePctByType={dayChangePctByType}
          breakdownSlot={
            <MarketAwareBreakdown
              holdings={holdings}
              cashEntries={cashEntries}
              onFilterChange={setAssetFilter}
              activeFilter={assetFilter}
            />
          }
        />
      </ErrorBoundary>

      <WarrentDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />
    </div>
  );
}
