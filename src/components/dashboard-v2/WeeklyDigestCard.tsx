"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFeatureFlagContext } from "@/lib/feature-flag-context";
const fmtDigest = (n: number) =>
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
import type { WeeklyDigestRow } from "@/lib/db/weekly-digest";

function isDigestFreshDay(): boolean {
  const day = new Date().getDay();
  return day === 1 || day === 2;
}

interface WeeklyDigestCardProps {
  /** "promoted" = top slot (Mon/Tue only), "default" = normal sidebar position */
  position?: "promoted" | "default";
}

export default function WeeklyDigestCard({ position = "default" }: WeeklyDigestCardProps) {
  const { flags, isLoaded } = useFeatureFlagContext();
  if (isLoaded && flags.weekly_digest_enabled === false) return null;

  const fresh = isDigestFreshDay();
  if (position === "promoted" && !fresh) return null;
  if (position === "default" && fresh) return null;
  const { t } = useI18n();
  const { activePortfolioId, demoMode } = usePortfolio();
  const [digest, setDigest] = useState<WeeklyDigestRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    const pid = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
    fetch(`/api/weekly-digest${pid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setDigest(data?.digest || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activePortfolioId, demoMode]);

  if (loading) return <div className="card h-24 rounded-[var(--radius-card)] bg-gray-50 animate-pulse dark:bg-white/[0.02]" />;

  if (!digest) {
    return (
      <div className="card rounded-[var(--radius-card)] border border-[color:var(--border)] p-4 shadow-[0_14px_28px_rgba(1,6,16,0.22)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-300" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">{t("weeklyDigestTitle")}</div>
        </div>
        <p className="text-[10px] text-[color:var(--muted)]">{t("weeklyDigestNoData")}</p>
      </div>
    );
  }

  const stats = digest.stats;
  const currency = stats.currency || "EUR";
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";

  const statItems: { label: string; value: string; color?: string }[] = [];

  if (stats.weekChange !== undefined) {
    statItems.push({
      label: t("weeklyDigestWeekChange"),
      value: `${stats.weekChange >= 0 ? "+" : "-"}${sym}${fmtDigest(stats.weekChange)}`,
      color: stats.weekChange >= 0 ? "text-emerald-500" : "text-red-500",
    });
    if (stats.netBuyFlowEUR !== undefined && Math.abs(stats.netBuyFlowEUR) >= 1) {
      statItems.push({
        label: t("weeklyDigestNetBuyFlow"),
        value: `${stats.netBuyFlowEUR >= 0 ? "+" : "-"}${sym}${fmtDigest(stats.netBuyFlowEUR)}`,
        color: stats.netBuyFlowEUR >= 0 ? "text-slate-600 dark:text-slate-300" : "text-slate-600 dark:text-slate-300",
      });
    }
  } else if (stats.totalValue !== undefined) {
    statItems.push({
      label: t("weeklyDigestPortfolioValue") ?? "Value",
      value: `${sym}${fmtDigest(stats.totalValue)}`,
    });
  }

  if (stats.bestPerformer) {
    statItems.push({
      label: t("weeklyDigestBestPerformer"),
      value: `${stats.bestPerformer.ticker} ${stats.bestPerformer.changePct >= 0 ? "+" : ""}${stats.bestPerformer.changePct.toFixed(2)}%`,
      color: stats.bestPerformer.changePct >= 0 ? "text-emerald-500" : "text-red-500",
    });
  } else if (stats.holdingCount !== undefined) {
    statItems.push({
      label: t("weeklyDigestHoldings") ?? "Holdings",
      value: `${stats.holdingCount}`,
    });
  }

  if (stats.dividendsReceived && stats.dividendsReceived > 0) {
    statItems.push({
      label: t("weeklyDigestDividendsReceived"),
      value: `${sym}${stats.dividendsReceived.toFixed(2)}`,
      color: "text-emerald-500",
    });
  }

  return (
    <div className="card rounded-[var(--radius-card)] border border-[color:var(--border)] p-4 shadow-[0_14px_28px_rgba(1,6,16,0.22)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-violet-300" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]">{t("weeklyDigestTitle")}</div>
          <div className="text-[10px] text-[color:var(--muted)]">{digest.weekStart} – {digest.weekEnd}</div>
        </div>
      </div>

      {statItems.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {statItems.map((s, i) => (
            <div key={i} className="rounded-[16px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 text-center">
              <div className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--muted)]">{s.label}</div>
              <div className={`mt-0.5 text-xs font-bold font-mono ${s.color || "text-[color:var(--foreground)]"}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {stats.weekChange !== undefined && (
        <p className="mb-2 text-[9px] leading-snug text-[color:var(--muted)]">{t("weeklyDigestSnapshotNote")}</p>
      )}

      <p className="mb-2 text-[11px] leading-relaxed text-[color:var(--foreground)]">
        {digest.summaryText}
      </p>
      <p className="text-[9px] italic text-[color:var(--muted)]">{t("weeklyDigestDisclaimer")}</p>
    </div>
  );
}
