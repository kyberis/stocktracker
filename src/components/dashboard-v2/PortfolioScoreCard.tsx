"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import { FEATURE_QUOTAS } from "@/lib/platform-config";
import { buildScorePayload, type PortfolioScoreResponse, type CategoryScore } from "@/lib/portfolio-score";
import type { Holding, CashEntry } from "@/lib/types";

type ScoreStatus = "idle" | "loading" | "done" | "error" | "limit-reached";

interface Props {
  holdings: Holding[];
  cashEntries: CashEntry[];
}

/* ── Gauge helpers ─────────────────────────────────────────── */

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function scoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.7) return "#10b981";
  if (pct >= 0.4) return "#f59e0b";
  return "#ef4444";
}

function labelColor(label: string): string {
  const l = label.toLowerCase();
  if (l === "excellent" || l === "excelente") return "text-emerald-500";
  if (l === "good" || l === "bueno" || l === "bien") return "text-emerald-400";
  if (l === "medium" || l === "medio") return "text-amber-500";
  if (l === "room for improvement" || l === "mejorable") return "text-orange-500";
  return "text-red-500";
}

/* ── Compact main gauge ───────────────────────────────────── */

function CompactGauge({ score, percentile }: { score: number; percentile: number }) {
  const { t } = useI18n();
  const r = 46;
  const cx = 56;
  const cy = 56;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (score / 10) * totalAngle;
  const bgArc = describeArc(cx, cy, r, startAngle, endAngle);
  const fgArc = describeArc(cx, cy, r, startAngle, Math.min(scoreAngle, endAngle));
  const color = scoreColor(score, 10);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 112 80" className="w-28 h-auto">
        <path d={bgArc} fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round"
          className="text-gray-200 dark:text-white/[0.06]" />
        <path d={fgArc} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          style={{ transition: "d 0.6s ease-out" }} />
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize={24} fontWeight={700}>
          {score}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500" fontSize={8}>
          /10
        </text>
      </svg>
      <p className="text-[11px] text-gray-500 dark:text-slate-500 -mt-1 text-center">
        {t("portfolioScorePercentile").replace("{pct}", String(percentile))}
      </p>
    </div>
  );
}

/* ── Mini sub-score row ───────────────────────────────────── */

