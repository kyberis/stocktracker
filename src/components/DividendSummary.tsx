"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

export default function DividendSummary() {
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates } = usePortfolio();
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/api/transactions").then((r) => r.ok ? r.json() : []).then(setTxs);
  }, []);

  const dividendTxs = txs.filter((tx) => tx.type === "dividend");
  const totalDividends = dividendTxs.reduce((s, tx) => s + tx.totalAmount, 0);

  const thisYear = new Date().getFullYear();
  const annualDividends = dividendTxs
    .filter((tx) => tx.date.startsWith(String(thisYear)))
    .reduce((s, tx) => s + tx.totalAmount, 0);

  const totalPortfolioValue = holdings.reduce((s, h) => {
    const q = quotes[h.ticker];
    return s + (q ? h.shares * q.regularMarketPrice : 0);
  }, 0);
  const yieldPercent = totalPortfolioValue > 0 ? (annualDividends / totalPortfolioValue) * 100 : 0;

  const byMonth: Record<string, number> = {};
  dividendTxs.forEach((tx) => {
    const key = tx.date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + tx.totalAmount;
  });
  const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

  const byTicker: Record<string, number> = {};
  dividendTxs.forEach((tx) => {
    byTicker[tx.ticker] = (byTicker[tx.ticker] || 0) + tx.totalAmount;
  });
  const topDividendPayers = Object.entries(byTicker).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (dividendTxs.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("dividends")}</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noDividends")}</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("dividends")}</h3>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly calendar */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">{t("dividendCalendar")}</p>
          <div className="space-y-1">
            {months.map(([month, amount]) => (
              <div key={month} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-slate-400">{month}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (amount / Math.max(...months.map(m => m[1]))) * 100)}%` }} />
                  </div>
                  <span className="font-mono text-gray-900 dark:text-white w-16 text-right">{formatCurrency(amount, "EUR")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top payers */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">{t("dividendIncome")} by Stock</p>
          <div className="space-y-1">
            {topDividendPayers.map(([ticker, amount]) => (
              <div key={ticker} className="flex items-center justify-between text-xs">
                <span className="font-mono font-medium text-gray-700 dark:text-slate-300">{ticker}</span>
                <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(amount, "EUR")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
