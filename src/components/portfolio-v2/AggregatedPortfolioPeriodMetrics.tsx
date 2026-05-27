"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { convertCurrency, formatPercent } from "@/lib/utils";
import TierFeatureBadge from "@/components/TierFeatureBadge";
import {
  calculatePortfolioValueOnDate,
  calculatePeriodReturn,
  type HoldingSeriesEntry,
} from "@/lib/performance";
import { getAggregatedPeriodAnchorDates } from "@/lib/portfolio-performance-matrix";
import type { HistoricalDataPoint, Holding } from "@/lib/types";

type HistoricalApiResponse = {
  data?: HistoricalDataPoint[];
};

interface Props {
  holdings: Holding[];
  refreshKey?: number;
}

export default function AggregatedPortfolioPeriodMetrics({ holdings, refreshKey = 0 }: Props) {
  const { exchangeRates, quotes, activePortfolioCurrency, demoMode } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    oneWeek: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    ytd: number | null;
    oneYear: number | null;
  }>({
    oneWeek: null,
    threeMonth: null,
    sixMonth: null,
    ytd: null,
    oneYear: null,
  });

  const tickers = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker))],
    [holdings],
  );

  const currentEquity = useMemo(() => {
    let sum = 0;
    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (q && q.regularMarketPrice > 0) {
        sum += convertCurrency(
          h.shares * q.regularMarketPrice,
          h.displayCurrency,
          baseCurrency,
          exchangeRates,
        );
      } else {
        sum += convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      }
    }
    return sum;
  }, [holdings, quotes, exchangeRates, baseCurrency]);

  const fetchHistorical = useCallback(async (symbol: string): Promise<HistoricalDataPoint[]> => {
    const params = new URLSearchParams({ symbol, period: "1y", provider: "yahoo" });
    const res = await fetch(`/api/historical?${params}`);
    if (!res.ok) return [];
    const json = (await res.json()) as HistoricalApiResponse | HistoricalDataPoint[];
    if (Array.isArray(json)) return json;
    return json.data || [];
  }, []);

  useEffect(() => {
    if (tickers.length === 0 || demoMode) {
      setResults({
        oneWeek: null,
        threeMonth: null,
        sixMonth: null,
        ytd: null,
        oneYear: null,
      });
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

        const dates = getAggregatedPeriodAnchorDates();
        const v1w = calculatePortfolioValueOnDate(entries, dates.oneWeek, exchangeRates, baseCurrency);
        const v3m = calculatePortfolioValueOnDate(entries, dates.threeMonth, exchangeRates, baseCurrency);
        const v6m = calculatePortfolioValueOnDate(entries, dates.sixMonth, exchangeRates, baseCurrency);
        const vYtd = calculatePortfolioValueOnDate(entries, dates.ytd, exchangeRates, baseCurrency);
        const v1y = calculatePortfolioValueOnDate(entries, dates.oneYear, exchangeRates, baseCurrency);

        setResults({
          oneWeek: calculatePeriodReturn(currentEquity, v1w),
          threeMonth: calculatePeriodReturn(currentEquity, v3m),
          sixMonth: calculatePeriodReturn(currentEquity, v6m),
          ytd: calculatePeriodReturn(currentEquity, vYtd),
          oneYear: calculatePeriodReturn(currentEquity, v1y),
        });
      } catch {
        setResults({
          oneWeek: null,
          threeMonth: null,
          sixMonth: null,
          ytd: null,
          oneYear: null,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tickers, holdings, exchangeRates, currentEquity, fetchHistorical, baseCurrency, refreshKey, demoMode]);

  const periods: { label: string; value: number | null }[] = [
    { label: t("period1w"), value: results.oneWeek },
    { label: t("period3m"), value: results.threeMonth },
    { label: t("period6m"), value: results.sixMonth },
    { label: t("ytd"), value: results.ytd },
    { label: t("oneYear"), value: results.oneYear },
  ];

  if (holdings.length === 0) {
    return (
      <div className="px-5 pb-4 flex items-center justify-center min-h-[200px] text-sm text-gray-500 dark:text-slate-400">
        {t("noHoldings")}
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
          {t("portfolioGrowth")}
        </h3>
        <TierFeatureBadge requiredPlan="pro" size="sm" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {periods.map((p) => {
          const hasValue = !loading && p.value !== null;
          const isPositive = hasValue && p.value! >= 0;
          const color = loading
            ? "text-gray-300 dark:text-slate-600"
            : !hasValue
              ? "text-gray-400 dark:text-slate-500"
              : isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400";
          const bg = loading
            ? "bg-gray-50 dark:bg-slate-800/50"
            : !hasValue
              ? "bg-gray-50 dark:bg-slate-800/50"
              : isPositive
                ? "bg-emerald-50 dark:bg-emerald-500/10"
                : "bg-red-50 dark:bg-red-500/10";

          const formatted = hasValue ? formatPercent(p.value!) : "—";
          const longValue = formatted.length > 7;

          return (
            <div
              key={p.label}
              className={`${bg} rounded-xl p-3 text-center`}
              title={t("growthCaveat")}
            >
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">{p.label}</p>
              <p
                className={`${longValue ? "text-base" : "text-lg"} font-bold tabular-nums ${color} ${loading ? "animate-value-shimmer" : ""}`}
              >
                {loading ? "—" : formatted}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-3 text-center">{t("growthCaveat")}</p>
    </div>
  );
}
