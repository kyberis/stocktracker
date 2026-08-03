"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import type { Holding } from "@/lib/types";

type CatalystRow = {
  ticker: string;
  label: string;
  badge: "earnings" | "dividend" | "other";
  date: string;
};

export default function HomeCatalystsCard({
  holdings,
  showEmpty = false,
}: {
  holdings: Holding[];
  showEmpty?: boolean;
}) {
  const { t } = useI18n();
  const { activePortfolioId } = usePortfolio();
  const [rows, setRows] = useState<CatalystRow[]>([]);

  useEffect(() => {
    if (holdings.length === 0) {
      setRows([]);
      return;
    }
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    const params = new URLSearchParams({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
    if (activePortfolioId) params.set("portfolioId", activePortfolioId);
    let cancelled = false;
    fetch(`/api/events?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => {
        if (cancelled) return;
        const holdingSet = new Set(holdings.map((h) => h.ticker.toUpperCase()));
        const events = Array.isArray(data.events) ? data.events : [];
        const mapped: CatalystRow[] = events
          .map((ev: { symbol?: string; title?: string; type?: string; date?: string; event_date?: string }) => {
            const ticker = (ev.symbol || "").toUpperCase();
            if (!ticker || !holdingSet.has(ticker)) return null;
            const type = String(ev.type || "").toLowerCase();
            const date = String(ev.date || ev.event_date || "").slice(0, 10);
            const badge: CatalystRow["badge"] = type.includes("earn")
              ? "earnings"
              : type.includes("div")
                ? "dividend"
                : "other";
            const label =
              badge === "earnings"
                ? t("homeV2CatalystEarnings")
                : badge === "dividend"
                  ? t("homeV2CatalystDividend")
                  : ev.title || type || t("homeV2CatalystOther");
            return { ticker, label, badge, date };
          })
          .filter((r: CatalystRow | null): r is CatalystRow => r != null)
          .slice(0, 5);
        setRows(mapped);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [holdings, activePortfolioId, t]);

  if (rows.length === 0 && !showEmpty) return null;

  if (rows.length === 0) {
    return (
      <section className="card h-full rounded-[var(--radius-card)] p-4" aria-label={t("homeV2CatalystsTitle")}>
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2CatalystsTitle")}</h2>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">{t("homeV2CatalystsSubtitle")}</p>
        <p className="mt-3 text-sm text-[color:var(--muted)]">{t("noUpcomingEventsDesc")}</p>
      </section>
    );
  }

  return (
    <section className="card h-full rounded-[var(--radius-card)] p-4" aria-label={t("homeV2CatalystsTitle")}>
      <h2 className="text-sm font-semibold text-[color:var(--foreground)]">{t("homeV2CatalystsTitle")}</h2>
      <p className="mt-0.5 text-xs text-[color:var(--muted)]">{t("homeV2CatalystsSubtitle")}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={`${r.ticker}-${r.date}-${r.badge}`}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold text-[color:var(--foreground)]">{r.ticker}</div>
              <div className="truncate text-[11px] text-[color:var(--muted)]">
                {r.label}
                {r.date ? ` · ${r.date}` : ""}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                r.badge === "earnings"
                  ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                  : r.badge === "dividend"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              {r.badge === "earnings"
                ? t("homeV2BadgeEarnings")
                : r.badge === "dividend"
                  ? t("homeV2BadgeDividend")
                  : t("homeV2BadgeCatalyst")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
