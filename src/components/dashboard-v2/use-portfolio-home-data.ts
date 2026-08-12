"use client";

import { useCallback, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals, calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { computeDayChangeByType, dayChangeForFilter, type DayChangeByType } from "@/lib/day-change-pct";
import { convertCurrency } from "@/lib/utils";
import { cashAmountEUR } from "@/lib/fixed-return-cash";
import { liquidCashEntries } from "@/lib/portfolio-summary-cash";
import type { Holding, CashEntry } from "@/lib/types";
import type { AssetFilter } from "./AssetTypeFilter";

export interface UsePortfolioHomeDataArgs {
  holdings: Holding[];
  /**
   * Portfolio cash slice for totals (typically `investmentCashEntries`:
   * plain cash + fixed_return). Liquid cash for the hero “available” line
   * is derived via `liquidCashEntries`.
   */
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
  /** Shared day-change result — pass into pills + matrix; do not recompute. */
  dayChangeByType: DayChangeByType;
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
    if (assetFilter === "fixed_return") return [];
    return holdings.filter((h) => (h.assetType ?? "stock") === assetFilter);
  }, [holdings, assetFilter]);

  const effectiveCash = useMemo<CashEntry[]>(() => {
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

  // One totals-by-type pass feeds both the sleeve currents and All Assets reconcile.
  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency],
  );

  const currentBySleeve = useMemo(
    () => ({
      stock: byType.stock.totalCurrentEUR,
      etf: byType.etf.totalCurrentEUR,
      fund: byType.fund.totalCurrentEUR,
      crypto: byType.crypto.totalCurrentEUR,
      fixed_return: byType.fixed_return.totalCurrentEUR,
    }),
    [byType],
  );

  // SINGLE day-change computation for hero + pills + matrix.
  const dayChangeByType = useMemo(
    () =>
      computeDayChangeByType(
        holdings,
        quotes,
        exchangeRates,
        baseCurrency,
        undefined,
        cashEntries,
        currentBySleeve,
      ),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency, currentBySleeve],
  );

  const dayChangePctByType = dayChangeByType.pct;

  const { dayGainLoss, dayGainLossPercent } = useMemo(() => {
    const { abs, pct } = dayChangeForFilter(dayChangeByType, assetFilter);
    return { dayGainLoss: abs, dayGainLossPercent: pct };
  }, [assetFilter, dayChangeByType]);

  const handleBackfillComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/portfolio/backfill-snapshots", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("recalculate failed");
      setRefreshKey((k) => k + 1);
    } catch {
      /* user can retry */
    } finally {
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
    dayChangeByType,
    dayChangePctByType,
    refreshKey,
    recalculating,
    handleRecalculate,
    handleBackfillComplete,
  };
}
