"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { convertToEUR, resolveQuoteCurrency, formatCurrency } from "@/lib/utils";
import type { RebalanceTarget, RebalanceDrift } from "@/lib/types";

export default function RebalancingView() {
  const { t } = useI18n();
  const { holdings, quotes, exchangeRates } = usePortfolio();
  const [targets, setTargets] = useState<RebalanceTarget[]>([]);
  const [category, setCategory] = useState<"assetClass" | "sector" | "region">("assetClass");
  const [newLabel, setNewLabel] = useState("");
  const [newPercent, setNewPercent] = useState("");

  useEffect(() => {
    fetch("/api/rebalance-targets").then((r) => r.ok ? r.json() : []).then(setTargets);
  }, []);

  const categoryTargets = targets.filter((t) => t.category === category);
  const totalTarget = categoryTargets.reduce((s, t) => s + t.targetPercent, 0);

  const drifts = useMemo((): RebalanceDrift[] => {
    let totalValue = 0;
    const buckets: Record<string, number> = {};

    holdings.forEach((h) => {
      const q = quotes[h.ticker];
      let valueEUR = 0;
      if (q && q.regularMarketPrice > 0) {
        const qc = resolveQuoteCurrency(h.displayCurrency, q.currency);
        valueEUR = convertToEUR(h.shares * q.regularMarketPrice, qc, exchangeRates);
      }
      totalValue += valueEUR;
      const label = (h[category as keyof typeof h] as string) || t("unclassified");
      buckets[label] = (buckets[label] || 0) + valueEUR;
    });

    return categoryTargets.map((tgt) => {
      const valueEUR = buckets[tgt.label] || 0;
      const actualPercent = totalValue > 0 ? (valueEUR / totalValue) * 100 : 0;
      const driftPercent = actualPercent - tgt.targetPercent;
      const actionEUR = totalValue > 0 ? (tgt.targetPercent / 100) * totalValue - valueEUR : 0;
      return {
        label: tgt.label,
        targetPercent: tgt.targetPercent,
        actualPercent,
        driftPercent,
        valueEUR,
        actionEUR,
      };
    });
  }, [holdings, quotes, exchangeRates, categoryTargets, category, t]);

  const handleAddTarget = async () => {
    if (!newLabel || !newPercent) return;
    const res = await fetch("/api/rebalance-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, label: newLabel, targetPercent: parseFloat(newPercent) }),
    });
    if (res.ok) {
      const saved = await res.json();
      setTargets((prev) => [...prev.filter((t) => t.id !== saved.id), saved]);
      setNewLabel("");
      setNewPercent("");
    }
  };

  const handleDeleteTarget = async (id: string) => {
    await fetch(`/api/rebalance-targets?id=${id}`, { method: "DELETE" });
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("rebalancing")}</h3>
        <div className="flex gap-1">
          {(["assetClass", "sector", "region"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                category === c ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
              }`}
            >
              {t(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Add target */}
      <div className="flex gap-2 mb-4">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t("assetClass")} className="flex-1 text-xs px-2 py-1.5" />
        <input value={newPercent} onChange={(e) => setNewPercent(e.target.value)} type="number" placeholder="%" className="w-16 text-xs px-2 py-1.5" step="any" />
        <button onClick={handleAddTarget} className="btn-primary text-xs px-3 py-1.5">{t("addTarget")}</button>
      </div>

      {categoryTargets.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("addTarget")} to see rebalancing suggestions.</p>
      ) : (
        <>
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">
            {t("totalTarget")}: <span className={`font-medium ${Math.abs(totalTarget - 100) < 0.1 ? "text-emerald-500" : "text-amber-500"}`}>{totalTarget.toFixed(1)}%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="text-left p-2 font-medium">{t("assetClass")}</th>
                  <th className="text-right p-2 font-medium">{t("targetAllocation")}</th>
                  <th className="text-right p-2 font-medium">{t("actualAllocation")}</th>
                  <th className="text-right p-2 font-medium">{t("drift")}</th>
                  <th className="text-right p-2 font-medium">{t("action")}</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {drifts.map((d) => {
                  const driftColor = Math.abs(d.driftPercent) < 2
                    ? "text-gray-500 dark:text-slate-400"
                    : d.driftPercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400";
                  const actionColor = d.actionEUR > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
                  return (
                    <tr key={d.label} className="border-t border-gray-100 dark:border-slate-700">
                      <td className="p-2 font-medium text-gray-900 dark:text-white">{d.label}</td>
                      <td className="p-2 text-right font-mono">{d.targetPercent.toFixed(1)}%</td>
                      <td className="p-2 text-right font-mono">{d.actualPercent.toFixed(1)}%</td>
                      <td className={`p-2 text-right font-mono font-medium ${driftColor}`}>
                        {d.driftPercent > 0 ? "+" : ""}{d.driftPercent.toFixed(1)}%
                      </td>
                      <td className={`p-2 text-right font-mono ${actionColor}`}>
                        {d.actionEUR > 0 ? "Buy " : "Sell "}{formatCurrency(Math.abs(d.actionEUR), "EUR")}
                      </td>
                      <td className="p-2">
                        <button onClick={() => {
                          const tgt = categoryTargets.find((ct) => ct.label === d.label);
                          if (tgt) handleDeleteTarget(tgt.id);
                        }} className="text-red-400 hover:text-red-600">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual bar chart */}
          <div className="mt-4 space-y-2">
            {drifts.map((d) => (
              <div key={d.label} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate text-gray-700 dark:text-slate-300">{d.label}</span>
                <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-700 rounded-full relative overflow-hidden">
                  <div className="absolute h-full bg-gray-300 dark:bg-slate-500 rounded-full opacity-50" style={{ width: `${d.targetPercent}%` }} />
                  <div
                    className={`absolute h-full rounded-full ${d.actualPercent >= d.targetPercent ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, d.actualPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
