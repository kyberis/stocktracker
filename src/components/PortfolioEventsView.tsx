"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import HomeCatalystsCard from "@/components/homepage/HomeCatalystsCard";
import CompactEarningsCard from "@/components/dashboard-v2/CompactEarningsCard";
import EconomicIndicators from "@/components/EconomicIndicators";

type ExDivRow = {
  ticker: string;
  date: string;
  amount: number | null;
  currency: string | null;
};

/**
 * Full Events view (TRF-001): catalysts, earnings, ex-dividends, macro calendar.
 */
export default function PortfolioEventsView() {
  const { t } = useI18n();
  const { holdings, demoMode } = usePortfolio();
  const [exDiv, setExDiv] = useState<ExDivRow[]>([]);

  useEffect(() => {
    if (demoMode || holdings.length === 0) {
      setExDiv([]);
      return;
    }
    const tickers = holdings.map((h) => h.ticker).join(",");
    let cancelled = false;
    fetch(`/api/ex-dividend?tickers=${encodeURIComponent(tickers)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => {
        if (cancelled) return;
        const events = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
        setExDiv(
          events
            .map((ev: { symbol?: string; ticker?: string; exDate?: string; date?: string; amount?: number; currency?: string }) => ({
              ticker: String(ev.symbol || ev.ticker || "").toUpperCase(),
              date: String(ev.exDate || ev.date || "").slice(0, 10),
              amount: typeof ev.amount === "number" ? ev.amount : null,
              currency: ev.currency ? String(ev.currency) : null,
            }))
            .filter((r: ExDivRow) => r.ticker && r.date)
            .slice(0, 40),
        );
      })
      .catch(() => {
        if (!cancelled) setExDiv([]);
      });
    return () => {
      cancelled = true;
    };
  }, [holdings, demoMode]);

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
