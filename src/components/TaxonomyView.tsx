"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, resolveQuoteCurrency, formatCurrency } from "@/lib/utils";
import type { TaxonomyAllocation } from "@/lib/types";

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

type Category = "sector" | "region" | "assetClass" | "assetType";

export default function TaxonomyView() {
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates, refreshHoldings } = usePortfolio();
  const [category, setCategory] = useState<Category>("sector");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [autoClassifying, setAutoClassifying] = useState(false);

  const allocations = useMemo((): TaxonomyAllocation[] => {
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
      if (category === "assetType") {
        label = h.assetType === "etf" ? "ETF" : "Stock";
      } else {
        label = (h[category] as string) || t("unclassified");
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
  }, [holdings, quotes, exchangeRates, category, t]);

  const { updateHolding } = usePortfolio();

  const handleSaveClassification = async (holdingId: string) => {
    await updateHolding(holdingId, { [category]: editVal } as Record<string, string>);
    setEditingId(null);
    setEditVal("");
  };

  const hasUnclassified = holdings.some((h) => !h.sector && !h.region && !h.assetClass);

  const handleAutoClassify = async () => {
    setAutoClassifying(true);
    try {
      await fetch("/api/holdings/autofill-classification", { method: "POST" });
      await refreshHoldings();
    } catch {
      // silently ignore — user can retry
    } finally {
      setAutoClassifying(false);
    }
  };

  const categories: { key: Category; label: string }[] = [
    { key: "sector", label: t("sector") },
    { key: "region", label: t("region") },
    { key: "assetClass", label: t("assetClass") },
    { key: "assetType", label: t("assetType") },
  ];

  // Build SVG donut chart
  const total = allocations.reduce((s, a) => s + a.percent, 0);
  let cumulativePercent = 0;
  const donutSegments = allocations.map((a) => {
    const start = cumulativePercent;
    cumulativePercent += a.percent;
    return { ...a, start, end: cumulativePercent };
  });

  function getArc(startPct: number, endPct: number): string {
    const startAngle = (startPct / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (endPct / 100) * 2 * Math.PI - Math.PI / 2;
    const r = 40;
    const cx = 50, cy = 50;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endPct - startPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("taxonomy")}</h3>
          {hasUnclassified && (
            <button
              onClick={handleAutoClassify}
              disabled={autoClassifying}
              className="text-[10px] font-medium px-2 py-1 rounded-lg transition-colors bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50"
            >
              {autoClassifying ? t("autoClassifying") : t("autoClassify")}
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                category === c.key
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-48 h-48">
            {donutSegments.map((seg, i) => (
              seg.percent > 0.1 && (
                <path
                  key={i}
                  d={getArc(seg.start, seg.end)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeLinecap="butt"
                />
              )
            ))}
          </svg>
        </div>

        {/* Legend / list */}
        <div className="space-y-1.5">
          {allocations.map((a) => (
            <div key={a.label} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-gray-700 dark:text-slate-300 flex-1 truncate">{a.label}</span>
              <span className="font-mono text-gray-500 dark:text-slate-400">{a.percent.toFixed(1)}%</span>
              <span className="font-mono text-gray-900 dark:text-white w-20 text-right">{formatCurrency(a.valueEUR, "EUR")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inline classification editor */}
      {category !== "assetType" && (
        <div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-3">
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-2 uppercase font-medium">{t("editClassification")}</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {holdings.map((h) => {
              const val = (h[category] as string) || "";
              return (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-gray-700 dark:text-slate-300 w-20 truncate">{h.ticker}</span>
                  {editingId === h.id ? (
                    <>
                      <input
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="flex-1 text-xs px-2 py-1"
                        autoFocus
                      />
                      <button onClick={() => handleSaveClassification(h.id)} className="text-emerald-500 text-[10px] font-medium">{t("save")}</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">{t("cancel")}</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-500 dark:text-slate-400">{val || "—"}</span>
                      <button onClick={() => { setEditingId(h.id); setEditVal(val); }} className="text-emerald-500 text-[10px]">{t("edit")}</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
