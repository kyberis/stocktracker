"use client";

import { useCallback, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { computeDayChangeByType } from "@/lib/day-change-pct";
import { getDayChange } from "@/lib/portfolio/metrics";
import { convertCurrency } from "@/lib/utils";
import type { Holding, CashEntry } from "@/lib/types";
import type { AssetFilter } from "./AssetTypeFilter";

export interface UsePortfolioHomeDataArgs {
  holdings: Holding[];
  /** Investment cash entries (type === "cash"). Participates in the "all" filter. */
  cashEntries: CashEntry[];
}

export interface PortfolioHomeData {
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (v: boolean) => void;
  assetFilter: AssetFilter;
  setAssetFilter: (v: AssetFilter) => void;
  filteredHoldings: Holding[];
  effectiveCash: CashEntry[];
  totals: ReturnType<typeof calculatePortfolioTotals>;
  cashValueBase: number;
  investedValueBase: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  dayChangePctByType: Partial<Record<AssetFilter, number>>;
  refreshKey: number;
  recalculating: boolean;
  handleRecalculate: () => Promise<void>;
  handleBackfillComplete: () => void;
}

/**
 * Shared data-prep for the portfolio home screen. Both the desktop
 * `DashboardPortfolioV2` and `MobileDashboard` consume this so they wire
 * identical props into `PortfolioHeroCard`, `StatsGrid`, etc.
 */
export function usePortfolioHomeData(
  { holdings, cashEntries }: UsePortfolioHomeDataArgs,
): PortfolioHomeData {
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);

  const baseCurrency = activePortfolioCurrency;

  const filteredHoldings = useMemo(() => {
    if (assetFilter === "all") return holdings;
    return holdings.filter((h) => (h.assetType ?? "stock") === assetFilter);
  }, [holdings, assetFilter]);

  const effectiveCash = useMemo<CashEntry[]>(
    () => (assetFilter === "all" ? cashEntries : []),
    [assetFilter, cashEntries],
  );

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

  const dayChangeByType = useMemo(
    () => computeDayChangeByType(holdings, quotes, exchangeRates, baseCurrency),
    [holdings, quotes, exchangeRates, baseCurrency],
  );

  const dayChangePctByType = dayChangeByType.pct;

  const { dayGainLoss, dayGainLossPercent } = useMemo(() => {
    const headline = getDayChange(
      filteredHoldings,
      quotes,
      exchangeRates,
      baseCurrency,
    );
    return { dayGainLoss: headline.amount, dayGainLossPercent: headline.pct };
  }, [filteredHoldings, quotes, exchangeRates, baseCurrency]);

  const handleBackfillComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/portfolio/backfill-snapshots", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("recalculate failed");
      setRefreshKey((k) => k + 1);
    } catch { /* user can retry */ } finally {
      setRecalculating(false);
    }
  }, []);

  return {
    aiDrawerOpen,
    setAiDrawerOpen,
    assetFilter,
    setAssetFilter,
    filteredHoldings,
    effectiveCash,
    totals,
    cashValueBase,
    investedValueBase,
    dayGainLoss,
    dayGainLossPercent,
    dayChangePctByType,
    refreshKey,
    recalculating,
    handleRecalculate,
    handleBackfillComplete,
  };
}
