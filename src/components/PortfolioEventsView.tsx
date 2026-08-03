"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useUpcomingExDividends } from "@/hooks/use-upcoming-ex-dividends";
import HomeCatalystsCard from "@/components/homepage/HomeCatalystsCard";
import CompactEarningsCard from "@/components/dashboard-v2/CompactEarningsCard";
import EconomicIndicators from "@/components/EconomicIndicators";

/**
 * Full Events view (TRF-001): catalysts, earnings, ex-dividends, macro calendar.
 * Ex-dividends come from useUpcomingExDividends — the same hook /tools/dividends
 * uses (TRF-004-B / TRF-026) — so both surfaces always agree on the same set.
 */
export default function PortfolioEventsView() {
  const { t } = useI18n();
  const { holdings, demoMode } = usePortfolio();
  const { events } = useUpcomingExDividends(demoMode ? [] : holdings);

  const exDiv = useMemo(
    () =>
      events
        .map((ev) => ({
          ticker: ev.symbol.toUpperCase(),
          date: ev.exDividendDate.slice(0, 10),
          amount: ev.amount > 0 ? ev.amount : null,
          currency: ev.currency || null,
        }))
        .filter((r) => r.ticker && r.date)
        .slice(0, 40),
    [events],
  );

  return (
    <div className="space-y-6" data-testid="portfolio-events-view">
      <header>
        <h1 className="text-xl font-semibold text-[color:var(--foreground)]">{t("eventsTab")}</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{t("homeV2CatalystsSubtitle")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeCatalystsCard holdings={holdings} showEmpty />
        <CompactEarningsCard />
      </div>

      <section className="card rounded-[var(--radius-card)] p-4" aria-labelledby="events-exdiv-heading">
        <h2 id="events-exdiv-heading" className="text-sm font-semibold text-[color:var(--foreground)]">
          {t("exDividendCalendarTitle")}
        </h2>
        {exDiv.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">{t("exDividendCalendarEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--border)]">
            {exDiv.map((r) => (
              <li key={`${r.ticker}-${r.date}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium tabular-nums text-[color:var(--foreground)]">{r.ticker}</span>
                <span className="text-[color:var(--muted)]">{r.date}</span>
                <span className="tabular-nums text-[color:var(--foreground)]">
                  {r.amount != null && r.currency
                    ? `${r.amount.toFixed(4)} ${r.currency}`
                    : r.amount != null
                      ? String(r.amount)
                      : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EconomicIndicators />
    </div>
  );
}
