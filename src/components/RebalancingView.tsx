"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, resolveQuoteCurrency, formatCurrency } from "@/lib/utils";
import BlurredProSection from "./BlurredProSection";
import AiMarkdown from "./AiMarkdown";
import type {
  Holding,
  QuoteData,
  RebalanceTarget,
  RebalanceDrift,
  RebalanceMove,
  ETFSectorWeight,
} from "@/lib/types";
import { computeTaxonomyAllocationsWithEtfSectorLookthrough } from "@/lib/services/taxonomy";
import { holdingIsEtfLike } from "@/lib/services/etf-lookthrough";

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

const SPARKLE_PATH = "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z";

type Category = "assetClass" | "sector" | "region" | "exchange";

interface BucketAlloc {
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
}

function SectionBadge({ n, variant = "default" }: { n: number; variant?: "default" | "ai" }) {
  const base = variant === "ai"
    ? "bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400"
    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400";
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border mr-2 flex-shrink-0 ${base}`}>
      {n}
    </span>
  );
}

function AiInsightStrip({ text, cta, isPro, onClick }: { text: React.ReactNode; cta: string; isPro: boolean; onClick?: () => void }) {
  if (!isPro) return null;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-violet-50/50 dark:bg-violet-500/[0.04] border border-violet-200/60 dark:border-violet-500/20 text-left hover:border-violet-300 dark:hover:border-violet-500/40 transition-colors group"
    >
      <svg className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-0.5 flex-shrink-0 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d={SPARKLE_PATH} />
      </svg>
      <span className="flex-1 text-[11px] leading-relaxed text-gray-600 dark:text-slate-400">{text}</span>
      <span className="flex-shrink-0 text-[10px] font-semibold text-violet-600 dark:text-violet-400 whitespace-nowrap mt-0.5 group-hover:underline">{cta} →</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

export default function RebalancingView() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { holdings, quotes, exchangeRates, activePortfolioCurrency, refreshHoldings } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const isAdmin = user?.role === "admin";
  const isPro = user?.plan === "pro" || user?.plan === "starter" || isAdmin;

  const [targets, setTargets] = useState<RebalanceTarget[]>([]);
  const [category, setCategory] = useState<Category>("sector");
  const [enriching, setEnriching] = useState(false);
  const enrichAttempted = useRef(false);
  const [etfSectorLookthrough, setEtfSectorLookthrough] = useState(true);
  const [etfSectorWeights, setEtfSectorWeights] = useState<Record<string, ETFSectorWeight[] | null>>({});

  useEffect(() => {
    fetch("/api/rebalance-targets").then((r) => r.ok ? r.json() : []).then(setTargets);
  }, []);

  useEffect(() => {
    if (enrichAttempted.current || holdings.length === 0) return;
    const unclassified = holdings.filter((h) => !h.sector && !h.region && !h.assetClass);
    if (unclassified.length === 0) return;
    enrichAttempted.current = true;
    setEnriching(true);
    fetch("/api/holdings/autofill-classification", { method: "POST" })
      .then(() => refreshHoldings())
      .catch(() => {})
      .finally(() => setEnriching(false));
  }, [holdings, refreshHoldings]);

  useEffect(() => {
    if (category !== "sector" || !etfSectorLookthrough) return;
    const tickers = [
      ...new Set(
        holdings
          .filter((h) => holdingIsEtfLike(h, quotes[h.ticker]))
          .map((h) => h.ticker.toUpperCase()),
      ),
    ];
    let cancelled = false;
    if (tickers.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) setEtfSectorWeights({});
      });
      return () => {
        cancelled = true;
      };
    }
    fetch("/api/etf/sector-weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { byTicker?: Record<string, ETFSectorWeight[] | null> }) => {
        if (!cancelled && data?.byTicker) setEtfSectorWeights(data.byTicker);
      })
      .catch(() => {
        if (!cancelled) setEtfSectorWeights({});
      });
    return () => {
      cancelled = true;
    };
  }, [holdings, quotes, category, etfSectorLookthrough]);

  const allocations = useMemo((): BucketAlloc[] => {
    if (category === "sector" && etfSectorLookthrough) {
      const tax = computeTaxonomyAllocationsWithEtfSectorLookthrough(
        holdings,
        quotes,
        exchangeRates,
        "sector",
        t("unclassified"),
        etfSectorWeights,
        true,
      );
      return tax.map((a) => ({
        label: a.label,
        valueEUR: a.valueEUR,
        percent: a.percent,
        color: a.color,
      }));
    }
    const buckets: Record<string, number> = {};
    let total = 0;
    holdings.forEach((h) => {
      const q = quotes[h.ticker];
      let valueEUR = 0;
      if (q && q.regularMarketPrice > 0) {
        const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
        valueEUR = convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
      }
      total += valueEUR;
      let label: string;
      if (category === "exchange") {
        label = h.exchange || t("unclassified");
      } else {
        label = (h[category as keyof typeof h] as string) || "";
        if (!label && category === "sector" && h.assetClass && h.assetClass !== "stock") {
          label = h.assetClass.toUpperCase() === "ETF" ? t("etfFundLabel") : h.assetClass;
        }
        if (!label) label = t("unclassified");
      }
      buckets[label] = (buckets[label] || 0) + valueEUR;
    });
    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .map(([label, valueEUR], i) => ({
        label,
        valueEUR,
        percent: total > 0 ? (valueEUR / total) * 100 : 0,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
  }, [holdings, quotes, exchangeRates, category, t, etfSectorLookthrough, etfSectorWeights]);

  const totalValue = useMemo(
    () => allocations.reduce((s, a) => s + a.valueEUR, 0),
    [allocations],
  );

  const categoryTargets = targets.filter((tgt) => tgt.category === category);

  const drifts = useMemo((): (RebalanceDrift & { color: string })[] => {
    const bucketMap = Object.fromEntries(allocations.map((a) => [a.label, a]));

    const allLabels = new Set([
      ...allocations.map((a) => a.label),
      ...categoryTargets.map((t) => t.label),
    ]);

    return Array.from(allLabels).map((label) => {
      const alloc = bucketMap[label];
      const tgt = categoryTargets.find((ct) => ct.label === label);
      const valueEUR = alloc?.valueEUR || 0;
      const actualPercent = totalValue > 0 ? (valueEUR / totalValue) * 100 : 0;
      const targetPercent = tgt?.targetPercent ?? actualPercent;
      const driftPercent = actualPercent - targetPercent;
      const actionEUR = totalValue > 0 ? (targetPercent / 100) * totalValue - valueEUR : 0;
      return {
        label,
        targetPercent,
        actualPercent,
        driftPercent,
        valueEUR,
        actionEUR,
        color: alloc?.color || PIE_COLORS[0],
      };
    }).sort((a, b) => b.actualPercent - a.actualPercent);
  }, [allocations, categoryTargets, totalValue]);

  const handleSaveTarget = async (label: string, percent: number) => {
    const res = await fetch("/api/rebalance-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, label, targetPercent: percent }),
    });
    if (res.ok) {
      const saved = await res.json();
      setTargets((prev) => [...prev.filter((t) => t.id !== saved.id), saved]);
    }
  };

  return (
    <div className="space-y-4">
      <AllocationOverview
        allocations={allocations}
        drifts={drifts}
        totalValue={totalValue}
        category={category}
        onCategoryChange={setCategory}
        onSaveTarget={handleSaveTarget}
        baseCurrency={baseCurrency}
        isPro={isPro}
        language={language}
        enriching={enriching}
        etfSectorLookthrough={etfSectorLookthrough}
        onEtfSectorLookthroughChange={setEtfSectorLookthrough}
      />
      <ExposureAnalysis drifts={drifts} isPro={isPro} />
      <RebalancingActions
        drifts={drifts}
        totalValue={totalValue}
        baseCurrency={baseCurrency}
        isPro={isPro}
        language={language}
        holdings={holdings}
        quotes={quotes}
        exchangeRates={exchangeRates}
      />
      <RebalancingScreener isPro={isPro} />
      <AiRebalancingPanel
        drifts={drifts}
        totalValue={totalValue}
        isPro={isPro}
        language={language}
        category={category}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 1: Allocation Overview                           */
/* ═══════════════════════════════════════════════════════════ */

function AllocationOverview({
  allocations,
  drifts,
  totalValue,
  category,
  onCategoryChange,
  onSaveTarget,
  baseCurrency,
  isPro,
  language,
  enriching,
  etfSectorLookthrough,
  onEtfSectorLookthroughChange,
}: {
  allocations: BucketAlloc[];
  drifts: (RebalanceDrift & { color: string })[];
  totalValue: number;
  category: Category;
  onCategoryChange: (c: Category) => void;
  onSaveTarget: (label: string, percent: number) => void;
  baseCurrency: string;
  isPro: boolean;
  language: string;
  enriching: boolean;
  etfSectorLookthrough: boolean;
  onEtfSectorLookthroughChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const categories: { key: Category; label: string }[] = [
    { key: "sector", label: t("sector") },
    { key: "assetClass", label: t("assetClass") },
    { key: "region", label: t("region") },
    { key: "exchange", label: t("exchange") },
  ];

  const totalTarget = drifts.reduce((s, d) => s + d.targetPercent, 0);
  const biggestOver = drifts.filter((d) => d.driftPercent > 2).sort((a, b) => b.driftPercent - a.driftPercent)[0];

  const [suggestedTargets, setSuggestedTargets] = useState<Record<string, number> | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestRationale, setSuggestRationale] = useState("");
  const suggestAbortRef = useRef<AbortController | null>(null);

  const handleSuggestTargets = useCallback(async () => {
    if (!isPro || drifts.length === 0) return;
    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;
    setSuggestLoading(true);
    setSuggestedTargets(null);
    setSuggestRationale("");

    const allocationData = {
      totalValueEUR: totalValue,
      category,
      buckets: drifts.map((d) => ({
        label: d.label,
        actualPercent: d.actualPercent,
        currentTarget: d.targetPercent,
        valueEUR: d.valueEUR,
      })),
    };

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "rebalancing_suggest_targets",
          allocationData,
          language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setSuggestRationale(t("aiSuggestError"));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSuggestRationale(text);
      }
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          if (typeof parsed === "object" && parsed !== null) {
            const targets: Record<string, number> = {};
            for (const [key, val] of Object.entries(parsed)) {
              if (typeof val === "number") targets[key] = val;
            }
            if (Object.keys(targets).length > 0) setSuggestedTargets(targets);
          }
        } catch { /* ignore parse errors */ }
      }
      const clean = text
        .replace(/```json\s*[\s\S]*?```/g, "")
        .replace(/\[TOKENS:\d+\]/g, "")
        .trim();
      setSuggestRationale(clean);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setSuggestRationale(t("aiSuggestError"));
    } finally {
      setSuggestLoading(false);
    }
  }, [isPro, drifts, totalValue, category, language, t]);

  const handleApplyAll = () => {
    if (!suggestedTargets) return;
    for (const [label, pct] of Object.entries(suggestedTargets)) {
      onSaveTarget(label, pct);
    }
    setSuggestedTargets(null);
    setSuggestRationale("");
  };

  const handleDismissSuggestions = () => {
    setSuggestedTargets(null);
    setSuggestRationale("");
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center">
              <SectionBadge n={1} />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("allocationOverview")}</h3>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 ml-7">{t("allocationOverviewDesc")}</p>
          </div>
          {isPro && (
            <button
              onClick={handleSuggestTargets}
              disabled={suggestLoading}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 transition-all shadow-sm flex-shrink-0"
            >
              {suggestLoading ? (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d={SPARKLE_PATH} /></svg>
              )}
              <span className="hidden sm:inline">{suggestLoading ? t("aiSuggestLoading") : t("aiSuggestTargets")}</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 ml-7 sm:ml-0 sm:justify-end">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => onCategoryChange(c.key)}
              className={`text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                category === c.key ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {category === "sector" && (
          <label className="flex items-start gap-2 ml-7 mt-2 max-w-lg text-left cursor-pointer">
            <input
              type="checkbox"
              checked={etfSectorLookthrough}
              onChange={(e) => onEtfSectorLookthroughChange(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 dark:border-slate-600"
            />
            <span className="text-[10px] text-gray-600 dark:text-slate-400">
              <span className="font-medium text-gray-800 dark:text-slate-200">{t("etfSectorLookthroughLabel")}</span>
              <span className="block text-gray-500 dark:text-slate-500 mt-0.5">{t("etfSectorLookthroughHint")}</span>
            </span>
          </label>
        )}
      </div>

      {enriching && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-500/[0.06] border border-sky-200/60 dark:border-sky-500/20 text-[11px] text-sky-700 dark:text-sky-400">
          <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          {t("enrichingClassifications")}
        </div>
      )}

      {suggestRationale && (
        <div className="mb-4 p-3 rounded-lg bg-violet-50/60 dark:bg-violet-500/[0.06] border border-violet-200/60 dark:border-violet-500/20">
          <div className="flex items-start gap-2 mb-2">
            <svg className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d={SPARKLE_PATH} /></svg>
            <div className="flex-1 text-xs text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              <AiMarkdown text={suggestRationale} compact />
            </div>
          </div>
          {suggestedTargets && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-violet-200/40 dark:border-violet-500/15">
              <button
                onClick={handleDismissSuggestions}
                className="text-[10px] font-medium px-3 py-1 rounded-md text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t("dismiss")}
              </button>
              <button
                onClick={handleApplyAll}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1 rounded-md bg-violet-500 text-white hover:bg-violet-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                {t("applyAllSuggestions")}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <div className="flex justify-center">
          <DonutChart allocations={allocations} totalValue={totalValue} baseCurrency={baseCurrency} />
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-xs min-w-[480px]">
            <thead className="text-gray-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-2 font-medium">{t("bucket")}</th>
                <th className="text-right p-2 font-medium">{t("currentPercent")}</th>
                <th className="text-right p-2 font-medium">{t("value")}</th>
                <th className="text-right p-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    {t("targetAllocation")}
                    <svg className="w-3 h-3 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </span>
                </th>
                <th className="text-right p-2 font-medium">{t("drift")}</th>
              </tr>
            </thead>
            <tbody>
              {drifts.map((d) => (
                <DriftRow
                  key={d.label}
                  drift={d}
                  baseCurrency={baseCurrency}
                  onSaveTarget={onSaveTarget}
                  suggestedTarget={suggestedTargets?.[d.label] ?? null}
                />
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-2 px-2">
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {t("totalTarget")}: <span className={`font-medium ${Math.abs(totalTarget - 100) < 0.1 ? "text-emerald-500" : "text-amber-500"}`}>{totalTarget.toFixed(1)}%</span>
            </div>
            <div className="text-[9px] text-gray-400 dark:text-slate-500 italic">
              {t("clickTargetToEdit")}
            </div>
          </div>
        </div>
      </div>

      {biggestOver && (
        <AiInsightStrip
          isPro={isPro}
          text={<><strong className="text-gray-900 dark:text-white">{t("overexposedAtPct").replace("{label}", biggestOver.label).replace("{pct}", biggestOver.actualPercent.toFixed(1))}</strong> — {t("driftFromTarget").replace("{drift}", biggestOver.driftPercent.toFixed(1)).replace("{target}", biggestOver.targetPercent.toFixed(1))}</>}
          cta={t("askAi")}
        />
      )}
    </div>
  );
}

function DriftRow({ drift: d, baseCurrency, onSaveTarget, suggestedTarget }: {
  drift: RebalanceDrift & { color: string };
  baseCurrency: string;
  onSaveTarget: (label: string, percent: number) => void;
  suggestedTarget?: number | null;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(d.targetPercent.toFixed(1));
  const driftColor = Math.abs(d.driftPercent) < 2
    ? "text-gray-500 dark:text-slate-400"
    : d.driftPercent > 0
      ? "text-red-500 dark:text-red-400"
      : "text-emerald-600 dark:text-emerald-400";

  const hasSuggestion = suggestedTarget != null && Math.abs(suggestedTarget - d.targetPercent) > 0.05;

  return (
    <tr className="border-t border-gray-100 dark:border-slate-700 group">
      <td className="p-2 font-medium text-gray-900 dark:text-white">
        <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: d.color }} />
        {d.label}
        {d.actualPercent > 30 && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            {t("overexposed")}
          </span>
        )}
      </td>
      <td className="p-2 text-right font-mono">{d.actualPercent.toFixed(1)}%</td>
      <td className="p-2 text-right font-mono text-gray-500 dark:text-slate-400">{formatCurrency(d.valueEUR, baseCurrency)}</td>
      <td className="p-2 text-right">
        {editing ? (
          <input
            autoFocus
            className="w-14 text-xs px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-slate-800 text-right font-mono"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { setEditing(false); const n = parseFloat(val); if (!isNaN(n)) onSaveTarget(d.label, n); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        ) : (
          <div className="flex items-center justify-end gap-1">
            {hasSuggestion && (
              <button
                onClick={() => onSaveTarget(d.label, suggestedTarget!)}
                title={`${t("applySuggestion")}: ${suggestedTarget!.toFixed(1)}%`}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 hover:bg-violet-200 dark:hover:bg-violet-500/25 transition-colors whitespace-nowrap"
              >
                {suggestedTarget!.toFixed(1)}%
              </button>
            )}
            <button
              onClick={() => { setVal(d.targetPercent.toFixed(1)); setEditing(true); }}
              className="inline-flex items-center gap-1 font-mono text-gray-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {d.targetPercent.toFixed(1)}%
              <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          </div>
        )}
      </td>
      <td className={`p-2 text-right font-mono font-medium ${driftColor}`}>
        {d.driftPercent > 0 ? "+" : ""}{d.driftPercent.toFixed(1)}%
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Donut Chart (SVG)                                        */
/* ═══════════════════════════════════════════════════════════ */

function DonutChart({ allocations, totalValue, baseCurrency }: {
  allocations: BucketAlloc[];
  totalValue: number;
  baseCurrency: string;
}) {
  const { t } = useI18n();
  const cx = 90, cy = 90, r = 72, r2 = 50;
  let cumAngle = -90;

  const paths = allocations.map((a) => {
    const angle = (a.percent / 100) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + angle) * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;
    const x1o = cx + r * Math.cos(startRad), y1o = cy + r * Math.sin(startRad);
    const x2o = cx + r * Math.cos(endRad), y2o = cy + r * Math.sin(endRad);
    const x1i = cx + r2 * Math.cos(endRad), y1i = cy + r2 * Math.sin(endRad);
    const x2i = cx + r2 * Math.cos(startRad), y2i = cy + r2 * Math.sin(startRad);
    const d = `M${x1o},${y1o} A${r},${r} 0 ${largeArc} 1 ${x2o},${y2o} L${x1i},${y1i} A${r2},${r2} 0 ${largeArc} 0 ${x2i},${y2i} Z`;
    cumAngle += angle;
    return { d, fill: a.color, label: a.label };
  });

  return (
    <div className="relative w-[180px] h-[180px]">
      <svg viewBox="0 0 180 180" className="w-full h-full">
        {paths.map((p) => (
          <path key={p.label} d={p.d} fill={p.fill} opacity={0.85} className="hover:opacity-100 transition-opacity" />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue, baseCurrency)}</span>
        <span className="text-[10px] text-gray-500 dark:text-slate-400">{t("total")}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 2: Exposure Analysis                             */
/* ═══════════════════════════════════════════════════════════ */

function ExposureAnalysis({ drifts, isPro }: { drifts: (RebalanceDrift & { color: string })[]; isPro: boolean }) {
  const { t } = useI18n();
  const sorted = [...drifts].sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));
  const alerts = sorted.filter((d) => Math.abs(d.driftPercent) >= 1);
  const top3pct = drifts.slice(0, 3).reduce((s, d) => s + d.actualPercent, 0);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center">
            <SectionBadge n={2} />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("exposureAnalysis")}</h3>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 ml-7">{t("exposureAnalysisDesc")}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-slate-400 ml-7 sm:ml-0">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> {t("withinTarget")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> {t("drifting")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> {t("overexposed")}</span>
        </div>
      </div>

      {/* Treemap — wrapping tiles */}
      <div className="flex flex-wrap gap-1 rounded-lg overflow-hidden mb-3">
        {drifts.map((d) => {
          const absDrift = Math.abs(d.driftPercent);
          const borderClass = absDrift > 5 ? "ring-2 ring-red-500/60" : absDrift > 2 ? "ring-2 ring-amber-500/50" : "";
          const widthPct = Math.max(8, d.actualPercent);
          return (
            <div
              key={d.label}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1.5 sm:px-2 text-white text-center rounded-md cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all ${borderClass}`}
              style={{ flexBasis: `${widthPct}%`, flexGrow: d.actualPercent, background: d.color, opacity: 0.85, minHeight: 56 }}
              title={`${d.label}: ${d.actualPercent.toFixed(1)}%`}
            >
              <span className="text-[9px] sm:text-[10px] font-semibold leading-tight drop-shadow-sm truncate max-w-full">{d.label}</span>
              <span className="text-[12px] sm:text-[13px] font-bold drop-shadow-sm mt-0.5">{d.actualPercent.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      {/* Exposure alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((d) => {
            const isOver = d.driftPercent > 0;
            return (
              <div key={d.label} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOver ? "bg-red-500" : "bg-emerald-500"}`} />
                  <span className="text-gray-600 dark:text-slate-300">
                    {isOver ? t("overexposedTo") : t("underexposedTo")} <strong className="text-gray-900 dark:text-white">{d.label}</strong>
                  </span>
                </div>
                <span className={`font-mono font-medium ${isOver ? "text-red-500" : "text-emerald-500"}`}>
                  {d.driftPercent > 0 ? "+" : ""}{d.driftPercent.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <AiInsightStrip
        isPro={isPro}
        text={t("top3SectorsInsight").replace("{category}", t("sector").toLowerCase()).replace("{pct}", top3pct.toFixed(1))}
        cta={t("deepDive")}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 3: Rebalancing Actions                           */
/* ═══════════════════════════════════════════════════════════ */

function RebalancingActions({ drifts, totalValue, baseCurrency, isPro, language, holdings, quotes, exchangeRates }: {
  drifts: (RebalanceDrift & { color: string })[];
  totalValue: number;
  baseCurrency: string;
  isPro: boolean;
  language: string;
  holdings: Holding[];
  quotes: Record<string, QuoteData>;
  exchangeRates: Record<string, number>;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"add" | "move">("add");
  const [newCapital, setNewCapital] = useState("5000");
  const [moves, setMoves] = useState<RebalanceMove[]>([]);
  const [moveSource, setMoveSource] = useState("");
  const [moveDest, setMoveDest] = useState("");
  const [moveAmount, setMoveAmount] = useState("");

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);

  const overweight = drifts.filter((d) => d.driftPercent > 1).sort((a, b) => b.driftPercent - a.driftPercent);
  const underweight = drifts.filter((d) => d.driftPercent < -1).sort((a, b) => a.driftPercent - b.driftPercent);
  const hasCustomTargets = underweight.length > 0 || overweight.length > 0;

  const amount = parseFloat(newCapital) || 0;
  const totalDeficit = underweight.reduce((s, d) => s + Math.abs(d.driftPercent), 0);

  const distributions = useMemo(() => {
    if (hasCustomTargets && underweight.length > 0) {
      return underweight.map((d) => ({
        ...d,
        alloc: totalDeficit > 0 ? Math.round(amount * (Math.abs(d.driftPercent) / totalDeficit)) : 0,
      }));
    }
    const totalPct = drifts.reduce((s, d) => s + d.targetPercent, 0);
    return drifts
      .filter((d) => d.actualPercent > 0)
      .map((d) => ({
        ...d,
        alloc: totalPct > 0 ? Math.round(amount * (d.targetPercent / totalPct)) : 0,
      }));
  }, [hasCustomTargets, underweight, drifts, totalDeficit, amount]);

  const holdingsBySector = useMemo(() => {
    const map: Record<string, { ticker: string; valueEUR: number }[]> = {};
    holdings.forEach((h) => {
      const q = quotes[h.ticker];
      if (!q || q.regularMarketPrice <= 0) return;
      const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
      const valueEUR = convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
      const sector = h.sector || "Other";
      if (!map[sector]) map[sector] = [];
      map[sector].push({ ticker: h.ticker, valueEUR });
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => b.valueEUR - a.valueEUR));
    return map;
  }, [holdings, quotes, exchangeRates]);

  const handleAddMove = () => {
    if (!moveSource || !moveDest || !moveAmount) return;
    const amt = parseFloat(moveAmount);
    if (isNaN(amt) || amt <= 0) return;
    setMoves((prev) => [...prev, {
      id: Date.now().toString(),
      sourceLabel: moveSource,
      destLabel: moveDest,
      amountEUR: amt,
    }]);
    setMoveAmount("");
  };

  const requestAiEvaluation = useCallback(async () => {
    if (!isPro) return;
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiLoading(true);
    setAiSummary("");

    const allocationData = {
      totalValueEUR: totalValue,
      buckets: drifts.map((d) => ({
        label: d.label,
        actualPercent: d.actualPercent,
        targetPercent: d.targetPercent,
        driftPercent: d.driftPercent,
        valueEUR: d.valueEUR,
      })),
    };

    const rebalancePlan = mode === "add"
      ? { mode: "add_money", newCapitalEUR: amount, allocations: distributions.map((d) => ({ label: d.label, amountEUR: d.alloc })) }
      : { mode: "move_funds", moves };

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "rebalancing_assistant",
          allocationData,
          rebalancePlan,
          language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) { setAiSummary(t("aiAnalysisError")); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiSummary(text);
      }
      setAiSummary(text.replace(/\[TOKENS:\d+\]/g, "").trim());
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAiSummary(t("aiUnavailable"));
    } finally {
      setAiLoading(false);
    }
  }, [isPro, totalValue, drifts, mode, amount, distributions, moves, language, t]);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center">
            <SectionBadge n={3} />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("rebalancingActions")}</h3>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 ml-7">{t("rebalancingActionsDesc")}</p>
        </div>
        <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5 ml-7 sm:ml-0 self-start sm:self-auto">
          <button onClick={() => setMode("add")} className={`text-[10px] font-medium px-2.5 py-1.5 rounded-md transition-colors ${mode === "add" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-slate-400"}`}>
            {t("addMoney")}
          </button>
          <button onClick={() => setMode("move")} className={`text-[10px] font-medium px-2.5 py-1.5 rounded-md transition-colors ${mode === "move" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-slate-400"}`}>
            {t("moveFunds")}
          </button>
        </div>
      </div>

      {mode === "add" ? (
        <>
          <div className="flex items-end gap-3 mb-4">
            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 block mb-1">{t("newCapitalToInvest")}</label>
              <input
                type="number"
                className="w-40 text-lg font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                value={newCapital}
                onChange={(e) => setNewCapital(e.target.value)}
              />
            </div>
            <button
              onClick={requestAiEvaluation}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              {t("calculate")}
            </button>
          </div>

          {amount > 0 && distributions.length > 0 && (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              {!hasCustomTargets && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                  {t("noTargetsHint")}
                </div>
              )}
              <table className="w-full text-xs min-w-[540px]">
                <thead className="text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left p-2 font-medium">{t("bucket")}</th>
                    <th className="text-right p-2 font-medium">{hasCustomTargets ? t("underweight") : t("currentPercent")}</th>
                    <th className="text-right p-2 font-medium">{t("allocate")}</th>
                    <th className="text-left p-2 font-medium pl-4">{t("holdingsToBuy")}</th>
                    <th className="text-right p-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d) => {
                    const sectorHoldings = holdingsBySector[d.label] || [];
                    const topHoldings = sectorHoldings.slice(0, 3);
                    const sectorTotal = sectorHoldings.reduce((s, x) => s + x.valueEUR, 0);
                    return (
                      <tr key={d.label} className="border-t border-gray-100 dark:border-slate-700">
                        <td className="p-2 font-medium text-gray-900 dark:text-white">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: d.color }} />
                          {d.label}
                        </td>
                        <td className={`p-2 text-right font-mono ${hasCustomTargets ? "text-red-500" : "text-gray-500 dark:text-slate-400"}`}>
                          {hasCustomTargets ? `${d.driftPercent.toFixed(1)}%` : `${d.actualPercent.toFixed(1)}%`}
                        </td>
                        <td className="p-2 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(d.alloc, baseCurrency)}</td>
                        <td className="p-2 pl-4">
                          <div className="flex flex-wrap gap-1">
                            {topHoldings.length > 0 ? topHoldings.map((h) => (
                              <span key={h.ticker} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300">
                                <span className="font-semibold text-gray-900 dark:text-white">{h.ticker.split(".")[0]}</span>
                                {formatCurrency(sectorTotal > 0 ? Math.round(d.alloc * (h.valueEUR / sectorTotal)) : 0, baseCurrency)}
                              </span>
                            )) : (
                              <span className="text-[10px] text-gray-400 dark:text-slate-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <button className="text-[10px] font-medium px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors whitespace-nowrap">
                            {t("findStocks")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {amount > 0 && distributions.length > 0 && (
            <BeforeAfterBars drifts={drifts} distributions={distributions} totalValue={totalValue} amount={amount} baseCurrency={baseCurrency} />
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start mb-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">{t("sourceOverweight")}</div>
              <select className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={moveSource} onChange={(e) => setMoveSource(e.target.value)}>
                <option value="">—</option>
                {overweight.map((d) => <option key={d.label} value={d.label}>{d.label} (+{d.driftPercent.toFixed(1)}%)</option>)}
              </select>
              {moveSource && (
                <div className="mt-2">
                  <div className="text-[9px] text-gray-500 dark:text-slate-400 mb-1">{t("sellFrom")}:</div>
                  <div className="flex flex-wrap gap-1">
                    {(holdingsBySector[moveSource] || []).slice(0, 3).map((h) => (
                      <span key={h.ticker} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300">
                        <span className="font-semibold text-gray-900 dark:text-white">{h.ticker.split(".")[0]}</span>
                        {formatCurrency(h.valueEUR, baseCurrency)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center py-1 sm:pt-6 text-emerald-500">
              <svg className="w-6 h-6 sm:rotate-0 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">{t("destinationUnderweight")}</div>
              <select className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={moveDest} onChange={(e) => setMoveDest(e.target.value)}>
                <option value="">—</option>
                {underweight.map((d) => <option key={d.label} value={d.label}>{d.label} ({d.driftPercent.toFixed(1)}%)</option>)}
              </select>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-slate-400">{baseCurrency}</span>
                <input
                  type="number"
                  className="flex-1 text-xs font-semibold px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              {moveDest && (
                <div className="mt-2">
                  <div className="text-[9px] text-gray-500 dark:text-slate-400 mb-1">{t("buyInto")}:</div>
                  <div className="flex flex-wrap gap-1">
                    {(holdingsBySector[moveDest] || []).slice(0, 3).map((h) => (
                      <span key={h.ticker} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300">
                        <span className="font-semibold text-gray-900 dark:text-white">{h.ticker.split(".")[0]}</span>
                        {formatCurrency(h.valueEUR, baseCurrency)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mb-4">
            <button onClick={handleAddMove} className="text-xs font-medium px-4 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
              {t("addToQueue")}
            </button>
          </div>

          {moves.length > 0 && (
            <div className="space-y-1.5 mb-4">
              <div className="text-xs font-semibold text-gray-900 dark:text-white">{t("plannedMoves")}</div>
              {moves.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500">{m.sourceLabel}</span>
                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                    <span className="text-emerald-500">{m.destLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-emerald-600">{formatCurrency(m.amountEUR, baseCurrency)}</span>
                    <button onClick={() => setMoves((p) => p.filter((x) => x.id !== m.id))} className="text-gray-400 hover:text-red-500">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={requestAiEvaluation} disabled={!isPro} className="mt-2 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50">
                {t("aiPlanEvaluation")} →
              </button>
            </div>
          )}
        </>
      )}

      {/* AI Feedback */}
      {isPro && (aiSummary || aiLoading) && (
        <div className="mt-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={SPARKLE_PATH} />
            </svg>
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">{mode === "add" ? t("aiPlanEvaluation") : t("aiMoveEvaluation")}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
          </div>
          {aiLoading && !aiSummary && (
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
              {t("analyzing")}
            </div>
          )}
          {aiSummary && <AiMarkdown text={aiSummary} compact />}
        </div>
      )}
    </div>
  );
}

function BeforeAfterBars({ drifts, distributions, totalValue, amount, baseCurrency }: {
  drifts: (RebalanceDrift & { color: string })[];
  distributions: { label: string; alloc: number; driftPercent: number; color: string; actualPercent: number }[];
  totalValue: number;
  amount: number;
  baseCurrency: string;
}) {
  const { t } = useI18n();
  const newTotal = totalValue + amount;
  const allocMap = Object.fromEntries(distributions.map((d) => [d.label, d.alloc]));

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
      <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">{t("beforeAfterComparison")}</div>
      <div className="space-y-1.5">
        {drifts.slice(0, 10).map((d) => {
          const afterValue = d.valueEUR + (allocMap[d.label] || 0);
          const afterPct = newTotal > 0 ? (afterValue / newTotal) * 100 : 0;
          return (
            <div key={d.label} className="flex items-center gap-2 text-[10px]">
              <span className="w-28 truncate text-right text-gray-600 dark:text-slate-400">{d.label}</span>
              <div className="flex-1 h-[18px] bg-gray-200/50 dark:bg-slate-700/30 rounded relative overflow-hidden">
                <div className="absolute h-full rounded opacity-40" style={{ width: `${Math.min(d.actualPercent * 2, 100)}%`, background: d.color }} />
                <div className="absolute h-full rounded" style={{ width: `${Math.min(afterPct * 2, 100)}%`, background: d.color }} />
              </div>
              <span className="w-10 text-right font-mono font-semibold text-gray-600 dark:text-slate-400">{afterPct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 4: Industry Screener                             */
/* ═══════════════════════════════════════════════════════════ */

function RebalancingScreener({ isPro }: { isPro: boolean }) {
  const { t } = useI18n();
  const [sectors, setSectors] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ symbol: string; shortName: string; industry: string; regularMarketPrice: number | null; dividendYield: number | null; peRatio: number | null; marketCap: number | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro) return;
    fetch("/api/screener?action=meta").then((r) => r.ok ? r.json() : {}).then((d: Record<string, unknown>) => {
      if (Array.isArray(d.sectors)) setSectors(d.sectors as string[]);
      if (Array.isArray(d.industries)) setIndustries(d.industries as string[]);
    });
  }, [isPro]);

  useEffect(() => {
    if (!isPro || !sector) return;
    fetch(`/api/screener?action=meta&sector=${encodeURIComponent(sector)}`)
      .then((r) => r.ok ? r.json() : {})
      .then((d: Record<string, unknown>) => { if (Array.isArray(d.industries)) setIndustries(d.industries as string[]); });
  }, [isPro, sector]);

  const doSearch = useCallback(() => {
    if (!isPro) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "10", sortBy: "dividendYield", sortDir: "desc" });
    if (sector) params.set("sector", sector);
    if (industry) params.set("industry", industry);
    fetch(`/api/screener?${params}`).then((r) => r.ok ? r.json() : { results: [] }).then((d) => {
      setResults(d.results || []);
    }).finally(() => setLoading(false));
  }, [isPro, sector, industry]);

  useEffect(() => { if (sector) doSearch(); }, [sector, industry, doSearch]);

  const fmtMc = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 1e12) return `€${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `€${(n / 1e9).toFixed(0)}B`;
    if (n >= 1e6) return `€${(n / 1e6).toFixed(0)}M`;
    return `€${n.toLocaleString()}`;
  };

  const content = (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <input
          className="text-xs px-2.5 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 w-full"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="text-xs px-2 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white w-full" value={sector} onChange={(e) => { setSector(e.target.value); setIndustry(""); }}>
          <option value="">{t("sectorAll")}</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="text-xs px-2 py-2 sm:py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white w-full" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">{t("industryAll")}</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">{t("loading")}</div>
      ) : results.length > 0 ? (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="text-gray-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-2 font-medium">{t("ticker")}</th>
                <th className="text-left p-2 font-medium">{t("name")}</th>
                <th className="text-left p-2 font-medium">{t("industry")}</th>
                <th className="text-right p-2 font-medium">{t("currentPrice")}</th>
                <th className="text-right p-2 font-medium">{t("divYield")}</th>
                <th className="text-right p-2 font-medium">{t("peRatio")}</th>
                <th className="text-right p-2 font-medium">{t("mktCap")}</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.filter((r) => !search || r.symbol.toLowerCase().includes(search.toLowerCase()) || r.shortName.toLowerCase().includes(search.toLowerCase())).map((r) => (
                <tr key={r.symbol} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="p-2 font-semibold text-emerald-600 dark:text-emerald-400">{r.symbol}</td>
                  <td className="p-2 text-gray-900 dark:text-white">{r.shortName}</td>
                  <td className="p-2 text-gray-500 dark:text-slate-400">{r.industry}</td>
                  <td className="p-2 text-right font-mono">{r.regularMarketPrice != null ? `€${r.regularMarketPrice.toFixed(2)}` : "—"}</td>
                  <td className="p-2 text-right font-mono text-emerald-600">{r.dividendYield != null ? `${(r.dividendYield * 100).toFixed(1)}%` : "—"}</td>
                  <td className="p-2 text-right font-mono">{r.peRatio != null ? r.peRatio.toFixed(1) : "—"}</td>
                  <td className="p-2 text-right font-mono text-gray-500 dark:text-slate-400">{fmtMc(r.marketCap)}</td>
                  <td className="p-2 text-right">
                    <button className="text-[10px] font-medium px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors whitespace-nowrap">
                      {t("addToPlan")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : sector ? (
        <div className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">{t("noResults")}</div>
      ) : (
        <div className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">{t("selectSectorToSearch")}</div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <SectionBadge n={4} />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("industryScreener")}</h3>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 ml-7">{t("industryScreenerDesc")}</p>
        </div>
      </div>

      {isPro ? content : (
        <BlurredProSection blurb={t("upgradeScreenerBlurb")}>
          {content}
        </BlurredProSection>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 5: AI Rebalancing Assistant                      */
/* ═══════════════════════════════════════════════════════════ */

function AiRebalancingPanel({ drifts, totalValue, isPro, language, category }: {
  drifts: (RebalanceDrift & { color: string })[];
  totalValue: number;
  isPro: boolean;
  language: string;
  category: string;
}) {
  const { t } = useI18n();
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);

  const requestAnalysis = useCallback(async () => {
    if (!isPro) return;
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiLoading(true);
    setAiSummary("");

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: "rebalancing_assistant",
          allocationData: {
            category,
            totalValueEUR: totalValue,
            buckets: drifts.map((d) => ({
              label: d.label,
              actualPercent: d.actualPercent,
              targetPercent: d.targetPercent,
              driftPercent: d.driftPercent,
              valueEUR: d.valueEUR,
            })),
          },
          language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) { setAiSummary(t("aiAnalysisError")); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiSummary(text);
      }
      setAiSummary(text.replace(/\[TOKENS:\d+\]/g, "").trim());
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAiSummary(t("aiUnavailable"));
    } finally {
      setAiLoading(false);
    }
  }, [isPro, category, totalValue, drifts, language, t]);

  const content = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SectionBadge n={5} variant="ai" />
          <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={SPARKLE_PATH} />
          </svg>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">{t("aiRebalancingAssistant")}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
        </div>
        {!aiSummary && !aiLoading && (
          <button
            onClick={requestAnalysis}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm shadow-violet-500/25 transition-all hover:-translate-y-px"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={SPARKLE_PATH} />
            </svg>
            {t("aiFullAnalysis")}
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-3 ml-7">{t("aiRebalancingAssistantDesc")}</p>

      {(aiSummary || aiLoading) && (
        <div className="text-gray-700 dark:text-slate-300 leading-relaxed">
          {aiLoading && !aiSummary && (
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
              {t("analyzingPortfolio")}
            </div>
          )}
          {aiSummary && <AiMarkdown text={aiSummary} compact />}
        </div>
      )}
    </div>
  );

  return (
    <div className="card border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/5">
      {isPro ? content : (
        <BlurredProSection blurb={t("upgradeAiBlurb")}>
          {content}
        </BlurredProSection>
      )}
    </div>
  );
}
