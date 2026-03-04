"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { convertToEUR, formatPercent } from "@/lib/utils";
import {
  calculatePortfolioValueOnDate,
  calculatePeriodReturn,
  type HoldingSeriesEntry,
} from "@/lib/performance";
import type { HistoricalDataPoint } from "@/lib/types";

type HistoricalApiResponse = {
  data?: HistoricalDataPoint[];
};

function getTargetDates(): { ytd: string; oneMonth: string; oneYear: string } {
  const now = new Date();
  const ytd = `${now.getFullYear()}-01-01`;

  const om = new Date(now);
  om.setDate(om.getDate() - 30);
  const oneMonth = om.toISOString().split("T")[0];

  const oy = new Date(now);
  oy.setFullYear(oy.getFullYear() - 1);
  const oneYear = oy.toISOString().split("T")[0];

  return { ytd, oneMonth, oneYear };
}

export default function PortfolioGrowthPeriods() {
  const { holdings, exchangeRates, quotes } = usePortfolio();
  const { t } = useI18n();
  const track = useTrack();
  const tracked = useRef(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    ytd: number | null;
    oneMonth: number | null;
    oneYear: number | null;
  }>({ ytd: null, oneMonth: null, oneYear: null });

  const tickers = useMemo(
    () => [...new Set(holdings.map((h) => h.ticker))],
    [holdings]
  );

  const currentEquityEUR = useMemo(() => {
    let sum = 0;
    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (q && q.regularMarketPrice > 0) {
        sum += convertToEUR(
          h.shares * q.regularMarketPrice,
          h.displayCurrency,
          exchangeRates
        );
      } else {
        sum += h.valueInEUR;
      }
    }
    return sum;
  }, [holdings, quotes, exchangeRates]);

  const fetchHistorical = useCallback(
    async (symbol: string): Promise<HistoricalDataPoint[]> => {
      const params = new URLSearchParams({ symbol, period: "1y", provider: "yahoo" });
      const res = await fetch(`/api/historical?${params}`);
      if (!res.ok) return [];
      const json = (await res.json()) as HistoricalApiResponse | HistoricalDataPoint[];
      if (Array.isArray(json)) return json;
      return json.data || [];
    },
    []
  );

  useEffect(() => {
    if (tickers.length === 0) {
      setResults({ ytd: null, oneMonth: null, oneYear: null });
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
          }))
        );

        if (cancelled) return;

        const dates = getTargetDates();
        const valueYTD = calculatePortfolioValueOnDate(entries, dates.ytd, exchangeRates);
        const value1M = calculatePortfolioValueOnDate(entries, dates.oneMonth, exchangeRates);
        const value1Y = calculatePortfolioValueOnDate(entries, dates.oneYear, exchangeRates);

        setResults({
          ytd: calculatePeriodReturn(currentEquityEUR, valueYTD),
          oneMonth: calculatePeriodReturn(currentEquityEUR, value1M),
          oneYear: calculatePeriodReturn(currentEquityEUR, value1Y),
        });
      } catch {
        setResults({ ytd: null, oneMonth: null, oneYear: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tickers, holdings, exchangeRates, currentEquityEUR, fetchHistorical]);

  useEffect(() => {
    if (!tracked.current && !loading && (results.ytd !== null || results.oneMonth !== null || results.oneYear !== null)) {
      tracked.current = true;
      track("portfolio_period_returns_viewed", { periods: "ytd,1m,1y" });
    }
  }, [loading, results, track]);

  if (holdings.length === 0) return null;

  const periods: { label: string; value: number | null }[] = [
    { label: t("ytd"), value: results.ytd },
    { label: t("oneMonth"), value: results.oneMonth },
    { label: t("oneYear"), value: results.oneYear },
  ];

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {t("portfolioGrowth")}
      </h3>
      <div className="grid grid-cols-3 gap-3">
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

          return (
            <div
              key={p.label}
              className={`${bg} rounded-xl p-3 text-center`}
              title={t("growthCaveat")}
            >
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">
                {p.label}
              </p>
              <p className={`text-xl font-bold ${color} ${loading ? "animate-pulse" : ""}`}>
                {loading ? "—" : hasValue ? formatPercent(p.value!) : "—"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 text-center">
        {t("growthCaveat")}
      </p>
    </div>
  );
}
