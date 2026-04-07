"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import type { MoatEvaluation } from "@/lib/types";
import MoatScoreGauge from "./MoatScoreGauge";
import CriterionCard from "./CriterionCard";
import AiMarkdown from "./AiMarkdown";
import TierFeatureBadge from "./TierFeatureBadge";

interface StockEvaluationProps {
  ticker: string;
  exchange: string;
  reportId?: string;
}

export default function StockEvaluation({ ticker, exchange, reportId: initialReportId }: StockEvaluationProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<MoatEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [reportId, setReportId] = useState<string | null>(initialReportId || null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [quote, setQuote] = useState<{ price: number; change: number; changePercent: number; currency: string } | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [evaluatedAt, setEvaluatedAt] = useState<string | null>(null);

  const fetchEvaluation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAiText("");
    setAiError(null);
    setReportId(null);
    setSaveStatus("idle");
    setFromCache(false);
    setCachedAt(null);
    setQuote(null);

    try {
      const res = await fetch(`/api/stock-evaluation?symbol=${encodeURIComponent(ticker)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        if (res.status === 403) {
          setError(data.reason === "upgrade_required" ? "upgrade" : data.error);
        } else {
          setError(data.error || "Failed to fetch evaluation");
        }
        return;
      }
      const data = await res.json() as MoatEvaluation & { _cached?: boolean; _cachedAt?: string; _evaluatedAt?: string };
      if (data._cached) {
        setFromCache(true);
        setCachedAt(data._cachedAt || null);
      }
      setEvaluatedAt(data._evaluatedAt || data._cachedAt || null);
      setEvaluation(data);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  const loadReport = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch(`/api/moat-reports/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setEvaluation(JSON.parse(data.evaluationJson));
      setAiText(data.aiNarrative || "");
      setReportId(id);
      setSaveStatus("saved");
    } catch {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveReport = useCallback(async () => {
    if (!evaluation) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/moat-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: evaluation.symbol,
          companyName: evaluation.companyName,
          evaluationJson: JSON.stringify(evaluation),
          totalScore: evaluation.totalScore,
          maxScore: evaluation.maxScore,
          verdict: evaluation.verdict,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setReportId(data.id);
      setSaveStatus("saved");

      if (aiText) {
        await fetch(`/api/moat-reports/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiNarrative: aiText }),
        });
      }
    } catch {
      setSaveStatus("error");
    }
  }, [evaluation, aiText]);

  const updateReportNarrative = useCallback(async (narrative: string) => {
    if (!reportId) return;
    await fetch(`/api/moat-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiNarrative: narrative }),
    }).catch(() => {});
  }, [reportId]);

  const fetchAiNarrative = useCallback(async () => {
    if (!evaluation) return;
    setAiLoading(true);
    setAiError(null);
    setAiText("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/stock-evaluation/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluation, language }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "AI request failed" }));
        setAiError(data.error || "AI request failed");
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setAiLoading(false); return; }

      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setAiText(acc);
      }

      if (reportId && acc) {
        updateReportNarrative(acc);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setAiError("Failed to get AI assessment");
      }
    } finally {
      setAiLoading(false);
    }
  }, [evaluation, language, reportId, updateReportNarrative]);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (initialReportId) {
      loadReport(initialReportId);
    } else {
      fetchEvaluation();
    }
  }, [initialReportId, loadReport, fetchEvaluation]);

  useEffect(() => {
    if (!evaluation || quote) return;
    fetch(`/api/quote?symbols=${encodeURIComponent(ticker)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const q = data?.[ticker];
        if (q?.regularMarketPrice) {
          setQuote({
            price: q.regularMarketPrice,
            change: q.regularMarketChange || 0,
            changePercent: q.regularMarketChangePercent || 0,
            currency: q.currency || "USD",
          });
        }
      })
      .catch(() => {});
  }, [evaluation, quote, ticker]);

  if (error === "upgrade") {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 text-center">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8">
          <h2 className="text-lg font-bold mb-2">{t("moatEvalTitle")}</h2>
          <p className="text-[var(--muted)] text-sm mb-4">{t("moatEvalProRequired")}</p>
          <TierFeatureBadge requiredPlan="pro" />
          <a href="/billing" className="mt-4 inline-block bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
            {t("toolsSectionUpgrade")}
          </a>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          <p className="text-sm text-[var(--muted)]">{t("moatEvalLoading")}</p>
          <p className="text-xs text-[var(--muted)]">{t("moatEvalLoadingSub")}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 text-center">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8">
          <svg className="w-10 h-10 text-red-500/60 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={fetchEvaluation} className="text-sm text-emerald-500 hover:underline">
              {t("retry")}
            </button>
            <span className="text-[var(--muted)]">·</span>
            <button onClick={() => router.push("/tools/evaluation")} className="text-sm text-violet-500 hover:underline">
              {t("moatEvalSearchAnother")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!evaluation) return null;

  const v = evaluation.valuation;

  const valuationSignal = (() => {
    let score = 0;
    let signals = 0;
    if (v.peRatio != null) {
      signals++;
      if (v.peRatio < 15) score += 2;
      else if (v.peRatio < 25) score += 1;
      else if (v.peRatio >= 40) score -= 2;
      else if (v.peRatio >= 30) score -= 1;
    }
    if (v.forwardPE != null) {
      signals++;
      if (v.forwardPE < 15) score += 2;
      else if (v.forwardPE < 22) score += 1;
      else if (v.forwardPE >= 35) score -= 2;
      else if (v.forwardPE >= 28) score -= 1;
    }
    if (v.pegRatio != null) {
      signals++;
      if (v.pegRatio < 1) score += 2;
      else if (v.pegRatio < 1.5) score += 1;
      else if (v.pegRatio >= 3) score -= 2;
      else if (v.pegRatio >= 2) score -= 1;
    }
    if (signals === 0) return null;
    const avg = score / signals;
    if (avg >= 0.8) return "undervalued" as const;
    if (avg <= -0.8) return "overvalued" as const;
    return "fair" as const;
  })();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Back link */}
      <button
        onClick={() => router.push("/tools/evaluation")}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t("back")} {t("moatEvalTitle")}
      </button>

      {/* Company Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">{evaluation.companyName}</h1>
            {quote && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tabular-nums">
                  {quote.currency === "USD" ? "$" : quote.currency === "EUR" ? "€" : quote.currency === "GBP" ? "£" : ""}{quote.price.toFixed(2)}
                </span>
                <span className={`text-sm font-semibold tabular-nums ${quote.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[13px] text-[var(--muted)] items-center">
            <span>{evaluation.symbol}</span>
            <span>{evaluation.sector}</span>
            <span>{evaluation.industry}</span>
            {valuationSignal && (
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                valuationSignal === "undervalued"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : valuationSignal === "overvalued"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-blue-500/10 text-blue-500"
              }`}>
                {valuationSignal === "undervalued" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                )}
                {valuationSignal === "overvalued" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                )}
                {valuationSignal === "fair" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                )}
                {valuationSignal === "undervalued" ? t("moatEvalUndervalued") : valuationSignal === "overvalued" ? t("moatEvalOvervalued") : t("moatEvalFairValue")}
              </span>
            )}
            {evaluatedAt && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--card-hover)] text-[var(--muted)]">
                {t("moatEvaluatedOn")} {new Date(evaluatedAt + (evaluatedAt.includes("Z") ? "" : "Z")).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
            {fromCache && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                {t("moatScreenerCached")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveStatus === "saved" ? (
            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {t("moatReportSaved")}
            </span>
          ) : (
            <button
              onClick={saveReport}
              disabled={saveStatus === "saving"}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              {saveStatus === "saving" ? t("moatReportSaving") : saveStatus === "error" ? t("moatReportSaveError") : t("moatReportSave")}
            </button>
          )}
          <button
            onClick={async () => {
              setEvaluation(null); setAiText(""); setError(null); setReportId(null); setSaveStatus("idle"); setFromCache(false); setCachedAt(null); setEvaluatedAt(null);
              setLoading(true);
              try {
                const res = await fetch(`/api/stock-evaluation?symbol=${encodeURIComponent(ticker)}&fresh=1`);
                if (!res.ok) { const d = await res.json().catch(() => ({ error: "Request failed" })); setError(d.error || "Failed"); return; }
                const data = await res.json() as MoatEvaluation & { _evaluatedAt?: string };
                setEvaluation(data);
                setEvaluatedAt(data._evaluatedAt || null);
                fetch(`/api/quote?symbol=${encodeURIComponent(ticker)}`).then((r) => r.ok ? r.json() : null).then((q) => { if (q?.regularMarketPrice) setQuote({ price: q.regularMarketPrice, change: q.regularMarketChange || 0, changePercent: q.regularMarketChangePercent || 0, currency: q.currency || "USD" }); }).catch(() => {});
              } catch { setError("Network error — please try again"); } finally { setLoading(false); }
            }}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
            {t("moatReportRegenerate")}
          </button>
          <TierFeatureBadge requiredPlan="pro" size="xs" />
        </div>
      </div>

      {/* Company description */}
      {typeof evaluation.overview?.description === "string" && evaluation.overview.description.length > 0 && (
        <p className="text-[13px] leading-relaxed text-[var(--muted)] -mt-2">
          {evaluation.overview.description}
        </p>
      )}

      {/* Score + Criteria Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <MoatScoreGauge
          score={evaluation.totalScore}
          maxScore={evaluation.maxScore}
          verdict={evaluation.verdict}
          passedCount={evaluation.passedCount}
          criteriaCount={evaluation.criteriaCount}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {evaluation.criteria.map((c) => (
            <CriterionCard key={c.key} criterion={c} />
          ))}
        </div>
      </div>

      {/* AI Narrative Assessment */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("moatEvalAiTitle")}</h2>
          {!aiLoading && (
            <button
              onClick={fetchAiNarrative}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {aiText ? t("moatEvalAiRegenerate") : t("moatEvalAiGenerate")}
            </button>
          )}
          {aiLoading && (
            <span className="text-xs text-[var(--muted)] flex items-center gap-2">
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-violet-500" />
              {t("moatEvalAiGenerating")}
            </span>
          )}
        </div>

        {aiError && (
          <p className="text-sm text-red-500 mb-3">{aiError}</p>
        )}

        {aiText ? (
          <>
            <AiMarkdown text={aiText} />
            <div className="mt-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg text-[11px] text-amber-600 dark:text-amber-400">
              {t("moatEvalAiDisclaimer")}
            </div>
          </>
        ) : !aiLoading && (
          <div className="text-center py-6 text-[var(--muted)] text-sm">
            <p>{t("moatEvalAiPlaceholder")}</p>
            <p className="text-[11px] mt-1">{t("moatEvalAiTokenNote")}</p>
          </div>
        )}
      </div>

      {/* Valuation Assessment */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
          {t("moatEvalValuationTitle")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ValuationCard label={t("moatEvalPE")} value={v.peRatio != null ? v.peRatio.toFixed(1) : "N/A"} note={v.sellTrigger ? t("moatEvalSellTrigger") : t("moatEvalBelowTrigger")} description={t("moatEvalPEDesc")} warn={v.sellTrigger} />
          <ValuationCard label={t("moatEvalForwardPE")} value={v.forwardPE != null ? v.forwardPE.toFixed(1) : "N/A"} note={t("moatEvalAnalystEst")} description={t("moatEvalForwardPEDesc")} />
          <ValuationCard label={t("moatEvalPEG")} value={v.pegRatio != null ? v.pegRatio.toFixed(2) : "N/A"} note={t("moatEvalGrowthAdj")} description={t("moatEvalPEGDesc")} />
          <ValuationCard label={t("moatEvalAugPayout")} value={v.augmentedPayoutRatio != null ? `${v.augmentedPayoutRatio.toFixed(0)}%` : "N/A"} note={t("moatEvalDivBuybacks")} description={t("moatEvalAugPayoutDesc")} highlight={v.augmentedPayoutRatio != null && v.augmentedPayoutRatio > 0} />
        </div>
        {v.sellTrigger && (
          <div className="mt-3 p-3 bg-red-500/8 border border-red-500/20 rounded-lg text-[12px] text-red-500 text-center">
            {t("moatEvalSellWarning")}
          </div>
        )}
      </div>

      {/* 10-Year Trends */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 3v18h18" /><path d="M19 9l-5 5-4-4-3 3" /></svg>
          {t("moatEvalTrendsTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {evaluation.criteria
            .filter((c) => c.trend.length > 0)
            .slice(0, 4)
            .map((c) => (
              <TrendChart key={c.key} label={c.name} data={c.trend} status={c.status} />
            ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-[11px] text-[var(--muted)] pt-4 border-t border-[var(--border)]">
        {t("moatEvalDisclaimer")}
      </div>
    </main>
  );
}

function ValuationCard({ label, value, note, description, warn, highlight }: {
  label: string;
  value: string;
  note: string;
  description?: string;
  warn?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-4 text-center group relative">
      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${warn ? "text-red-500" : highlight ? "text-emerald-500" : ""}`}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--muted)] mt-0.5">{note}</div>
      {description && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted)] leading-relaxed text-left">
          {description}
        </div>
      )}
    </div>
  );
}

function TrendChart({ label, data, status }: { label: string; data: number[]; status: string }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map(Math.abs), 0.01);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 0.01);
  const svgW = 400;
  const svgH = 100;
  const padding = 4;

  const points = data.map((v, i) => {
    const x = padding + ((svgW - 2 * padding) * i) / Math.max(data.length - 1, 1);
    const y = svgH - padding - ((v - min) / range) * (svgH - 2 * padding);
    return `${x},${y}`;
  });

  const lineColor = status === "pass" ? "var(--gain)" : status === "warning" ? "#f59e0b" : "var(--loss)";
  const fillPoints = `${padding},${svgH - padding} ${points.join(" ")} ${svgW - padding},${svgH - padding}`;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-4">
      <h3 className="text-[13px] font-semibold text-[var(--muted)] mb-3">{label}</h3>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" className="w-full h-24">
        <defs>
          <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill={`url(#grad-${label.replace(/\s/g, "")})`} />
        <polyline points={points.join(" ")} fill="none" stroke={lineColor} strokeWidth="2" />
      </svg>
    </div>
  );
}
