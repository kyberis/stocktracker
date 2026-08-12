"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { computeDayChangeByType, computeDayChangeHeadline } from "@/lib/day-change-pct";
import { convertCurrency } from "@/lib/utils";
import { cashAmountEUR } from "@/lib/fixed-return-cash";
import { liquidCashEntries } from "@/lib/portfolio-summary-cash";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import BackfillCTA from "./BackfillCTA";
import MarketAwareBreakdown from "./MarketAwareBreakdown";
import WarrenDrawer from "@/components/warren/WarrenDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AssetTypeReviewLauncher } from "@/components/AssetTypeReviewModal";
import type { Holding, QuoteData, ExchangeRates } from "@/lib/types";

const PortfolioHeroCard = dynamic(() => import("./PortfolioHeroCard"), {
  ssr: false,
  loading: () => (
    <div className="card h-[320px] animate-pulse rounded-xl bg-gray-50 dark:bg-white/[0.02]" />
  ),
});

const PortfolioEvolutionChart = dynamic(() => import("./PortfolioEvolutionChart"), {
  ssr: false,
  loading: () => (
    <div className="card h-[420px] animate-pulse rounded-xl bg-gray-50 dark:bg-white/[0.02]" />
  ),
});

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const {
    holdings,
    cashEntries,
    quotes,
    exchangeRates,
    activePortfolioCurrency,
    activePortfolioId,
    isInitializing,
  } = usePortfolio();

  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const baseCurrency = activePortfolioCurrency;

  const filteredHoldings = useMemo(() => {
    if (assetFilter === "all") return holdings;
    if (assetFilter === "fixed_return") return [];
    return holdings.filter((h) => (h.assetType ?? "stock") === assetFilter);
  }, [holdings, assetFilter]);

  const effectiveCash = useMemo(() => {
    if (assetFilter === "all") return cashEntries;
    if (assetFilter === "fixed_return") {
      return cashEntries.filter((c) => c.type === "fixed_return");
    }
    return [];
  }, [assetFilter, cashEntries]);

  const totals = useMemo(
    () => calculatePortfolioTotals(filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency),
    [filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency],
  );

  const cashValueBase = useMemo(
    () =>
      liquidCashEntries(effectiveCash).reduce(
        (sum, c) =>
          sum + convertCurrency(cashAmountEUR(c, { rates: exchangeRates }), "EUR", baseCurrency, exchangeRates),
        0,
      ),
    [effectiveCash, baseCurrency, exchangeRates],
  );
  const investedValueBase = Math.max(0, totals.totalCurrentEUR - cashValueBase);

  const dayChangePctByType = useMemo(
    () => computeDayChangeByType(holdings, quotes, exchangeRates, baseCurrency, undefined, cashEntries).pct,
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency],
  );

  const { dayGainLoss, dayGainLossPercent } = useMemo(() => {
    const headline = computeDayChangeHeadline(
      filteredHoldings,
      quotes,
      exchangeRates,
      baseCurrency,
      undefined,
      effectiveCash,
    );
    return { dayGainLoss: headline.abs, dayGainLossPercent: headline.pct };
  }, [filteredHoldings, effectiveCash, quotes, exchangeRates, baseCurrency]);

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

  useEffect(() => {
    if (searchParams.get("view") !== "chart") return;
    const el = document.getElementById("chart");
    if (!el) return;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams]);

  if (isInitializing) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex h-[500px] items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <BackfillCTA holdingsCount={holdings.length} onComplete={handleBackfillComplete} />

      {holdings.length > 0 && (
        <div className="-mt-1 flex justify-end">
          <AssetTypeReviewLauncher />
        </div>
      )}

      <ErrorBoundary>
        <PortfolioHeroCard
          holdings={holdings}
          cashEntries={cashEntries}
          assetFilter={assetFilter}
          refreshKey={refreshKey}
          onRecalculate={handleRecalculate}
          recalculating={recalculating}
          onOpenAi={() => setAiDrawerOpen(true)}
          totalValue={totals.totalCurrentEUR}
          investedValue={investedValueBase}
          cashValue={cashValueBase}
          dayGainLoss={dayGainLoss}
          dayGainLossPercent={dayGainLossPercent}
          dayChangePctByType={dayChangePctByType}
          hideViewChartLink
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

      {activePortfolioId != null && holdings.length > 0 && (
        <ErrorBoundary>
          <PortfolioEvolutionChart
            holdings={holdings}
            assetFilter={assetFilter}
            refreshKey={refreshKey}
            onRecalculate={handleRecalculate}
            recalculating={recalculating}
            onOpenAi={() => setAiDrawerOpen(true)}
          />
        </ErrorBoundary>
      )}

      <WarrenDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </div>
  );
}
