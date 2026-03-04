"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

const GROWTH_RATE = 0.10;
const PROJECTION_YEARS = 5;

interface EstimatedDividend {
  ticker: string;
  name: string;
  shares: number;
  annualDividendPerShare: number;
  dividendYield: number;
  annualIncome: number;
  currency: string;
  annualIncomeEUR: number;
}

export default function DividendSummary() {
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates } = usePortfolio();
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  }, []);

  const dividendTxs = useMemo(() => txs.filter((tx) => tx.type === "dividend"), [txs]);
  const totalDividends = useMemo(() => dividendTxs.reduce((s, tx) => s + tx.totalAmount, 0), [dividendTxs]);

  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;

  const annualDividends = useMemo(
    () => dividendTxs.filter((tx) => tx.date.startsWith(String(thisYear))).reduce((s, tx) => s + tx.totalAmount, 0),
    [dividendTxs, thisYear]
  );

  const totalPortfolioValue = useMemo(
    () => holdings.reduce((s, h) => {
      const q = quotes[h.ticker];
      return s + (q ? h.shares * q.regularMarketPrice : 0);
    }, 0),
    [holdings, quotes]
  );
  const yieldPercent = totalPortfolioValue > 0 ? (annualDividends / totalPortfolioValue) * 100 : 0;

  // --- Estimated dividends from current holdings ---
  const estimated = useMemo<EstimatedDividend[]>(() => {
    const items: EstimatedDividend[] = [];
    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (!q) continue;
      const rate = q.trailingAnnualDividendRate;
      if (!rate || rate <= 0) continue;
      const yld = q.trailingAnnualDividendYield ?? 0;
      const annualIncome = h.shares * rate;
      const cur = q.currency || h.displayCurrency || "USD";
      const rateToEUR = cur === "EUR" ? 1 : (exchangeRates[`${cur}_EUR`] || (1 / (exchangeRates[`EUR_${cur}`] || 1)));
      items.push({
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        annualDividendPerShare: rate,
        dividendYield: yld * 100,
        annualIncome,
        currency: cur,
        annualIncomeEUR: annualIncome * rateToEUR,
      });
    }
    items.sort((a, b) => b.annualIncomeEUR - a.annualIncomeEUR);
    return items;
  }, [holdings, quotes, exchangeRates]);

  const totalEstimatedEUR = useMemo(() => estimated.reduce((s, e) => s + e.annualIncomeEUR, 0), [estimated]);
  const estimatedYieldPercent = useMemo(() => {
    const totalValue = holdings.reduce((s, h) => {
      const q = quotes[h.ticker];
      if (!q) return s;
      const cur = q.currency || h.displayCurrency || "USD";
      const rateToEUR = cur === "EUR" ? 1 : (exchangeRates[`${cur}_EUR`] || (1 / (exchangeRates[`EUR_${cur}`] || 1)));
      return s + h.shares * q.regularMarketPrice * rateToEUR;
    }, 0);
    return totalValue > 0 ? (totalEstimatedEUR / totalValue) * 100 : 0;
  }, [holdings, quotes, exchangeRates, totalEstimatedEUR]);

  // --- Yearly breakdown (from transactions) ---
  const byYear = useMemo(() => {
    const map: Record<number, number> = {};
    dividendTxs.forEach((tx) => {
      const y = parseInt(tx.date.slice(0, 4), 10);
      if (!isNaN(y)) map[y] = (map[y] || 0) + tx.totalAmount;
    });
    return Object.entries(map)
      .map(([y, amt]) => ({ year: Number(y), amount: amt }))
      .sort((a, b) => a.year - b.year);
  }, [dividendTxs]);

  // --- Monthly calendar (last 12 months) ---
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    dividendTxs.forEach((tx) => {
      const key = tx.date.slice(0, 7);
      map[key] = (map[key] || 0) + tx.totalAmount;
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [dividendTxs]);

  // --- Top payers (from transactions) ---
  const topDividendPayers = useMemo(() => {
    const map: Record<string, number> = {};
    dividendTxs.forEach((tx) => {
      map[tx.ticker] = (map[tx.ticker] || 0) + tx.totalAmount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [dividendTxs]);

  // --- Future projections ---
  const projections = useMemo(() => {
    let base: number;
    const currentYearData = byYear.find((y) => y.year === thisYear);
    const lastFullYear = byYear.filter((y) => y.year < thisYear).pop();

    if (lastFullYear && lastFullYear.amount > 0) {
      base = lastFullYear.amount;
    } else if (currentYearData && currentYearData.amount > 0) {
      base = (currentYearData.amount / thisMonth) * 12;
    } else {
      base = 0;
    }

    const rows: { year: number; amount: number; isProjection: boolean }[] = [];

    byYear.forEach((y) => rows.push({ year: y.year, amount: y.amount, isProjection: false }));

    if (base > 0) {
      let projected = lastFullYear ? lastFullYear.amount : base;
      if (currentYearData) {
        projected = currentYearData.amount > projected ? currentYearData.amount : projected;
      }

      for (let i = 1; i <= PROJECTION_YEARS; i++) {
        const y = thisYear + i;
        projected = projected * (1 + GROWTH_RATE);
        rows.push({ year: y, amount: projected, isProjection: true });
      }
    }

    return rows;
  }, [byYear, thisYear, thisMonth]);

  // --- Estimated projections (when no transactions, based on current holdings) ---
  const estimatedProjections = useMemo(() => {
    if (dividendTxs.length > 0 || totalEstimatedEUR <= 0) return [];
    const rows: { year: number; amount: number; isProjection: boolean }[] = [];
    rows.push({ year: thisYear, amount: totalEstimatedEUR, isProjection: false });
    let projected = totalEstimatedEUR;
    for (let i = 1; i <= PROJECTION_YEARS; i++) {
      projected = projected * (1 + GROWTH_RATE);
      rows.push({ year: thisYear + i, amount: projected, isProjection: true });
    }
    return rows;
  }, [dividendTxs.length, totalEstimatedEUR, thisYear]);

  const hasDividendTxs = dividendTxs.length > 0;
  const hasEstimatedDividends = estimated.length > 0;

  if (!hasDividendTxs && !hasEstimatedDividends) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("dividends")}</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noDividends")}</p>
      </div>
    );
  }

  const maxBarAmount = projections.length > 0
    ? Math.max(...projections.map((r) => r.amount), 1)
    : Math.max(...estimatedProjections.map((r) => r.amount), 1);

  return (
    <div className="space-y-6">
      {/* ── Estimated dividend income from holdings ── */}
      {hasEstimatedDividends && (
        <>
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {hasDividendTxs ? t("estimatedDividendIncome") : t("dividends")}
              </h3>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {t("estimatedLabel")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">{t("estAnnualIncome")}</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{formatCurrency(totalEstimatedEUR, "EUR")}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">{t("estMonthlyIncome")}</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalEstimatedEUR / 12, "EUR")}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">{t("dividendYield")}</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{estimatedYieldPercent.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {/* Per-stock breakdown */}
          <div className="card">
            <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("dividendByStock")}</p>
            <div className="space-y-1.5">
              {estimated.map((e, i) => (
                <div key={e.ticker} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 dark:text-slate-300 flex-1 min-w-0">
                    <span className="text-gray-400 dark:text-slate-500 mr-1.5">{i + 1}.</span>
                    <span className="font-mono font-medium">{e.ticker}</span>
                    <span className="text-gray-400 dark:text-slate-500 ml-1.5">
                      {e.dividendYield > 0 ? `${e.dividendYield.toFixed(1)}%` : ""}
                    </span>
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.min(100, (e.annualIncomeEUR / Math.max(estimated[0]?.annualIncomeEUR || 1, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-gray-900 dark:text-white w-20 text-right">{formatCurrency(e.annualIncomeEUR, "EUR")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated projections */}
          {estimatedProjections.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("dividendProjection")}</p>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {t("basedOnGrowthAssumption")}
                </span>
              </div>
              <div className="space-y-1.5">
                {estimatedProjections.map(({ year, amount, isProjection }) => (
                  <div key={year} className="flex items-center justify-between text-xs">
                    <span className={`font-medium w-10 ${isProjection ? "text-indigo-500 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {year}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isProjection ? "bg-indigo-400 dark:bg-indigo-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, (amount / maxBarAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-mono w-20 text-right ${isProjection ? "text-indigo-600 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                      {formatCurrency(amount, "EUR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Recorded dividend history (transactions) ── */}
      {hasDividendTxs && (
        <>
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {hasEstimatedDividends ? t("recordedDividends") : t("dividends")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium uppercase">{t("totalDividends")}</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{formatCurrency(totalDividends, "EUR")}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">{t("annualDividendIncome")}</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(annualDividends, "EUR")}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">{t("dividendYield")}</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{yieldPercent.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {/* Yearly income + Top payers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("yearlyDividendIncome")}</p>
              <div className="space-y-1.5">
                {byYear.map(({ year, amount }) => (
                  <div key={year} className="flex items-center justify-between text-xs">
                    <span className={`font-medium w-10 ${year === thisYear ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-slate-400"}`}>
                      {year}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${year === thisYear ? "bg-emerald-500" : "bg-violet-500"}`}
                          style={{ width: `${Math.min(100, (amount / maxBarAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-gray-900 dark:text-white w-20 text-right">{formatCurrency(amount, "EUR")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("dividendIncome")} by Stock</p>
              <div className="space-y-1.5">
                {topDividendPayers.map(([ticker, amount], i) => (
                  <div key={ticker} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-slate-300">
                      <span className="text-gray-400 dark:text-slate-500 mr-1.5">{i + 1}.</span>
                      <span className="font-mono font-medium">{ticker}</span>
                    </span>
                    <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(amount, "EUR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dividend Projection */}
          {projections.some((r) => r.isProjection) && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("dividendProjection")}</p>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {t("basedOnGrowthAssumption")}
                </span>
              </div>
              <div className="space-y-1.5">
                {projections.map(({ year, amount, isProjection }) => (
                  <div key={year} className="flex items-center justify-between text-xs">
                    <span className={`font-medium w-10 ${isProjection ? "text-indigo-500 dark:text-indigo-400" : year === thisYear ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-slate-400"}`}>
                      {year}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isProjection ? "bg-indigo-400 dark:bg-indigo-500" : year === thisYear ? "bg-emerald-500" : "bg-violet-500"}`}
                          style={{ width: `${Math.min(100, (amount / maxBarAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-mono w-20 text-right ${isProjection ? "text-indigo-600 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                      {formatCurrency(amount, "EUR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly calendar */}
          {byMonth.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">{t("dividendCalendar")}</p>
              <div className="space-y-1">
                {byMonth.map(([month, amount]) => (
                  <div key={month} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-slate-400">{month}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${Math.min(100, (amount / Math.max(...byMonth.map((m) => m[1]))) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-gray-900 dark:text-white w-16 text-right">{formatCurrency(amount, "EUR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
