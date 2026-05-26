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
      className="card cursor-pointer p-3 transition-colors hover:border-emerald-400/28"
      onClick={onNavigateToDividends}
      role={onNavigateToDividends ? "button" : undefined}
      tabIndex={onNavigateToDividends ? 0 : undefined}
      onKeyDown={onNavigateToDividends ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateToDividends(); } } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">
          {t("v2Dividends")}
        </p>
        {onNavigateToDividends && (
          <span className="text-[11px] font-medium text-emerald-400 hover:underline">
            {t("v2ViewAll")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-[16px] border border-emerald-500/14 bg-emerald-500/[0.05] px-2.5 py-2">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {t("v2DivReceived")}
          </p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-400">
            {ytdReceived === null
              ? "--"
              : stealthMode
                ? "•••••"
                : formatCurrency(ytdReceived, cur)}
          </p>
          <p className="mt-0.5 text-[9px] text-[color:var(--muted)]">
            {thisYear} YTD
          </p>
        </div>
        <div className="rounded-[16px] border border-amber-500/14 bg-amber-500/[0.05] px-2.5 py-2">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {t("v2DivEstimated")}
          </p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-amber-300">
            {stealthMode ? "•••••" : formatCurrency(estimatedAnnual, cur)}
          </p>
          <p className="mt-0.5 text-[9px] text-[color:var(--muted)]">
            {t("v2DivFullYear")}
          </p>
        </div>
      </div>
    </div>
  );
}
