"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useTrack } from "@/lib/use-track";
import { formatPercent } from "@/lib/utils";
import type { AidDigestItem } from "@/lib/types";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import { withDigestImpactScore, sortByImpactScore } from "@/lib/aid/impact-score";
import AidImpactBadge from "./AidImpactBadge";

type Filter = "all" | "earnings" | "move";

function matchesFilter(item: AidDigestItem, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "earnings") {
    return item.filterTags.includes("earnings") || item.eventKey.startsWith("earnings:");
  }
  if (filter === "move") {
    if (item.filterTags.includes("move")) return true;
    return item.movePct != null && Math.abs(item.movePct) >= 3;
  }
  return true;
}

export default function AidNewsDigest({ hasHoldings }: { hasHoldings: boolean }) {
  const { t } = useI18n();
  const { quotes, activePortfolioId, holdings } = usePortfolio();
  const track = useTrack();
  const [items, setItems] = useState<AidDigestItem[]>([]);
  const [newSinceVisitCount, setNewSinceVisitCount] = useState(0);
  const [earningsTodayCount, setEarningsTodayCount] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [newsTickerCount, setNewsTickerCount] = useState<number | null>(null);

  const derivedTickerCount = useMemo(
    () => derivePortfolioNewsTickersFromHoldings(holdings).length,
    [holdings],
  );

  const enrichItems = useCallback(
    (raw: AidDigestItem[]) =>
      sortByImpactScore(
        raw.map((item) => {
          const q = quotes[item.ticker];
          const movePct = q?.regularMarketChangePercent ?? item.movePct;
          return withDigestImpactScore({ ...item, movePct: movePct ?? null });
        }),
      ),
    [quotes],
  );

  const load = useCallback(async () => {
    if (!hasHoldings) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (activePortfolioId) params.set("portfolioId", activePortfolioId);
      const res = await fetch(`/api/aid/digest?${params}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("digest failed");
      const data = (await res.json()) as {
        items?: AidDigestItem[];
        earningsTodayCount?: number;
        newsTickers?: string[];
        newSinceVisitCount?: number;
      };
      const raw = Array.isArray(data.items) ? data.items : [];
      setItems(enrichItems(raw));
      setNewSinceVisitCount(data.newSinceVisitCount ?? 0);
      setEarningsTodayCount(data.earningsTodayCount ?? 0);
      setNewsTickerCount(
        Array.isArray(data.newsTickers) ? data.newsTickers.length : derivedTickerCount,
      );
      track("aid_digest_loaded", { count: String(raw.length) });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [hasHoldings, activePortfolioId, enrichItems, track, derivedTickerCount]);

  const refreshTicker = useCallback(
    async (ticker: string) => {
    setRefreshingTicker(ticker);
    try {
      track("aid_news_refresh_requested", { ticker });
      track("aid_digest_refresh", { ticker });
      const res = await fetch("/api/aid/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, portfolioId: activePortfolioId }),
        });
        if (!res.ok) throw new Error("refresh failed");
        track("aid_digest_refresh", { ticker });
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

  const filtered = useMemo(() => items.filter((i) => matchesFilter(i, filter)), [items, filter]);

  const emptyMessage = useMemo(() => {
    const tickers = newsTickerCount ?? derivedTickerCount;
    if (tickers === 0) return t("aidNewsNoTickers");
    if (filter === "earnings") return t("aidNewsEmptyEarnings");
    if (filter === "move") return t("aidNewsEmptyMove");
    return t("aidNewsEmptyFeed");
  }, [newsTickerCount, derivedTickerCount, filter, t]);

  if (!hasHoldings) return null;

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("aidFilterAll") },
    { id: "earnings", label: t("aidFilterEarnings") },
    { id: "move", label: t("aidFilterMove") },
  ];

  return (
    <section id="aid-news" className="card rounded-[var(--radius-card)] p-4" aria-label={t("aidNewsTitle")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("aidNewsTitle")}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[color:var(--muted)]">{t("aidNews48h")}</span>
          {newSinceVisitCount > items.length ? (
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {t("aidNewsShowingNew")
                .replace("{shown}", String(filtered.length))
                .replace("{new}", String(newSinceVisitCount))}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-9 rounded-full border border-[color:var(--border)] px-3 text-[11px] font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
          >
            {loading ? t("loading") : t("aidRefreshDigest")}
          </button>
        </div>
      </div>

      {earningsTodayCount > 0 && (
        <p className="mb-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          {t("aidEarningsBanner").replace("{n}", String(earningsTodayCount))}
        </p>
      )}

      <div className="mb-3 flex gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`flex-1 min-h-9 rounded-full px-2 text-[11px] font-semibold ${
              filter === id
                ? "bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {refreshingTicker && (
        <p className="mb-2 text-xs text-[color:var(--muted)]" role="status">
          {t("aidSearchingWeb")}
        </p>
      )}

      <p className="mb-3 text-[10px] text-[color:var(--muted)]">{t("financialDataDisclaimer")}</p>

      {loading && items.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]" role="status">
          {t("loadingPortfolioNews")}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm text-red-500">{t("portfolioNewsError")}</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="space-y-2 text-sm text-[color:var(--muted)]">
          <p>{emptyMessage}</p>
          {items.length > 0 && filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              {t("aidNewsShowAll")}
            </button>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((item) => {
          const move = item.movePct;
          const moveColor =
            move == null ? "text-[color:var(--muted)]" : move >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500";
          return (
            <li key={item.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[color:var(--foreground)]">{item.ticker}</span>
                {move != null && (
                  <span className={`text-xs font-semibold tabular-nums ${moveColor}`}>
                    {move >= 0 ? "+" : ""}
                    {formatPercent(move)}
                  </span>
                )}
                <AidImpactBadge impact={item.impact} impactScore={item.impactScore} />
                {item.usedWeb && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("aidWebSaved")}
                  </span>
                )}
                {!item.usedWeb && item.cachedAt && (
                  <span className="text-[10px] text-[color:var(--muted)]">
                    {t("aidCacheLabel").replace("{date}", item.cachedAt.slice(0, 10))}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void refreshTicker(item.ticker)}
                  disabled={refreshingTicker === item.ticker}
                  className="ml-auto min-h-8 rounded-full border border-[color:var(--border)] px-2 text-[10px] font-semibold text-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-50"
                  aria-label={t("aidRefreshTicker").replace("{ticker}", item.ticker)}
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
