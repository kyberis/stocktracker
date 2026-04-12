"use client";

import { useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";

function formatDateAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isStale(date: Date): boolean {
  return Date.now() - date.getTime() > 30 * 60 * 1000;
}

/**
 * Quote refresh + holdings sync timestamps, shown next to the portfolio value chart
 * so freshness sits with the data it describes.
 */
export default function PortfolioQuoteFreshness({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { lastUpdated, holdingsLastFetchedAt } = usePortfolio();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const quotesStale = useMemo(() => (lastUpdated ? isStale(lastUpdated) : false), [lastUpdated]);
  const holdingsStale = useMemo(
    () => (holdingsLastFetchedAt ? isStale(holdingsLastFetchedAt) : false),
    [holdingsLastFetchedAt],
  );

  if (!lastUpdated && !holdingsLastFetchedAt) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-1.5 ${className}`.trim()}
      data-testid="portfolio-quote-freshness"
    >
      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.06] bg-black/5 px-2 py-0.5 dark:border-white/[0.06] dark:bg-white/5 sm:px-2.5 sm:py-1">
        {lastUpdated && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-500 font-mono whitespace-nowrap">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${quotesStale ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className="text-gray-400 dark:text-slate-600">{t("quotesAsOf")}</span>
            <span className={quotesStale ? "text-amber-400" : ""}>{`${String(lastUpdated.getHours()).padStart(2, "0")}:${String(lastUpdated.getMinutes()).padStart(2, "0")}`}</span>
          </span>
        )}
        {lastUpdated && holdingsLastFetchedAt && (
          <span className="h-3 w-px shrink-0 bg-gray-200 dark:bg-slate-700" aria-hidden="true" />
        )}
        {holdingsLastFetchedAt && (
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-500 font-mono whitespace-nowrap">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${holdingsStale ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className="text-gray-400 dark:text-slate-600">{t("holdingsSynced")}</span>
            <span className={holdingsStale ? "text-amber-400" : ""}>{formatDateAgo(holdingsLastFetchedAt)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
