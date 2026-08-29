"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useFeatureFlag } from "@/lib/feature-flag-context";
import { FEATURE_QUOTAS } from "@/lib/platform-config";
import ProCompareCard from "@/components/ProCompareCard";
import BlurredProSection from "@/components/BlurredProSection";
import { isPaidPlan, planOf } from "@/lib/plan-rank";
import {
  buildScorePayload,
  type PortfolioScoreResponse,
  type CategoryScore,
  type Recommendation,
  type AllocationInsight,
  type StoredScore,
} from "@/lib/portfolio-score";

type PageStatus = "idle" | "loading" | "done" | "error" | "limit-reached";

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
  if (l === "excellent" || l === "excelente") return "text-emerald-500 bg-emerald-500/10";
  if (l === "good" || l === "bueno" || l === "bien") return "text-emerald-400 bg-emerald-400/10";
  if (l === "medium" || l === "medio") return "text-amber-500 bg-amber-500/10";
  if (l === "room for improvement" || l === "mejorable") return "text-orange-500 bg-orange-500/10";
  return "text-red-500 bg-red-500/10";
}

/* ── Main gauge (large) ───────────────────────────────────── */

function HeroGauge({ score }: { score: number }) {
  const { t } = useI18n();
  const r = 80;
  const cx = 100;
  const cy = 100;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (score / 10) * totalAngle;
  const bgArc = describeArc(cx, cy, r, startAngle, endAngle);
  const fgArc = describeArc(cx, cy, r, startAngle, Math.min(scoreAngle, endAngle));
  const color = scoreColor(score, 10);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 140" className="w-56 h-auto">
        <path d={bgArc} fill="none" stroke="currentColor" strokeWidth={14} strokeLinecap="round"
          className="text-gray-200 dark:text-white/[0.06]" />
        <path d={fgArc} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
          style={{ transition: "d 0.8s ease-out" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500" fontSize={12} fontWeight={500}>
          {t("portfolioScore")}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize={42} fontWeight={700}>
          {score}
        </text>
        <text x={cx} y={cy + 40} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500" fontSize={12}>
          /10
        </text>
      </svg>
      <p className="text-xs text-gray-500 dark:text-slate-500 -mt-1 text-center">
        {t("portfolioScoreOutOfTen")}
      </p>
    </div>
  );
}

/* ── Category detail card ─────────────────────────────────── */

function CategoryCard({ category, data }: { category: string; data: CategoryScore }) {
  const { t } = useI18n();
  const r = 32;
  const cx = 40;
  const cy = 40;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const scoreAngle = startAngle + (data.score / 10) * totalAngle;
  const color = scoreColor(data.score, 10);
  const bgArc = describeArc(cx, cy, r, startAngle, endAngle);
  const fgArc = describeArc(cx, cy, r, startAngle, Math.min(scoreAngle, endAngle));
  const needsAttention = data.score <= 6;
  const labelLooksStrong = /good|strong|excellent|solid|healthy/i.test(data.label || "");
  const weaknessTitleKey =
    needsAttention && !labelLooksStrong ? "portfolioScoreWhyLow" : "portfolioScoreWhatsDriving";

  const CATEGORY_KEYS: Record<string, string> = {
    diversification: "scoreCategory_diversification",
    risk: "scoreCategory_risk",
    costs: "scoreCategory_costs",
    macroeconomics: "scoreCategory_macroeconomics",
  };
  const label = t(CATEGORY_KEYS[category] as never) || category;

  return (
    <div className={`card p-4 ${needsAttention ? "border-amber-200 dark:border-amber-500/20" : ""}`}>
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 80 60" className="w-16 h-auto shrink-0">
          <path d={bgArc} fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round"
            className="text-gray-200 dark:text-white/[0.06]" />
          <path d={fgArc} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
          <text x={cx} y={cy + 2} textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize={16} fontWeight={700}>
            {data.score}
          </text>
          <text x={cx + 12} y={cx + 2} textAnchor="start" className="fill-gray-400 dark:fill-slate-500" fontSize={9}>
            /10
          </text>
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${labelColor(data.label)}`}>
              {data.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {/* Details */}
      {data.details && data.details.length > 0 && (
        <ul className="mt-3 space-y-1.5 pl-1">
          {data.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-500">
              <span className="text-gray-300 dark:text-slate-700 mt-1">•</span>
              <span className="leading-relaxed">{detail}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Weaknesses — adapt title to badge (TRF-015) */}
      {data.weaknesses && data.weaknesses.length > 0 && (needsAttention || !labelLooksStrong) && (
        <div className={`mt-3 p-3 rounded-lg border ${
          needsAttention && !labelLooksStrong
            ? "bg-red-50/60 dark:bg-red-500/[0.06] border-red-100 dark:border-red-500/10"
            : "bg-slate-50/60 dark:bg-slate-500/[0.06] border-slate-100 dark:border-slate-500/10"
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <svg className={`w-3.5 h-3.5 shrink-0 ${needsAttention && !labelLooksStrong ? "text-red-500" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className={`text-[11px] font-semibold ${needsAttention && !labelLooksStrong ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
              {t(weaknessTitleKey as never)}
            </span>
          </div>
          <ul className="space-y-1.5">
            {data.weaknesses.map((w, i) => (
              <li key={i} className={`flex items-start gap-2 text-[11px] ${needsAttention && !labelLooksStrong ? "text-red-700/80 dark:text-red-400/80" : "text-slate-600 dark:text-slate-400"}`}>
                <span className="mt-0.5 shrink-0">•</span>
                <span className="leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements — only for medium/low scores */}
      {needsAttention && data.improvements && data.improvements.length > 0 && (
        <div className="mt-2 p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-500/[0.06] border border-emerald-100 dark:border-emerald-500/10">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{t("portfolioScoreHowToImprove")}</span>
          </div>
          <ul className="space-y-1.5">
            {data.improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                <span className="text-emerald-400 dark:text-emerald-600 mt-0.5 shrink-0">→</span>
                <span className="leading-relaxed">{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Allocation insights table ────────────────────────────── */

function AllocationInsightsTable({ title, insights }: { title: string; insights: AllocationInsight[] }) {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="space-y-2">
        {insights.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{item.label}</span>
                <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">{item.pct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(item.pct, 100)}%`,
                    backgroundColor: scoreColor(10 - (item.pct > 40 ? 3 : item.pct > 25 ? 6 : 8), 10),
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-1 leading-snug">{item.assessment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Concentration risks ──────────────────────────────────── */

function ConcentrationRisks({ risks }: { risks: PortfolioScoreResponse["topConcentrationRisks"] }) {
  const { t } = useI18n();
  if (!risks || risks.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {t("portfolioScoreConcentrationRisks")}
      </h3>
      <div className="space-y-2">
        {risks.map((risk, i) => (
          <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-red-50/50 dark:bg-red-500/[0.06] border border-red-100 dark:border-red-500/10">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-red-600 dark:text-red-400">{risk.weightPct.toFixed(0)}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{risk.ticker}</span>
                <span className="text-[10px] text-gray-500 dark:text-slate-500">{risk.name}</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 leading-snug">{risk.issue}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Recommendation card ──────────────────────────────────── */

function RecommendationCard({ rec, idx }: { rec: Recommendation; idx: number }) {
  const [open, setOpen] = useState(false);

  const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: "bg-red-50 dark:bg-red-500/[0.06] border-red-100 dark:border-red-500/10", text: "text-red-600 dark:text-red-400", label: "High" },
    medium: { bg: "bg-amber-50 dark:bg-amber-500/[0.06] border-amber-100 dark:border-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Medium" },
    low: { bg: "bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-100 dark:border-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Low" },
  };
  const style = priorityStyles[rec.priority] || priorityStyles.medium;

  return (
    <div className={`rounded-xl border ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <span className={`text-[10px] font-bold ${style.text}`}>{idx + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{rec.title}</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${style.text} bg-white/60 dark:bg-slate-800/60`}>
              {style.label}
            </span>
          </div>
          {rec.tickers && rec.tickers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {rec.tickers.map((t) => (
                <span key={t} className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-slate-400">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 pl-12">
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{rec.description}</p>
        </div>
      )}
    </div>
  );
}

/* ── Score history ────────────────────────────────────────── */

function ScoreHistory({ history, currentId }: { history: StoredScore[]; currentId?: string }) {
  const { t } = useI18n();
  if (!history || history.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t("portfolioScoreHistory")}</h3>
        <p className="text-xs text-gray-500 dark:text-slate-500">{t("portfolioScoreHistoryEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("portfolioScoreHistory")}</h3>
      <div className="space-y-2">
        {history.map((entry) => {
          const isActive = entry.id === currentId;
          const d = new Date(entry.createdAt);
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                isActive
                  ? "border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/[0.06]"
                  : "border-gray-100 dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.02]"
              }`}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${scoreColor(entry.score.overallScore, 10)}15` }}>
                <span className="text-sm font-bold" style={{ color: scoreColor(entry.score.overallScore, 10) }}>
                  {entry.score.overallScore}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {t("portfolioScoreScoreOf")} {entry.score.overallScore}/10
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-slate-500">
                  {d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} · {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(["diversification", "risk", "costs", "macroeconomics"] as const).map((cat) => (
                  <div key={cat} className="text-center">
                    <div className="text-[10px] font-bold" style={{ color: scoreColor(entry.score.categories[cat].score, 10) }}>
                      {entry.score.categories[cat].score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main page component ──────────────────────────────────── */

export default function PortfolioScorePage() {
  const { t, language } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates, activePortfolioId, demoMode } = usePortfolio();
  const { user, refreshUser } = useAuth();
  const aiReportEnabled = useFeatureFlag("ai_report_enabled");

  if (!aiReportEnabled) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">
        {t("featureDisabled") || "This feature is currently unavailable."}
      </div>
    );
  }

  const [status, setStatus] = useState<PageStatus>("idle");
  const [score, setScore] = useState<PortfolioScoreResponse | null>(null);
  const [scoreId, setScoreId] = useState<string | undefined>(undefined);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<StoredScore[]>([]);
  const fetchedRef = useRef(false);

  const isAdmin = user?.role === "admin";
  const isPro = isPaidPlan(planOf(user)) || isAdmin;
  const scoreQuota = user?.quotas?.portfolio_score;
  const limit = scoreQuota?.limit ?? FEATURE_QUOTAS.portfolio_score[isPro ? "pro" : "free"];
  const used = scoreQuota?.used ?? 0;
  const remaining = isAdmin ? Infinity : Math.max(0, limit - used);

  const loadScore = useCallback(async () => {
    if (demoMode || !isPro) return;
    try {
      const pid = activePortfolioId ? `portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const [scoreRes, historyRes] = await Promise.all([
        fetch(`/api/portfolio/score?${pid}`),
        fetch(`/api/portfolio/score?${pid}&history=true`),
      ]);
      if (scoreRes.ok) {
        const data = await scoreRes.json();
        if (data.score) {
          setScore(data.score);
          setScoreId(data.scoreId);
          setCachedAt(data.cachedAt);
          setStatus("done");
        }
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        if (data.scores) setHistory(data.scores);
      }
    } catch { /* ignore */ }
  }, [demoMode, isPro, activePortfolioId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadScore();
  }, [loadScore]);

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
        setScoreId(data.scoreId);
        setCachedAt(data.cachedAt || new Date().toISOString());
        setStatus("done");
        refreshUser();
        const pid = activePortfolioId ? `portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
        const historyRes = await fetch(`/api/portfolio/score?${pid}&history=true`);
        if (historyRes.ok) {
          const hData = await historyRes.json();
          if (hData.scores) setHistory(hData.scores);
        }
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [status, holdings, cashEntries, quotes, exchangeRates, language, activePortfolioId, refreshUser]);

  if (status === "idle" && !score) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("portfolioScoreToolTitle")}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{t("portfolioScoreToolSubtitle")}</p>
          <button
            onClick={generateScore}
            disabled={holdings.length === 0 || remaining <= 0}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {t("portfolioScoreButton")}
          </button>
          {!isAdmin && (
            <p className="text-xs text-gray-400 dark:text-slate-600 mt-3">
              {t("portfolioReviewUsage").replace("{used}", String(used)).replace("{limit}", String(limit))}
            </p>
          )}

          {history.length > 0 && (
            <div className="mt-8">
              <ScoreHistory history={history} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("portfolioScoreRunning")}</p>
        </div>
      </div>
    );
  }

  if ((status === "error" || status === "limit-reached") && !score) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <p className="text-sm text-red-500 dark:text-red-400 mb-4">
            {status === "limit-reached" ? t("portfolioScoreLimitReached") : t("portfolioScoreError")}
          </p>
          <button
            onClick={generateScore}
            disabled={holdings.length === 0 || remaining <= 0}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {t("portfolioScoreButton")}
          </button>
        </div>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero section */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <HeroGauge score={score.overallScore} />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t("portfolioScoreToolTitle")}</h2>
            {cachedAt && (
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">
                {t("portfolioScoreCachedAt").replace("{time}",
                  new Date(cachedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                )}
              </p>
            )}
            {cachedAt && Date.now() - Date.parse(cachedAt) > 14 * 24 * 60 * 60 * 1000 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                {t("portfolioScoreStaleWarning")}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["diversification", "risk", "costs", "macroeconomics"] as const).map((cat) => {
                const d = score.categories[cat];
                const CATEGORY_KEYS: Record<string, string> = {
                  diversification: "scoreCategory_diversification",
                  risk: "scoreCategory_risk",
                  costs: "scoreCategory_costs",
                  macroeconomics: "scoreCategory_macroeconomics",
                };
                return (
                  <div key={cat} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                    <div className="text-lg font-bold" style={{ color: scoreColor(d.score, 10) }}>
                      {d.score}<span className="text-xs text-gray-400 dark:text-slate-500">/10</span>
                    </div>
                    <div className="text-[10px] font-medium text-gray-600 dark:text-slate-400">
                      {t(CATEGORY_KEYS[cat] as never)}
                    </div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block mt-1 ${labelColor(d.label)}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={generateScore}
              disabled={remaining <= 0}
              className="mt-4 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t("portfolioScoreGenerateNew")}
            </button>
            {!isAdmin && (
              <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-2">
                {t("portfolioReviewUsage").replace("{used}", String(used)).replace("{limit}", String(limit))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["diversification", "risk", "costs", "macroeconomics"] as const).map((cat) => (
          <CategoryCard key={cat} category={cat} data={score.categories[cat]} />
        ))}
      </div>

      {/* Sector + Region insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AllocationInsightsTable
          title={t("portfolioScoreSectorInsights")}
          insights={score.sectorInsights}
        />
        <AllocationInsightsTable
          title={t("portfolioScoreRegionInsights")}
          insights={score.regionInsights}
        />
      </div>

      {/* Concentration risks */}
      <ConcentrationRisks risks={score.topConcentrationRisks} />

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t("portfolioScoreRecommendations")}
          </h3>
          <div className="space-y-2">
            {score.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} idx={i} />
            ))}
          </div>
        </div>
      )}

      {/* Score history */}
      <ScoreHistory history={history} currentId={scoreId} />

      {/* Disclaimer */}
      <p className="text-[10px] text-gray-400 dark:text-slate-600 text-center leading-relaxed pb-4">
        {score.disclaimer || t("portfolioScoreDisclaimer")}
      </p>
    </div>
  );
}
