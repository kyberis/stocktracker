"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";

interface InsightPreview {
  id: string;
  title: string;
  publishedAt: string;
  receivedAt: string;
}

export default function DailyDigestsTeaserCard() {
  const { t } = useI18n();
  const { demoMode } = usePortfolio();
  const { flags, isLoaded } = useFeatureFlagContext();
  const [insight, setInsight] = useState<InsightPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const enabled = isLoaded && !!flags.daily_digests_enabled;

  const load = useCallback(async () => {
    if (demoMode || !enabled) {
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
  }, [demoMode, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  if (demoMode || !enabled) return null;

  if (loading) {
    return (
      <div className="card h-[88px] rounded-[var(--radius-card)] bg-gray-50 p-4 dark:bg-white/[0.02]" aria-hidden />
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
    <section className="card rounded-[var(--radius-card)] border border-[color:var(--border)] p-4 shadow-[0_14px_28px_rgba(1,6,16,0.22)]" aria-labelledby="daily-digests-teaser-heading">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]"
          aria-hidden
        >
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="daily-digests-teaser-heading" className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">
            {t("dailyDigestsTeaserTitle")}
          </h2>
          <p className="mt-0.5 text-[10px] leading-snug text-[color:var(--muted)]">{t("dailyDigestsTeaserDesc")}</p>
          {insight && (
            <p className="mt-2 line-clamp-2 text-[11px] font-medium text-[color:var(--foreground)]">{insight.title}</p>
          )}
          {insight && dateStr && (
            <p className="mt-0.5 text-[10px] text-[color:var(--muted)]">{dateStr}</p>
          )}
          <Link
            href="/daily-digests"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded"
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
