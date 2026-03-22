"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, resolveQuoteCurrency, formatCurrency } from "@/lib/utils";
import BlurredProSection from "./BlurredProSection";
import AiMarkdown from "./AiMarkdown";
import type { RebalanceTarget, RebalanceDrift, RebalanceMove } from "@/lib/types";

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

type Category = "assetClass" | "sector" | "region" | "exchange";

interface BucketAlloc {
  label: string;
  valueEUR: number;
  percent: number;
  color: string;
}

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

export default function RebalancingView() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { holdings, quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const isAdmin = user?.role === "admin";
  const isPro = user?.plan === "pro" || user?.plan === "starter" || isAdmin;

  const [targets, setTargets] = useState<RebalanceTarget[]>([]);
  const [category, setCategory] = useState<Category>("sector");

  useEffect(() => {
    fetch("/api/rebalance-targets").then((r) => r.ok ? r.json() : []).then(setTargets);
  }, []);

  const allocations = useMemo((): BucketAlloc[] => {
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
      const label = category === "exchange"
        ? (h.exchange || t("unclassified"))
        : ((h[category as keyof typeof h] as string) || t("unclassified"));
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
  }, [holdings, quotes, exchangeRates, category, t]);

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
      {/* ── Section 1: Allocation Overview ── */}
      <AllocationOverview
        allocations={allocations}
        drifts={drifts}
        totalValue={totalValue}
        category={category}
        onCategoryChange={setCategory}
        onSaveTarget={handleSaveTarget}
        baseCurrency={baseCurrency}
      />

      {/* ── Section 2: Exposure Analysis ── */}
      <ExposureAnalysis drifts={drifts} />

      {/* ── Section 3: Rebalancing Actions ── */}
      <RebalancingActions
        drifts={drifts}
        totalValue={totalValue}
        baseCurrency={baseCurrency}
        isPro={isPro}
        language={language}
      />

      {/* ── Section 4: Industry Screener ── */}
      <RebalancingScreener isPro={isPro} />

      {/* ── Section 5: AI Assistant ── */}
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
  allocations, drifts, totalValue, category, onCategoryChange, onSaveTarget, baseCurrency,
}: {
  allocations: BucketAlloc[];
  drifts: (RebalanceDrift & { color: string })[];
  totalValue: number;
  category: Category;
  onCategoryChange: (c: Category) => void;
  onSaveTarget: (label: string, percent: number) => void;
  baseCurrency: string;
}) {
  const { t } = useI18n();
  const categories: { key: Category; label: string }[] = [
    { key: "sector", label: t("sector") },
    { key: "assetClass", label: t("assetClass") },
    { key: "region", label: t("region") },
    { key: "exchange", label: t("exchange") },
  ];

  const totalTarget = drifts.reduce((s, d) => s + d.targetPercent, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("allocationOverview")}</h3>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{t("allocationOverviewDesc")}</p>
        </div>
        <div className="flex gap-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => onCategoryChange(c.key)}
              className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                category === c.key ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
        {/* Donut */}
        <div className="flex justify-center">
          <DonutChart allocations={allocations} totalValue={totalValue} baseCurrency={baseCurrency} />
        </div>

        {/* Drift Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-2 font-medium">{t("bucket")}</th>
                <th className="text-right p-2 font-medium">{t("currentPercent")}</th>
                <th className="text-right p-2 font-medium">{t("value")}</th>
                <th className="text-right p-2 font-medium">{t("targetAllocation")}</th>
                <th className="text-right p-2 font-medium">{t("drift")}</th>
              </tr>
            </thead>
            <tbody>
              {drifts.map((d) => (
                <DriftRow key={d.label} drift={d} baseCurrency={baseCurrency} onSaveTarget={onSaveTarget} />
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-2 px-2">
            {t("totalTarget")}: <span className={`font-medium ${Math.abs(totalTarget - 100) < 0.1 ? "text-emerald-500" : "text-amber-500"}`}>{totalTarget.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriftRow({ drift: d, baseCurrency, onSaveTarget }: {
  drift: RebalanceDrift & { color: string };
  baseCurrency: string;
  onSaveTarget: (label: string, percent: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(d.targetPercent.toFixed(1));
  const driftColor = Math.abs(d.driftPercent) < 2
    ? "text-gray-500 dark:text-slate-400"
    : d.driftPercent > 0
      ? "text-red-500 dark:text-red-400"
      : "text-emerald-600 dark:text-emerald-400";

  return (
    <tr className="border-t border-gray-100 dark:border-slate-700">
      <td className="p-2 font-medium text-gray-900 dark:text-white">
        <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: d.color }} />
        {d.label}
        {d.actualPercent > 30 && (
          <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
            {/* overexposed icon */ }⚠
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
          <button
            onClick={() => { setVal(d.targetPercent.toFixed(1)); setEditing(true); }}
            className="font-mono text-gray-700 dark:text-slate-300 hover:text-emerald-500 transition-colors"
          >
            {d.targetPercent.toFixed(1)}%
          </button>
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
        <span className="text-[10px] text-gray-500 dark:text-slate-400">Total</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 2: Exposure Analysis                             */
/* ═══════════════════════════════════════════════════════════ */

function ExposureAnalysis({ drifts }: { drifts: (RebalanceDrift & { color: string })[] }) {
  const { t } = useI18n();
  const sorted = [...drifts].sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));
  const alerts = sorted.filter((d) => Math.abs(d.driftPercent) >= 1);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("exposureAnalysis")}</h3>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{t("exposureAnalysisDesc")}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> {t("withinTarget")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> {t("drifting")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> {t("overexposed")}</span>
        </div>
      </div>

      {/* Treemap-style bar */}
      <div className="flex gap-0.5 rounded-lg overflow-hidden mb-3">
        {drifts.map((d) => {
          const absDrift = Math.abs(d.driftPercent);
          const borderColor = absDrift > 5 ? "ring-2 ring-red-500/60" : absDrift > 2 ? "ring-2 ring-amber-500/50" : "";
          return (
            <div
              key={d.label}
              className={`flex flex-col items-center justify-center py-2.5 px-1 text-white text-center min-w-[40px] ${borderColor}`}
              style={{ flexGrow: d.actualPercent, background: d.color, opacity: 0.85, minHeight: 56 }}
              title={`${d.label}: ${d.actualPercent.toFixed(1)}%`}
            >
              <span className="text-[10px] font-semibold leading-tight drop-shadow truncate max-w-full">{d.label}</span>
              <span className="text-xs font-bold drop-shadow">{d.actualPercent.toFixed(1)}%</span>
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Section 3: Rebalancing Actions                           */
/* ═══════════════════════════════════════════════════════════ */

function RebalancingActions({ drifts, totalValue, baseCurrency, isPro, language }: {
  drifts: (RebalanceDrift & { color: string })[];
  totalValue: number;
  baseCurrency: string;
  isPro: boolean;
  language: string;
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

  const amount = parseFloat(newCapital) || 0;
  const totalDeficit = underweight.reduce((s, d) => s + Math.abs(d.driftPercent), 0);
  const distributions = underweight.map((d) => ({
    ...d,
    alloc: totalDeficit > 0 ? Math.round(amount * (Math.abs(d.driftPercent) / totalDeficit)) : 0,
  }));

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
      if (!res.ok || !res.body) { setAiSummary("Unable to generate AI analysis."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiSummary(text);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAiSummary("AI analysis unavailable.");
    } finally {
      setAiLoading(false);
    }
  }, [isPro, totalValue, drifts, mode, amount, distributions, moves, language]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("rebalancingActions")}</h3>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{t("rebalancingActionsDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
            <button onClick={() => setMode("add")} className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors ${mode === "add" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-slate-400"}`}>
              {t("addMoney")}
            </button>
            <button onClick={() => setMode("move")} className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors ${mode === "move" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-slate-400"}`}>
              {t("moveFunds")}
            </button>
          </div>
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
              disabled={!isPro}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {t("calculate")}
            </button>
          </div>

          {distributions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left p-2 font-medium">{t("bucket")}</th>
                    <th className="text-right p-2 font-medium">{t("underweight")}</th>
                    <th className="text-right p-2 font-medium">{t("allocate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d) => (
                    <tr key={d.label} className="border-t border-gray-100 dark:border-slate-700">
                      <td className="p-2 font-medium text-gray-900 dark:text-white">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: d.color }} />
                        {d.label}
                      </td>
                      <td className="p-2 text-right font-mono text-red-500">{d.driftPercent.toFixed(1)}%</td>
                      <td className="p-2 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(d.alloc, baseCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Before/After bars */}
          {amount > 0 && distributions.length > 0 && (
            <BeforeAfterBars drifts={drifts} distributions={distributions} mode="add" totalValue={totalValue} amount={amount} />
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start mb-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">{t("sourceOverweight")}</div>
              <select className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={moveSource} onChange={(e) => setMoveSource(e.target.value)}>
                <option value="">—</option>
                {overweight.map((d) => <option key={d.label} value={d.label}>{d.label} (+{d.driftPercent.toFixed(1)}%)</option>)}
              </select>
            </div>
            <div className="flex items-center justify-center pt-6 text-emerald-500">
              <svg className="w-6 h-6 md:rotate-0 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">{mode === "add" ? t("aiPlanEvaluation") : t("aiMoveEvaluation")}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
          </div>
          {aiLoading && !aiSummary && (
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
              Analyzing...
            </div>
          )}
          {aiSummary && <AiMarkdown text={aiSummary} compact />}
        </div>
      )}
    </div>
  );
}

function BeforeAfterBars({ drifts, distributions, mode, totalValue, amount }: {
  drifts: (RebalanceDrift & { color: string })[];
  distributions: { label: string; alloc: number; driftPercent: number; color: string }[];
  mode: "add";
  totalValue: number;
  amount: number;
}) {
  const { t } = useI18n();
  const newTotal = totalValue + amount;
  const allocMap = Object.fromEntries(distributions.map((d) => [d.label, d.alloc]));

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
      <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">{t("beforeAfterComparison")}</div>
      <div className="space-y-1.5">
        {drifts.slice(0, 8).map((d) => {
          const afterValue = d.valueEUR + (allocMap[d.label] || 0);
          const afterPct = newTotal > 0 ? (afterValue / newTotal) * 100 : 0;
          return (
            <div key={d.label} className="flex items-center gap-2 text-[10px]">
              <span className="w-24 truncate text-right text-gray-600 dark:text-slate-400">{d.label}</span>
              <div className="flex-1 h-3.5 bg-gray-200 dark:bg-slate-700 rounded-full relative overflow-hidden">
                <div className="absolute h-full rounded-full opacity-40" style={{ width: `${d.actualPercent}%`, background: d.color }} />
                <div className="absolute h-full rounded-full" style={{ width: `${afterPct}%`, background: d.color }} />
              </div>
              <span className="w-10 text-right font-mono font-medium text-gray-600 dark:text-slate-400">{afterPct.toFixed(1)}%</span>
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
      <div className="flex items-center flex-wrap gap-2 mb-3">
        <input
          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 w-48"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={sector} onChange={(e) => { setSector(e.target.value); setIndustry(""); }}>
          <option value="">{t("sector")}: All</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">{t("industry")}: All</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">{t("loading")}</div>
      ) : results.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-2 font-medium">{t("ticker")}</th>
                <th className="text-left p-2 font-medium">{t("name")}</th>
                <th className="text-left p-2 font-medium">{t("industry")}</th>
                <th className="text-right p-2 font-medium">{t("currentPrice")}</th>
                <th className="text-right p-2 font-medium">Div Yield</th>
                <th className="text-right p-2 font-medium">P/E</th>
                <th className="text-right p-2 font-medium">Mkt Cap</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : sector ? (
        <div className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">{t("noResults")}</div>
      ) : (
        <div className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">Select a sector to search stocks.</div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("industryScreener")}</h3>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-3">{t("industryScreenerDesc")}</p>

      {isPro ? content : (
        <BlurredProSection blurb="Upgrade to Trefolio to search for stocks by industry and sector.">
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
      if (!res.ok || !res.body) { setAiSummary("Unable to generate analysis."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiSummary(text);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAiSummary("AI analysis unavailable.");
    } finally {
      setAiLoading(false);
    }
  }, [isPro, category, totalValue, drifts, language]);

  const content = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">{t("aiRebalancingAssistant")}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">PRO</span>
        </div>
        {!aiSummary && !aiLoading && (
          <button onClick={requestAnalysis} className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 px-3 py-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors">
            {t("aiFullAnalysis")}
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-3">{t("aiRebalancingAssistantDesc")}</p>

      {(aiSummary || aiLoading) && (
        <div className="text-gray-700 dark:text-slate-300 leading-relaxed">
          {aiLoading && !aiSummary && (
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
              Analyzing your portfolio...
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
        <BlurredProSection blurb="Upgrade to Trefolio for AI-powered rebalancing suggestions and portfolio analysis.">
          {content}
        </BlurredProSection>
      )}
    </div>
  );
}
