"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, formatCurrency } from "@/lib/utils";
import { useUpcomingExDividends } from "@/hooks/use-upcoming-ex-dividends";

export default function ExDividendCalendar() {
  const { t } = useI18n();
  const { holdings, exchangeRates } = usePortfolio();
  const { events, loading, error } = useUpcomingExDividends(holdings);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // Build shares map for Est. Total calculation
  const sharesMap = useMemo(() => {
    const m: Record<string, number> = {};
    holdings.forEach((h) => { m[h.ticker] = (m[h.ticker] || 0) + h.shares; });
    return m;
  }, [holdings]);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("exDividendCalendarTitle")}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" aria-hidden="true" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("exDividendCalendarTitle")}</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("exDividendCalendarNoProvider")}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("exDividendCalendarTitle")}</h3>
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("exDividendCalendarEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("exDividendCalendarTitle")}</h3>
      {/* financial disclaimer per legal-advisor skill */}
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-3">
        {t("financialDataDisclaimer")}
      </p>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs" aria-label={t("exDividendCalendarTitle")}>
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              <th scope="col" className="text-left py-1.5 px-1 font-medium text-gray-500 dark:text-slate-400">{t("ticker")}</th>
              <th scope="col" className="text-left py-1.5 px-1 font-medium text-gray-500 dark:text-slate-400">{t("exDividendDate")}</th>
              <th scope="col" className="text-left py-1.5 px-1 font-medium text-gray-500 dark:text-slate-400">{t("paymentDate")}</th>
              <th scope="col" className="text-right py-1.5 px-1 font-medium text-gray-500 dark:text-slate-400">{t("amountPerShare")}</th>
              <th scope="col" className="text-right py-1.5 px-1 font-medium text-gray-500 dark:text-slate-400">{t("estTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const shares = sharesMap[ev.symbol] ?? 0;
              const grossIncome = ev.amount * shares;
              // financial-calculations skill: convertToEUR, guard missing rate
              const estTotalEUR = grossIncome > 0
                ? convertToEUR(grossIncome, ev.currency, exchangeRates)
                : null;
              const isExpanded = expandedTicker === ev.symbol;

              return (
                <tr
                  key={`${ev.symbol}-${ev.exDividendDate}`}
                  className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => setExpandedTicker(isExpanded ? null : ev.symbol)}
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedTicker(isExpanded ? null : ev.symbol);
                    }
                  }}
                >
                  <td className="py-2 px-1 font-mono font-medium text-gray-900 dark:text-white">
                    {ev.symbol}
                  </td>
                  <td className="py-2 px-1 text-gray-700 dark:text-slate-300">
                    {ev.exDividendDate}
                  </td>
                  <td className="py-2 px-1 text-gray-500 dark:text-slate-400">
                    {ev.paymentDate || "—"}
                  </td>
                  <td className="py-2 px-1 text-right font-mono text-gray-900 dark:text-white">
                    {ev.amount > 0 ? `${ev.amount.toFixed(4)} ${ev.currency}` : "—"}
                  </td>
                  <td className="py-2 px-1 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {estTotalEUR != null
                      ? formatCurrency(estTotalEUR, "EUR")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
