"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { convertToEUR, formatCurrency, formatPercent } from "@/lib/utils";
import type { Holding } from "@/lib/types";

export default function HomeMoversCard({ holdings }: { holdings: Holding[] }) {
  const { t } = useI18n();
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();

  const movers = useMemo(() => {
    return holdings
      .map((h) => {
        const q = quotes[h.ticker];
        const pct = q?.regularMarketChangePercent ?? null;
        if (pct == null || q == null) return null;
        const dayChange = (q.regularMarketPrice - q.regularMarketPreviousClose) * h.shares;
        const eurImpact = convertToEUR(dayChange, q.currency || h.displayCurrency || "EUR", exchangeRates);
        return { ticker: h.ticker, name: h.name, pct, eurImpact };
      })
      .filter((m): m is NonNullable<typeof m> => m != null)
      .sort((a, b) => Math.abs(b.eurImpact) - Math.abs(a.eurImpact) || Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 5);
  }, [holdings, quotes, exchangeRates]);

  if (movers.length === 0) return null;

  return (
    <section className="card h-full rounded-[var(--radius-card)] p-4" aria-label={t("homeV2MoversTitle")}>
      <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2MoversTitle")}</h2>
      <p className="mt-0.5 text-xs text-[color:var(--muted)]">{t("homeV2MoversSubtitle")}</p>
      <ul className="mt-3 space-y-2">
        {movers.map((m) => {
          const up = m.pct >= 0;
          return (
            <li
              key={m.ticker}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold text-[color:var(--foreground)]">{m.ticker}</div>
                <div className="truncate text-[11px] text-[color:var(--muted)]">{m.name}</div>
              </div>
              <div className={`text-right text-sm font-semibold tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                <div>
                  {up ? "▲" : "▼"} {formatPercent(m.pct)}
                </div>
                <div className="text-[11px] font-medium text-[color:var(--muted)]">
                  {formatCurrency(m.eurImpact, activePortfolioCurrency)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
