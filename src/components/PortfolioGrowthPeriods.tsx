"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import { convertCurrency, formatPercent } from "@/lib/utils";

const BlurredProSection = dynamic(() => import("./BlurredProSection"), { ssr: false });
import TierFeatureBadge from "./TierFeatureBadge";
import {
  calculatePortfolioValueOnDate,
  calculatePeriodReturn,
  type HoldingSeriesEntry,
} from "@/lib/performance";
import type { HistoricalDataPoint, Holding } from "@/lib/types";

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

interface Props {
  holdings?: Holding[];
}

export default function PortfolioGrowthPeriods({ holdings: holdingsProp }: Props) {
  const { holdings: ctxHoldings, exchangeRates, quotes, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const holdings = holdingsProp ?? ctxHoldings;
  const { t } = useI18n();
  const { user } = useAuth();
  const track = useTrack();
  const isPaid = user?.plan === "pro";
  const tracked = useRef(false);

  const [showHelp, setShowHelp] = useState(false);
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
        sum += convertCurrency(
          h.shares * q.regularMarketPrice,
          h.displayCurrency,
          baseCurrency,
          exchangeRates
        );
      } else {
        sum += convertCurrency(h.valueInEUR, "EUR", baseCurrency, exchangeRates);
      }
    }
    return sum;
  }, [holdings, quotes, exchangeRates, baseCurrency]);

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
    if (!isPaid || tickers.length === 0) {
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
        const valueYTD = calculatePortfolioValueOnDate(entries, dates.ytd, exchangeRates, baseCurrency);
        const value1M = calculatePortfolioValueOnDate(entries, dates.oneMonth, exchangeRates, baseCurrency);
        const value1Y = calculatePortfolioValueOnDate(entries, dates.oneYear, exchangeRates, baseCurrency);

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
  }, [isPaid, tickers, holdings, exchangeRates, currentEquityEUR, fetchHistorical, baseCurrency]);

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
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          {t("portfolioGrowth")}
          <TierFeatureBadge requiredPlan="pro" size="sm" />
          <button
          onClick={() => setShowHelp((v) => !v)}
          className="ml-auto p-1 rounded-full text-gray-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={t("portfolioGrowth")}
          title={t("portfolioGrowth")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </h3>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{t("portfolioGrowthSubtitle")}</p>
      </div>

      {showHelp && (
        <div className="mb-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-3 space-y-2.5 text-xs">
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{t("ytd")}</p>
            <p className="text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px]">{t("growthHelpYtd")}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{t("oneMonth")}</p>
            <p className="text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px]">{t("growthHelpOneMonth")}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{t("oneYear")}</p>
            <p className="text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px]">{t("growthHelpOneYear")}</p>
          </div>
          <p className="text-gray-500 dark:text-slate-500 text-[10px] italic pt-1 border-t border-gray-200 dark:border-slate-700">{t("growthCaveat")}</p>
        </div>
      )}

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

          const formatted = hasValue ? formatPercent(p.value!) : "—";
          const longValue = formatted.length > 7;

          return (
            <div
              key={p.label}
              className={`${bg} rounded-xl p-3 text-center`}
              title={t("growthCaveat")}
            >
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase mb-1">
                {p.label}
              </p>
              <p className={`${longValue ? "text-base" : "text-lg"} font-bold tabular-nums ${color} ${loading ? "animate-value-shimmer" : ""}`}>
                {loading ? "—" : formatted}
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
