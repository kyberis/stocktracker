"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import {
  computeEstimatedDividends,
  computeTotalEstimatedEUR,
  computeEstimatedYield,
} from "@/lib/services/dividend-calculator";
import { computeDividendYieldByAssetType } from "@/lib/aid/dividends-by-type";
import { formatCurrency, formatPercent } from "@/lib/utils";
import AidModalShell from "./AidModalShell";

type DivTab = "month" | "upcoming" | "yield";

export default function AidDividendsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const [tab, setTab] = useState<DivTab>("month");

  const estimated = useMemo(
    () => computeEstimatedDividends(holdings, quotes, exchangeRates),
    [holdings, quotes, exchangeRates],
  );
  const monthTotal = useMemo(() => computeTotalEstimatedEUR(estimated), [estimated]);
  const portfolioYield = useMemo(
    () => computeEstimatedYield(holdings, quotes, exchangeRates, monthTotal),
    [holdings, quotes, exchangeRates, monthTotal],
  );
  const yieldByType = useMemo(
    () => computeDividendYieldByAssetType(holdings, quotes, exchangeRates),
    [holdings, quotes, exchangeRates],
  );
  const [upcoming, setUpcoming] = useState<Array<{ ticker: string; exDate: string }>>([]);

  useEffect(() => {
    if (!open || tab !== "upcoming") return;
    const tickers = [...new Set(holdings.map((h) => h.ticker))].join(",");
    if (!tickers) return;
    fetch(`/api/ex-dividend?tickers=${encodeURIComponent(tickers)}`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => {
        const events = Array.isArray(data.events) ? data.events : [];
        setUpcoming(
          events.slice(0, 8).map((ev: { symbol?: string; ticker?: string; date?: string; exDate?: string }) => ({
            ticker: ev.symbol ?? ev.ticker ?? "—",
            exDate: ev.date ?? ev.exDate ?? "—",
          })),
        );
      })
      .catch(() => setUpcoming([]));
  }, [open, tab, holdings]);

  const tabs: { id: DivTab; label: string }[] = [
    { id: "month", label: t("aidDivThisMonth") },
    { id: "upcoming", label: t("aidDivUpcoming") },
    { id: "yield", label: t("aidDivYield") },
  ];

  const fmt = (v: number) => (stealthMode ? "•••" : formatCurrency(v, activePortfolioCurrency));

  return (
    <AidModalShell open={open} onClose={onClose} title={t("aidDividends")} ariaLabel={t("aidDividends")}>
      <div className="p-4 space-y-4">
        <div className="flex gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5" role="tablist">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 min-h-9 rounded-full px-2 text-[11px] font-semibold transition-colors ${
                tab === id
                  ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                  : "text-[color:var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "month" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
              <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{t("aidDivEstIncome")}</div>
              <div className="text-xl font-semibold tabular-nums text-[color:var(--foreground)]">{fmt(monthTotal)}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {t("aidDivPortfolioYield")}: {stealthMode ? "•••" : formatPercent(portfolioYield)}
              </div>
            </div>
            <ul className="space-y-1.5 text-xs">
              {estimated.slice(0, 8).map((row) => (
                <li key={row.ticker} className="flex justify-between gap-2">
                  <span className="font-medium text-[color:var(--foreground)]">{row.ticker}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">{fmt(row.annualIncomeEUR / 12)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "upcoming" && (
          <ul className="space-y-2 text-xs">
            {upcoming.map((ev) => (
              <li key={`${ev.ticker}-${ev.exDate}`} className="flex justify-between gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2">
                <span className="font-medium text-[color:var(--foreground)]">{ev.ticker}</span>
                <span className="text-[color:var(--muted)]">{ev.exDate}</span>
              </li>
            ))}
            {upcoming.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">{t("aidDivNoUpcoming")}</p>
            )}
          </ul>
        )}

        {tab === "yield" && (
          <div className="space-y-3">
            <ul className="space-y-1.5 text-xs">
              {yieldByType.map((row) => (
                <li key={row.typeKey} className="flex justify-between gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2">
                  <span className="font-medium text-[color:var(--foreground)]">{row.label}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">
                    {stealthMode ? "•••" : formatPercent(row.portfolioYield)}
                  </span>
                </li>
              ))}
              {yieldByType.length === 0 && (
                <p className="text-sm text-[color:var(--muted)]">{t("aidDivNoYield")}</p>
              )}
            </ul>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t("aidDivTopPayers")}</p>
            <ul className="space-y-1.5 text-xs">
              {estimated
                .slice()
                .sort((a, b) => b.dividendYield - a.dividendYield)
                .slice(0, 8)
                .map((row) => (
                  <li key={row.ticker} className="flex justify-between gap-2">
                    <span className="font-medium text-[color:var(--foreground)]">{row.ticker}</span>
                    <span className="tabular-nums text-[color:var(--muted)]">
                      {stealthMode ? "•••" : formatPercent(row.dividendYield)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <Link
          href="/?tab=dividends"
          className="block text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t("aidDivOpenFull")}
        </Link>
      </div>
    </AidModalShell>
  );
}
