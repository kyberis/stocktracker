"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTrack } from "@/lib/use-track";
import { formatPercent } from "@/lib/utils";
import { reportDateFromEarningsEventKey } from "@/lib/aid/earnings-keys";
import type { AidDigestItem } from "@/lib/types";
import { withDigestImpactScore, sortByImpactScore } from "@/lib/aid/impact-score";
import AidImpactBadge from "./AidImpactBadge";

export default function AidEarningsRecap({ hasHoldings }: { hasHoldings: boolean }) {
  const { t } = useI18n();
  const { quotes, activePortfolioId } = usePortfolio();
  const track = useTrack();
  const [items, setItems] = useState<AidDigestItem[]>([]);
  const [lookbackDays, setLookbackDays] = useState(21);
  const [loading, setLoading] = useState(false);
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!hasHoldings) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/aid/earnings-recap?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("earnings recap failed");
      const data = (await res.json()) as { items?: AidDigestItem[]; lookbackDays?: number };
      const raw = Array.isArray(data.items) ? data.items : [];
      setItems(sortByImpactScore(raw.map((item) => withDigestImpactScore(item))));
      setLookbackDays(data.lookbackDays ?? 21);
      track("aid_earnings_recap_loaded", { count: String((data.items ?? []).length) });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [hasHoldings, activePortfolioId, track]);

  const refreshTicker = useCallback(
    async (ticker: string) => {
      setRefreshingTicker(ticker);
      try {
        track("aid_earnings_recap_refresh", { ticker });
        const res = await fetch("/api/aid/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, portfolioId: activePortfolioId }),
        });
        if (!res.ok) throw new Error("refresh failed");
        await load();
      } catch {
        setError(true);
      } finally {
        setRefreshingTicker(null);
      }
    },
    [activePortfolioId, load, track],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!hasHoldings) return null;

  return (
    <section id="aid-earnings" className="card rounded-[var(--radius-card)] border border-amber-500/20 bg-amber-500/[0.03] p-4" aria-label={t("aidEarningsRecapTitle")}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidEarningsRecapTitle")}</h3>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
            {t("aidEarningsRecapDesc").replace("{days}", String(lookbackDays))}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-9 rounded-full border border-[color:var(--border)] px-3 text-[11px] font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
        >
          {loading ? t("loading") : t("aidEarningsRecapRefresh")}
        </button>
      </div>

      <p className="mb-3 text-[10px] text-[color:var(--muted)]">{t("aidEarningsRecapCacheNote")}</p>

      {loading && items.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("aidEarningsRecapLoading")}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm text-red-500">{t("portfolioNewsError")}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]">{t("aidEarningsRecapEmpty")}</p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const reportDate = reportDateFromEarningsEventKey(item.eventKey);
          const move = item.movePct;
          const moveColor =
            move == null ? "text-[color:var(--muted)]" : move >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500";
          return (
            <li key={item.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[color:var(--foreground)]">{item.ticker}</span>
                {reportDate && (
                  <span className="text-[10px] text-[color:var(--muted)]">
                    {t("aidEarningsRecapReported").replace("{date}", reportDate)}
                  </span>
                )}
                {move != null && (
                  <span className={`text-xs font-semibold tabular-nums ${moveColor}`}>
                    {move >= 0 ? "+" : ""}
                    {formatPercent(move)}
                  </span>
                )}
                {item.usedWeb && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("aidWebSaved")}
                  </span>
                )}
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                  {t("aidFilterEarnings")}
                </span>
                <AidImpactBadge impact={item.impact} impactScore={item.impactScore} />
                <button
                  type="button"
                  onClick={() => void refreshTicker(item.ticker)}
                  disabled={refreshingTicker === item.ticker}
                  className="ml-auto min-h-8 rounded-full border border-[color:var(--border)] px-2 text-[10px] font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
                >
                  {refreshingTicker === item.ticker ? "…" : t("aidRefreshWeb")}
                </button>
              </div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{item.headline}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[color:var(--muted)]">
                {item.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
