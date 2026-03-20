"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useStealthMode } from "@/lib/stealth-context";
import { formatCurrency } from "@/lib/utils";
import {
  computeEstimatedDividends,
  computeTotalEstimatedEUR,
  sumAnnualDividends,
  filterDividendTransactions,
} from "@/lib/services/dividend-calculator";
import { convertCurrency } from "@/lib/utils";
import type { Holding, CashEntry, Transaction } from "@/lib/types";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
  onNavigateToDividends?: () => void;
}

export default function CompactDividendCard({ holdings, cashEntries, onNavigateToDividends }: Props) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency, demoMode } = usePortfolio();
  const { user } = useAuth();
  const { stealthMode } = useStealthMode();
  const [ytdReceived, setYtdReceived] = useState<number | null>(null);

  const thisYear = new Date().getFullYear();
  const cur = activePortfolioCurrency;

  useEffect(() => {
    if (demoMode || !user) {
      setYtdReceived(284.5);
      return;
    }

    fetch("/api/transactions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Transaction[]) => {
        const divTxs = filterDividendTransactions(Array.isArray(data) ? data : []);
        const amount = sumAnnualDividends(divTxs, thisYear);
        setYtdReceived(amount);
      })
      .catch(() => setYtdReceived(0));
  }, [demoMode, user, thisYear]);

  const estimatedAnnualEUR = useMemo(() => {
    const estimated = computeEstimatedDividends(holdings, quotes, exchangeRates);
    return computeTotalEstimatedEUR(estimated);
  }, [holdings, quotes, exchangeRates]);

  const estimatedAnnual = useMemo(
    () => convertCurrency(estimatedAnnualEUR, "EUR", cur, exchangeRates),
    [estimatedAnnualEUR, cur, exchangeRates],
  );

  const hasData = estimatedAnnual > 0 || (ytdReceived !== null && ytdReceived > 0);
  if (!hasData) return null;

  return (
    <div
      className="card p-3 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-colors"
      onClick={onNavigateToDividends}
      role={onNavigateToDividends ? "button" : undefined}
      tabIndex={onNavigateToDividends ? 0 : undefined}
      onKeyDown={onNavigateToDividends ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateToDividends(); } } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-900 dark:text-white">
          {t("v2Dividends")}
        </p>
        {onNavigateToDividends && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
            {t("v2ViewAll")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] px-2.5 py-2">
          <p className="text-[9px] font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wide">
            {t("v2DivReceived")}
          </p>
          <p className="text-sm font-bold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
            {ytdReceived === null
              ? "--"
              : stealthMode
                ? "•••••"
                : formatCurrency(ytdReceived, cur)}
          </p>
          <p className="text-[9px] text-gray-400 dark:text-slate-600 mt-0.5">
            {thisYear} YTD
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] px-2.5 py-2">
          <p className="text-[9px] font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wide">
            {t("v2DivEstimated")}
          </p>
          <p className="text-sm font-bold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
            {stealthMode ? "•••••" : formatCurrency(estimatedAnnual, cur)}
          </p>
          <p className="text-[9px] text-gray-400 dark:text-slate-600 mt-0.5">
            {t("v2DivFullYear")}
          </p>
        </div>
      </div>
    </div>
  );
}
