"use client";

import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { formatCurrency } from "@/lib/utils";
import type { TaxonomyAllocation, ETFSectorWeight } from "@/lib/types";
import {
  computeTaxonomyAllocations,
  computeTaxonomyAllocationsWithEtfSectorLookthrough,
} from "@/lib/services/taxonomy";
import { computeTagAllocations } from "@/lib/services/tag-allocation";
import { holdingIsEtfLike } from "@/lib/services/etf-lookthrough";
import HoldingTagsField from "@/components/HoldingTagsField";

type Category = "sector" | "region" | "assetClass" | "assetType" | "tags";

const SPARKLE_PATH =
  "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z";

export default function TaxonomyView() {
  const { t } = useI18n();
  const { holdings, cashEntries, quotes, exchangeRates, refreshHoldings, activePortfolioCurrency, updateHolding, demoMode } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const [category, setCategory] = useState<Category>("sector");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [autoClassifying, setAutoClassifying] = useState(false);
  const [aiFixingId, setAiFixingId] = useState<string | null>(null);
  const [aiFixError, setAiFixError] = useState<string | null>(null);
  const [etfSectorLookthrough, setEtfSectorLookthrough] = useState(true);
  const [etfSectorWeights, setEtfSectorWeights] = useState<Record<string, ETFSectorWeight[] | null>>({});

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

  const allocations = useMemo((): TaxonomyAllocation[] => {
    const unclassified = t("unclassified");
    if (category === "tags") {
      return computeTagAllocations(holdings, cashEntries, quotes, exchangeRates, baseCurrency, {
        untagged: t("tagAllocationUntagged"),
        crypto: t("cryptoType"),
        manual: {
          cash: t("assetTypeCash"),
          real_estate: t("realEstate"),
          savings: t("assetTypeSavings"),
          pension: t("assetTypePension"),
          fixed_return: t("assetTypeFixedReturn"),
        },
      });
    }
    if (category === "sector" && etfSectorLookthrough) {
      return computeTaxonomyAllocationsWithEtfSectorLookthrough(
        holdings,
        quotes,
        exchangeRates,
        category,
        unclassified,
        etfSectorWeights,
        true,
      );
    }
    return computeTaxonomyAllocations(holdings, quotes, exchangeRates, category, unclassified);
  }, [holdings, cashEntries, quotes, exchangeRates, category, t, etfSectorWeights, etfSectorLookthrough, baseCurrency]);

  const handleSaveClassification = async (holdingId: string) => {
    if (category === "tags") return;
    await updateHolding(holdingId, { [category]: editVal } as Record<string, string>);
    setEditingId(null);
    setEditVal("");
  };

  const hasUnclassified = holdings.some((h) => !h.sector && !h.region && !h.assetClass);

  const handleAutoClassify = async () => {
    if (demoMode) return;
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

  const handleAiFixClassification = async (holdingId: string) => {
    if (demoMode) return;
    setAiFixError(null);
    setAiFixingId(holdingId);
    try {
      const res = await fetch("/api/holdings/ai-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdingId }),
      });
      if (!res.ok) {
        setAiFixError(t("autoFixClassificationError"));
        return;
      }
      const data = (await res.json()) as {
        classification?: { sector: string; region: string; assetClass: string };
      };
      await refreshHoldings();
      if (editingId === holdingId && data.classification && category !== "tags" && category !== "assetType") {
        const next = data.classification[category as "sector" | "region" | "assetClass"];
        if (typeof next === "string") setEditVal(next);
      }
    } catch {
      setAiFixError(t("autoFixClassificationError"));
    } finally {
      setAiFixingId(null);
    }
  };

  const categories: { key: Category; label: string }[] = [
    { key: "sector", label: t("sector") },
    { key: "region", label: t("region") },
    { key: "assetClass", label: t("assetClass") },
    { key: "assetType", label: t("assetType") },
    { key: "tags", label: t("v2AllocTags") },
  ];

  // Build SVG donut chart
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
        <div className="flex flex-col items-end gap-2">
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
          {category === "sector" && (
            <label className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-slate-400 cursor-pointer max-w-xs text-right">
              <input
                type="checkbox"
                checked={etfSectorLookthrough}
                onChange={(e) => setEtfSectorLookthrough(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              <span>
                <span className="font-medium text-gray-800 dark:text-slate-200">{t("etfSectorLookthroughLabel")}</span>
                <span className="block text-gray-500 dark:text-slate-500 mt-0.5">{t("etfSectorLookthroughHint")}</span>
              </span>
            </label>
          )}
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
              <span className="font-mono text-gray-900 dark:text-white w-20 text-right">{formatCurrency(a.valueEUR, baseCurrency)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inline classification editor */}
      {category === "tags" && (
        <div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-3">
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-2 uppercase font-medium">{t("holdingTagsSectionTitle")}</p>
          <div className="space-y-3 max-h-[min(28rem,70vh)] overflow-y-auto pr-1">
            {holdings.map((h) => {
              const at = h.assetType ?? "stock";
              if (at === "crypto") {
                return (
                  <div key={h.id} className="flex flex-col gap-1 text-xs border-b border-gray-100 dark:border-slate-700 pb-2 last:border-0">
                    <span className="font-mono text-gray-700 dark:text-slate-300">{h.ticker}</span>
                    <span className="text-gray-400 dark:text-slate-500">{t("holdingTagsCryptoNote")}</span>
                  </div>
                );
              }
              if (at !== "stock" && at !== "etf") return null;
              return (
                <div key={h.id} className="border-b border-gray-100 dark:border-slate-700 pb-3 last:border-0">
                  <span className="font-mono text-gray-700 dark:text-slate-300 text-xs block mb-1">{h.ticker}</span>
                  {h.name?.trim() && (
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 block mb-1 truncate">{h.name}</span>
                  )}
                  <HoldingTagsField
                    tags={h.tags ?? []}
                    onChange={(next) => {
                      void updateHolding(h.id, { tags: next });
                    }}
                    holdings={holdings}
                    excludeHoldingId={h.id}
                    label={t("holdingTagsLabel")}
                    hint={t("holdingTagsHint")}
                    compact
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {category !== "assetType" && category !== "tags" && (
        <div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-3">
          <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-1 uppercase font-medium">{t("editClassification")}</p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-2">{t("autoFixClassificationHint")}</p>
          {aiFixError && (
            <p className="text-[10px] text-red-500 dark:text-red-400 mb-2" role="alert">{aiFixError}</p>
          )}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {holdings.map((h) => {
              const val = (h[category] as string) || "";
              const displayName = h.name?.trim() || quotes[h.ticker]?.shortName || h.ticker;
              const isFixing = aiFixingId === h.id;
              return (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <div className="w-36 sm:w-44 flex-shrink-0 min-w-0">
                    <span className="font-mono text-gray-700 dark:text-slate-300 block truncate">{h.ticker}</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 block truncate" title={displayName}>
                      {displayName}
                    </span>
                  </div>
                  {editingId === h.id ? (
                    <>
                      <input
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="flex-1 text-xs px-2 py-1 min-w-0"
                        autoFocus
                        aria-label={t("editClassification")}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveClassification(h.id)}
                        className="text-emerald-500 text-[10px] font-medium flex-shrink-0"
                      >
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 text-[10px] flex-shrink-0"
                      >
                        {t("cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-500 dark:text-slate-400 truncate min-w-0">{val || "—"}</span>
                      <button
                        type="button"
                        onClick={() => void handleAiFixClassification(h.id)}
                        disabled={isFixing || aiFixingId !== null}
                        aria-label={`${t("autoFixClassification")}: ${displayName}`}
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 transition-colors bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 disabled:opacity-50"
                      >
                        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={SPARKLE_PATH} />
                        </svg>
                        {isFixing ? t("autoFixingClassification") : t("autoFixClassification")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(h.id);
                          setEditVal(val);
                        }}
                        className="text-emerald-500 text-[10px] flex-shrink-0"
                      >
                        {t("edit")}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">{t("autoFixClassificationDisclaimer")}</p>
        </div>
      )}
    </div>
  );
}
