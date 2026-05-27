"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { getMarketStatus } from "@/lib/market-hours";
import { convertCurrency } from "@/lib/utils";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";
import {
  buildMatrixFromHistorical,
  buildMatrixFromSnapshots,
  resolveMatrixAssetKeys,
  type MatrixRow,
  type SnapshotHistoryPoint,
} from "@/lib/portfolio-performance-matrix";
import type { HoldingSeriesEntry } from "@/lib/performance";
import type { HistoricalDataPoint, Holding, CashEntry } from "@/lib/types";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import demoMatrix from "../../data/demo-performance-matrix.json";

type HistoricalApiResponse = { data?: HistoricalDataPoint[] };

function isAssetTypeMarketOpen(holdings: Holding[], assetType: "stock" | "etf" | "crypto"): boolean {
  if (assetType === "crypto") return true;
  return holdings
    .filter((h) => (h.assetType ?? "stock") === assetType)
    .some((h) => {
      const ex = h.exchange?.toUpperCase();
      return ex ? getMarketStatus(ex).isOpen : false;
    });
}

export interface UsePortfolioPerformanceMatrixArgs {
  holdings: Holding[];
  cashEntries: CashEntry[];
  refreshKey?: number;
  dayChangePctByType?: Partial<Record<AssetFilter, number>>;
}