function MiniScore({ category, data }: { category: string; data: CategoryScore }) {
  const { t } = useI18n();
  const CATEGORY_KEYS: Record<string, string> = {
    diversification: "scoreCategory_diversification",
    risk: "scoreCategory_risk",
    costs: "scoreCategory_costs",
    macroeconomics: "scoreCategory_macroeconomics",
  };
  const label = t(CATEGORY_KEYS[category] as never) || category;
  const color = scoreColor(data.score, 10);
  const pct = (data.score / 10) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400 w-20 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-6 text-right" style={{ color }}>
        {data.score}
      </span>
      <span className={`text-[8px] font-semibold w-14 truncate ${labelColor(data.label)}`}>
        {data.label}
      </span>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */

export default function PortfolioScoreCard({ holdings, cashEntries }: Props) {
  const { t, language } = useI18n();
  const router = useRouter();
  const { quotes, exchangeRates, activePortfolioId, demoMode } = usePortfolio();
  const { user, refreshUser } = useAuth();
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");

  if (!aiReportEnabled) return null;

  const [status, setStatus] = useState<ScoreStatus>("idle");
  const [score, setScore] = useState<PortfolioScoreResponse | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const isAdmin = user?.role === "admin";
  const isPro = user?.plan === "pro" || isAdmin;
  const scoreQuota = user?.quotas?.portfolio_score;
  const limit = scoreQuota?.limit ?? FEATURE_QUOTAS.portfolio_score[isPro ? "pro" : "free"];
  const used = scoreQuota?.used ?? 0;
  const remaining = isAdmin ? Infinity : Math.max(0, limit - used);

  const loadCachedScore = useCallback(async () => {
    if (demoMode || !isPro) return;
    try {
      const pid = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/portfolio/score${pid}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.score) {
        setScore(data.score);
        setCachedAt(data.cachedAt);
        setStatus("done");
      }
    } catch { /* ignore */ }
  }, [demoMode, isPro, activePortfolioId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadCachedScore();
  }, [loadCachedScore]);

  const generateScore = useCallback(async () => {
    if (status === "loading" || holdings.length === 0) return;
    setStatus("loading");

    try {
      const payload = buildScorePayload(holdings, cashEntries, quotes, exchangeRates);
      const res = await fetch("/api/portfolio/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          portfolioId: activePortfolioId || "",
          payload,
        }),
      });

      if (res.status === 429) { setStatus("limit-reached"); return; }
      if (res.status === 403) { setStatus("idle"); return; }
      if (!res.ok) { setStatus("error"); return; }

      const data = await res.json();
      if (data.score) {
        setScore(data.score);
        setCachedAt(data.cachedAt || new Date().toISOString());
        setStatus("done");
        refreshUser();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [status, holdings, cashEntries, quotes, exchangeRates, language, activePortfolioId, refreshUser]);

  const goToDetails = () => router.push("/tools/score");

  if (!isPro) {
    return (
      <div className="card p-3 relative overflow-hidden border-amber-500/20">
        <div className="blur-[6px] pointer-events-none select-none opacity-60">
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 112 80" className="w-24 h-auto">
              <path d={describeArc(56, 56, 46, -210, 30)} fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" className="text-gray-200 dark:text-white/[0.06]" />
              <path d={describeArc(56, 56, 46, -210, -42)} fill="none" stroke="#10b981" strokeWidth={8} strokeLinecap="round" />
              <text x={56} y={64} textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize={24} fontWeight={700}>7</text>
            </svg>
            <div className="w-full space-y-1.5 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-2 rounded bg-gray-100 dark:bg-white/[0.04]" />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/70">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-800 dark:text-white">{t("portfolioScore")}</p>
          <a
            href="/billing"
            className="mt-2 px-3 py-1 text-[10px] font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:opacity-90 transition-opacity"
          >
            {t("portfolioScoreProOnly")}
          </a>
        </div>
      </div>
    );
  }

  if (status === "idle" || status === "error" || status === "limit-reached") {
    return (
      <div className="card p-3 border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{t("portfolioScore")}</span>
            <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-0.5 leading-snug">{t("portfolioScoreDescription")}</p>
          </div>
        </div>

        {status === "limit-reached" ? (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">{t("portfolioScoreLimitReached")}</p>
        ) : status === "error" ? (
          <p className="text-[10px] text-red-500 mb-2">{t("portfolioScoreError")}</p>
        ) : null}

        <button
          onClick={generateScore}
          disabled={holdings.length === 0 || remaining <= 0}
          className="w-full py-2 px-3 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {t("portfolioScoreButton")}
        </button>
        {!isAdmin && (
          <p className="text-[9px] text-gray-400 dark:text-slate-600 mt-1.5 text-center">
            {t("portfolioReviewUsage").replace("{used}", String(used)).replace("{limit}", String(limit))}
          </p>
        )}
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="card p-4 border-amber-500/20">
        <div className="flex flex-col items-center gap-3 py-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <p className="text-[10px] text-gray-500 dark:text-slate-400">{t("portfolioScoreRunning")}</p>
        </div>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="card p-3 border-amber-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">{t("portfolioScore")}</span>
        </div>
        <button
          onClick={generateScore}
          disabled={remaining <= 0}
          className="text-[10px] text-gray-500 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-40"
          title={t("portfolioScoreRefresh")}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Compact gauge */}
      <CompactGauge score={score.overallScore} percentile={score.percentile} />

      {/* Sub-score bars */}
      <div className="mt-2 space-y-1.5">
        {(["diversification", "risk", "costs", "macroeconomics"] as const).map((cat) => (
          <MiniScore key={cat} category={cat} data={score.categories[cat]} />
        ))}
      </div>

      {/* Top concentration warning */}
      {score.topConcentrationRisks && score.topConcentrationRisks.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
          <div className="flex flex-wrap gap-1">
            {score.topConcentrationRisks.slice(0, 3).map((r) => (
              <span key={r.ticker} className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/[0.06] text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/10">
                {r.ticker} {r.weightPct.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View details link */}
      <button
        onClick={goToDetails}
        className="w-full mt-2.5 pt-2 border-t border-gray-100 dark:border-white/[0.04] flex items-center justify-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
      >
        {t("portfolioScoreViewDetails")}
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Timestamp */}
      {cachedAt && (
        <p className="text-[8px] text-gray-400 dark:text-slate-600 text-center mt-1">
          {t("portfolioScoreCachedAt").replace("{time}", new Date(cachedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }))}
        </p>
      )}
    </div>
  );
}
