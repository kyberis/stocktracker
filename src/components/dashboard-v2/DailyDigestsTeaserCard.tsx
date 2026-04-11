"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";

interface InsightPreview {
  id: string;
  title: string;
  publishedAt: string;
  receivedAt: string;
}

export default function DailyDigestsTeaserCard() {
  const { t } = useI18n();
  const { demoMode } = usePortfolio();
  const [insight, setInsight] = useState<InsightPreview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/market-insights?limit=1", { cache: "no-store" });
      const data = await res.json();
      const list = data.insights as InsightPreview[] | undefined;
      setInsight(list?.[0] ?? null);
    } catch {
      setInsight(null);
    }
    setLoading(false);
  }, [demoMode]);

  useEffect(() => {
    load();
  }, [load]);

  if (demoMode) return null;

  if (loading) {
    return (
      <div className="card rounded-2xl p-4 h-[88px] animate-pulse bg-gray-50 dark:bg-white/[0.02]" aria-hidden />
    );
  }

  const dateStr = insight
    ? new Date(insight.publishedAt || insight.receivedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <section className="card rounded-2xl p-4 border border-gray-200/80 dark:border-white/[0.06]" aria-labelledby="daily-digests-teaser-heading">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 flex items-center justify-center"
          aria-hidden
        >
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="daily-digests-teaser-heading" className="text-xs font-bold text-gray-900 dark:text-white">
            {t("dailyDigestsTeaserTitle")}
          </h2>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">{t("dailyDigestsTeaserDesc")}</p>
          {insight && (
            <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-2 line-clamp-2 font-medium">{insight.title}</p>
          )}
          {insight && dateStr && (
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{dateStr}</p>
          )}
          <Link
            href="/daily-digests"
            className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded"
          >
            {t("dailyDigestsTeaserCta")}
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