export function usePortfolioPerformanceMatrix({
  holdings,
  cashEntries,
  refreshKey = 0,
  dayChangePctByType: dayChangePctProp,
}: UsePortfolioPerformanceMatrixArgs) {
  const { exchangeRates, quotes, activePortfolioCurrency, activePortfolioId, demoMode } = usePortfolio();
  const { user } = useAuth();
  const isPro = user?.plan === "pro";
  const baseCurrency = activePortfolioCurrency;

  const [loading, setLoading] = useState(!demoMode);
  const [snapshots, setSnapshots] = useState<SnapshotHistoryPoint[]>([]);
  const [displayMode, setDisplayMode] = useState<"percent" | "currency">("percent");

  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency],
  );

  const investedTotal =
    byType.stock.totalCurrentEUR + byType.etf.totalCurrentEUR + byType.crypto.totalCurrentEUR;

  const marketOpen = useMemo(
    () => ({
      stock: isAssetTypeMarketOpen(holdings, "stock"),
      etf: isAssetTypeMarketOpen(holdings, "etf"),
      crypto: true,
    }),
    [holdings],
  );

  const { currentByAsset, dayPctByAsset, dayAbsByAsset } = useMemo(() => {
    const allDayPL =
      (marketOpen.stock ? byType.stock.dayGainLossEUR : 0) +
      (marketOpen.etf ? byType.etf.dayGainLossEUR : 0) +
      (marketOpen.crypto ? byType.crypto.dayGainLossEUR : 0);
    const allPrior = investedTotal - allDayPL;
    const allDayPct = allPrior > 0 ? (allDayPL / allPrior) * 100 : 0;

    const pctFor = (type: "stock" | "etf" | "crypto", value: number, dayPL: number, open: boolean) => {
      if (!open) return undefined;
      const prior = value - dayPL;
      return prior > 0 ? (dayPL / prior) * 100 : 0;
    };

    const current: Partial<Record<AssetFilter, number>> = {
      all: investedTotal,
      stock: byType.stock.totalCurrentEUR,
      etf: byType.etf.totalCurrentEUR,
      crypto: byType.crypto.totalCurrentEUR,
    };

    const pct: Partial<Record<AssetFilter, number>> = {
      all: dayChangePctProp?.all ?? allDayPct,
      stock: dayChangePctProp?.stock ?? pctFor("stock", byType.stock.totalCurrentEUR, byType.stock.dayGainLossEUR, marketOpen.stock),
      etf: dayChangePctProp?.etf ?? pctFor("etf", byType.etf.totalCurrentEUR, byType.etf.dayGainLossEUR, marketOpen.etf),
      crypto: dayChangePctProp?.crypto ?? pctFor("crypto", byType.crypto.totalCurrentEUR, byType.crypto.dayGainLossEUR, true),
    };

    const abs: Partial<Record<AssetFilter, number>> = {
      all: marketOpen.stock || marketOpen.etf || marketOpen.crypto ? allDayPL : undefined,
      stock: marketOpen.stock ? byType.stock.dayGainLossEUR : undefined,
      etf: marketOpen.etf ? byType.etf.dayGainLossEUR : undefined,
      crypto: byType.crypto.dayGainLossEUR,
    };

    return { currentByAsset: current, dayPctByAsset: pct, dayAbsByAsset: abs };
  }, [byType, investedTotal, marketOpen, dayChangePctProp]);

  const assetKeys = useMemo(() => resolveMatrixAssetKeys(currentByAsset), [currentByAsset]);

  const fetchHistorical = useCallback(async (symbol: string): Promise<HistoricalDataPoint[]> => {
    const params = new URLSearchParams({ symbol, period: "all", provider: "yahoo" });
    const res = await fetch(`/api/historical?${params}`);
    if (!res.ok) return [];
    const json = (await res.json()) as HistoricalApiResponse | HistoricalDataPoint[];
    if (Array.isArray(json)) return json;
    return json.data || [];
  }, []);

  const fetchSnapshots = useCallback(async () => {
    if (!activePortfolioId) return [];
    const params = new URLSearchParams({ range: "all", portfolioId: activePortfolioId });
    const res = await fetchWithAuthRedirect(`/api/portfolio/history?${params}`, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.points ?? []) as SnapshotHistoryPoint[];
  }, [activePortfolioId]);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    if (holdings.length === 0) {
      setSnapshots([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (activePortfolioId) {
          const pts = await fetchSnapshots();
          if (!cancelled) setSnapshots(pts);
        } else {
          if (!cancelled) setSnapshots([]);
        }
      } catch {
        if (!cancelled) setSnapshots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activePortfolioId, holdings.length, refreshKey, demoMode, fetchSnapshots]);

  const [historicalRows, setHistoricalRows] = useState<MatrixRow[] | null>(null);

  useEffect(() => {
    if (demoMode || activePortfolioId != null || holdings.length === 0) {
      setHistoricalRows(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const entries: HoldingSeriesEntry[] = await Promise.all(
          holdings.map(async (h) => ({
            holding: h,
            series: await fetchHistorical(h.ticker),
          })),
        );
        if (cancelled) return;
        const rows = buildMatrixFromHistorical({
          holdings,
          entries,
          exchangeRates,
          baseCurrency,
          currentByAsset,
          dayPctByAsset,
          dayAbsByAsset,
          isPro,
          displayMode,
          assetKeys,
        });
        setHistoricalRows(rows);
      } catch {
        if (!cancelled) setHistoricalRows(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    activePortfolioId,
    holdings,
    exchangeRates,
    baseCurrency,
    currentByAsset,
    dayPctByAsset,
    dayAbsByAsset,
    isPro,
    displayMode,
    assetKeys,
    refreshKey,
    demoMode,
    fetchHistorical,
  ]);

  const rows: MatrixRow[] = useMemo(() => {
    if (demoMode) {
      return demoMatrix.rows as MatrixRow[];
    }
    if (activePortfolioId == null && historicalRows) {
      return historicalRows;
    }
    if (activePortfolioId == null) {
      return [];
    }
    return buildMatrixFromSnapshots({
      snapshots,
      currentByAsset,
      dayPctByAsset,
      dayAbsByAsset,
      isPro,
      displayMode,
      assetKeys,
    });
  }, [
    demoMode,
    activePortfolioId,
    historicalRows,
    snapshots,
    currentByAsset,
    dayPctByAsset,
    dayAbsByAsset,
    isPro,
    displayMode,
    assetKeys,
  ]);

  return {
    rows,
    loading,
    displayMode,
    setDisplayMode,
    isPro,
    assetKeys,
    baseCurrency,
  };
}
