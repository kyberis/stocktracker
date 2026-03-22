"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
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
  const fresh = isDigestFreshDay();
  if (position === "promoted" && !fresh) return null;
  if (position === "default" && fresh) return null;
  const { t } = useI18n();
  const { user } = useAuth();
  const { activePortfolioId, demoMode } = usePortfolio();
  const isPro = user?.plan === "pro" || user?.role === "admin";
  const [digest, setDigest] = useState<WeeklyDigestRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode || !isPro) {
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
  }, [isPro, activePortfolioId, demoMode]);

  if (loading) return null;

  if (!isPro) {
    return (
      <div className="rounded-2xl border border-dashed border-violet-500/20 bg-gradient-to-br from-violet-500/[0.04] to-cyan-500/[0.03] p-4 text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-md mb-2">
          Trefolio
        </span>
        <div className="flex justify-center mb-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>
        <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">{t("weeklyDigestTeaserTitle")}</div>
        <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed mb-3 max-w-[240px] mx-auto">
          {t("weeklyDigestTeaserDesc")}
        </p>
        <a
          href="/profile?section=subscription"
          className="inline-block px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-semibold hover:brightness-110 transition-all"
        >
          {t("weeklyDigestUpgrade")}
        </a>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="card rounded-2xl p-3 bg-gradient-to-br from-violet-500/[0.06] to-cyan-500/[0.04] border-violet-500/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="text-xs font-bold text-gray-900 dark:text-white">{t("weeklyDigestTitle")}</div>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("weeklyDigestNoData")}</p>
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
      value: `${stats.weekChange >= 0 ? "+" : ""}${sym}${Math.abs(stats.weekChange).toFixed(0)}`,
      color: stats.weekChange >= 0 ? "text-emerald-500" : "text-red-500",
    });
  } else if (stats.totalValue !== undefined) {
    statItems.push({
      label: t("weeklyDigestPortfolioValue") ?? "Value",
      value: `${sym}${stats.totalValue.toFixed(0)}`,
    });
  }

  if (stats.bestPerformer) {
    statItems.push({
      label: t("weeklyDigestBestPerformer"),
      value: `${stats.bestPerformer.ticker} ${stats.bestPerformer.changePct >= 0 ? "+" : ""}${stats.bestPerformer.changePct.toFixed(1)}%`,
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
    <div className="card rounded-2xl p-3 bg-gradient-to-br from-violet-500/[0.06] to-cyan-500/[0.04] border-violet-500/10">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-bold text-gray-900 dark:text-white">{t("weeklyDigestTitle")}</div>
          <div className="text-[10px] text-gray-400 dark:text-slate-500">{digest.weekStart} – {digest.weekEnd}</div>
        </div>
      </div>

      {statItems.length > 0 && (
        <div className={`grid gap-1.5 mb-2`} style={{ gridTemplateColumns: `repeat(${statItems.length}, 1fr)` }}>
          {statItems.map((s, i) => (
            <div key={i} className="rounded-lg bg-white/40 dark:bg-white/[0.03] p-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-slate-500">{s.label}</div>
              <div className={`text-xs font-bold font-mono mt-0.5 ${s.color || "text-gray-900 dark:text-white"}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed mb-2">
        {digest.summaryText}
      </p>
      <p className="text-[9px] text-gray-400 dark:text-slate-600 italic">{t("weeklyDigestDisclaimer")}</p>
    </div>
  );
}
