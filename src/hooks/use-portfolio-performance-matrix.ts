"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { calculateTotalsByAssetType } from "@/lib/portfolio-summary";
import { computeDayChangeByType } from "@/lib/day-change-pct";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";
import {
  buildMatrixFromHistorical,
  buildMatrixFromSnapshots,
  resolveMatrixAssetKeys,
  type MatrixRow,
  type SnapshotHistoryPoint,
} from "@/lib/portfolio-performance-matrix";
import type { HoldingSeriesEntry } from "@/lib/performance";
import type { HistoricalDataPoint, Holding, CashEntry, Transaction } from "@/lib/types";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import demoMatrix from "../../data/demo-performance-matrix.json";

type HistoricalApiResponse = { data?: HistoricalDataPoint[] };

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
  const isPro = user?.plan === "pro" || user?.role === "admin";
  const baseCurrency = activePortfolioCurrency;

  const [loading, setLoading] = useState(!demoMode);
  const [snapshots, setSnapshots] = useState<SnapshotHistoryPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayMode, setDisplayMode] = useState<"percent" | "currency">("percent");

  const byType = useMemo(
    () => calculateTotalsByAssetType(holdings, cashEntries, quotes, exchangeRates, baseCurrency),
    [holdings, cashEntries, quotes, exchangeRates, baseCurrency],
  );

  const investedTotal =
    byType.stock.totalCurrentEUR +
    byType.etf.totalCurrentEUR +
    byType.fund.totalCurrentEUR +
    byType.crypto.totalCurrentEUR +
    byType.fixed_return.totalCurrentEUR;

  const dayChangeComputed = useMemo(() => {
    const currents = {
      stock: byType.stock.totalCurrentEUR,
      etf: byType.etf.totalCurrentEUR,
      fund: byType.fund.totalCurrentEUR,
      crypto: byType.crypto.totalCurrentEUR,
      fixed_return: byType.fixed_return.totalCurrentEUR,
    };
    return computeDayChangeByType(
      holdings,
      quotes,
      exchangeRates,
      baseCurrency,
      undefined,
      cashEntries,
      currents,
    );
  }, [byType, holdings, cashEntries, quotes, exchangeRates, baseCurrency]);

  const { currentByAsset, dayPctByAsset, dayAbsByAsset } = useMemo(() => {
    const current: Partial<Record<AssetFilter, number>> = {
      all: investedTotal,
      stock: byType.stock.totalCurrentEUR,
      etf: byType.etf.totalCurrentEUR,
      fund: byType.fund.totalCurrentEUR,
      crypto: byType.crypto.totalCurrentEUR,
      fixed_return: byType.fixed_return.totalCurrentEUR,
    };

    // Prefer the shared parent result when provided (same object as the hero).
    const pct: Partial<Record<AssetFilter, number>> = {
      all: dayChangePctProp?.all ?? dayChangeComputed.pct.all,
      stock: dayChangePctProp?.stock ?? dayChangeComputed.pct.stock,
      etf: dayChangePctProp?.etf ?? dayChangeComputed.pct.etf,
      fund: dayChangePctProp?.fund ?? dayChangeComputed.pct.fund,
      crypto: dayChangePctProp?.crypto ?? dayChangeComputed.pct.crypto,
      fixed_return: dayChangePctProp?.fixed_return ?? dayChangeComputed.pct.fixed_return,
    };

    return {
      currentByAsset: current,
      dayPctByAsset: pct,
      dayAbsByAsset: dayChangeComputed.abs,
    };
  }, [byType, investedTotal, dayChangePctProp, dayChangeComputed]);

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

  /** Flow-adjusted return inputs (TRF-028) — scoped to the active portfolio
   * when one is selected, or all of the user's transactions for the
   * aggregated "all portfolios" view. */
  const fetchTransactions = useCallback(async () => {
    const params = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    const res = await fetchWithAuthRedirect(`/api/transactions${params}`, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : (data.transactions ?? [])) as Transaction[];
  }, [activePortfolioId]);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    if (holdings.length === 0) {
      setSnapshots([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [pts, txs] = await Promise.all([
          activePortfolioId ? fetchSnapshots() : Promise.resolve([]),
          fetchTransactions(),
        ]);
        if (!cancelled) {
          setSnapshots(pts);
          setTransactions(txs);
        }
      } catch {
        if (!cancelled) {
          setSnapshots([]);
          setTransactions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activePortfolioId, holdings.length, refreshKey, demoMode, fetchSnapshots, fetchTransactions]);

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
          transactions,
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
    transactions,
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
      transactions,
      exchangeRates,
      baseCurrency,
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
    transactions,
    exchangeRates,
    baseCurrency,
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
