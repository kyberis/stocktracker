"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useTrack } from "@/lib/use-track";
import { holdingIsEtfLike } from "@/lib/services/etf-lookthrough";
import type { Holding, HoldingAssetType, QuoteData } from "@/lib/types";

function isCashHolding(h: Holding): boolean {
  return (
    h.exchange.trim().toUpperCase() === "CASH" || h.ticker.trim().toUpperCase().startsWith("CASH-")
  );
}

function isSuggestedEtfAsStock(h: Holding, quote: QuoteData | undefined): boolean {
  if (isCashHolding(h)) return false;
  return (h.assetType ?? "stock") === "stock" && holdingIsEtfLike(h, quote);
}

export interface AssetTypeReviewLauncherProps {
  /** Optional class for the trigger button */
  className?: string;
  /** When set, used as the trigger label instead of the default */
  label?: string;
}

/**
 * Opens a modal to review and fix asset types (stock / ETF / crypto) in bulk.
 */
export function AssetTypeReviewLauncher({ className, label }: AssetTypeReviewLauncherProps) {
  const { holdings, quotes } = usePortfolio();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const suggestedCount = useMemo(
    () => holdings.reduce((n, h) => n + (isSuggestedEtfAsStock(h, quotes[h.ticker]) ? 1 : 0), 0),
    [holdings, quotes],
  );

  const tradableCount = useMemo(
    () => holdings.filter((h) => !isCashHolding(h)).length,
    [holdings],
  );

  if (tradableCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1 transition-colors shrink-0 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20"
        }
        aria-label={label ?? t("reviewAssetTypes")}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="hidden sm:inline">{label ?? t("reviewAssetTypes")}</span>
        <span className="sm:hidden">{label ?? t("reviewAssetTypesShort")}</span>
        {suggestedCount > 0 && (
          <span className="tabular-nums rounded-full bg-amber-200/90 dark:bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold">
            {suggestedCount}
          </span>
        )}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <AssetTypeReviewModal open={open} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

function AssetTypeReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { holdings, quotes, updateHolding } = usePortfolio();
  const { t } = useI18n();
  const track = useTrack();
  const [filter, setFilter] = useState<"suggested" | "all">("suggested");
  const [drafts, setDrafts] = useState<Record<string, HoldingAssetType>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const initRef = useRef(false);

  const tradable = useMemo(() => holdings.filter((h) => !isCashHolding(h)), [holdings]);

  const suggestedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const h of tradable) {
      if (isSuggestedEtfAsStock(h, quotes[h.ticker])) ids.add(h.id);
    }
    return ids;
  }, [tradable, quotes]);

  useEffect(() => {
    if (!open) {
      initRef.current = false;
      return;
    }
    const next: Record<string, HoldingAssetType> = {};
    for (const h of tradable) {
      next[h.id] = h.assetType ?? "stock";
    }
    setDrafts(next);
    if (!initRef.current) {
      initRef.current = true;
      setFilter(suggestedIds.size > 0 ? "suggested" : "all");
    }
  }, [open, tradable, suggestedIds]);

  const rows = useMemo(() => {
    if (filter === "all") return tradable;
    return tradable.filter((h) => suggestedIds.has(h.id));
  }, [filter, tradable, suggestedIds]);

  const suggestedRows = useMemo(
    () => tradable.filter((h) => suggestedIds.has(h.id)),
    [tradable, suggestedIds],
  );

  const handleSaveOne = useCallback(
    async (h: Holding) => {
      const next = drafts[h.id];
      if (next === undefined || next === (h.assetType ?? "stock")) return;
      setSavingId(h.id);
      try {
        await updateHolding(h.id, { assetType: next });
        track("asset_type_review_saved", { ticker: h.ticker, to: next });
      } finally {
        setSavingId(null);
      }
    },
    [drafts, updateHolding, track],
  );

  const handleApplyAllSuggestedEtf = useCallback(async () => {
    const targets = suggestedRows.filter((h) => (h.assetType ?? "stock") === "stock");
    if (targets.length === 0) return;
    setBulkWorking(true);
    try {
      for (const h of targets) {
        await updateHolding(h.id, { assetType: "etf" });
        setDrafts((d) => ({ ...d, [h.id]: "etf" }));
      }
      track("asset_type_review_bulk_etf", { count: String(targets.length) });
    } finally {
      setBulkWorking(false);
    }
  }, [suggestedRows, updateHolding, track]);

  useEffect(() => {
    if (open) track("asset_type_review_opened");
  }, [open, track]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 dark:bg-black/60"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-type-review-title"
        className="relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 sm:rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 rounded-t-2xl sm:rounded-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 id="asset-type-review-title" className="text-base font-semibold text-gray-900 dark:text-white">
              {t("reviewAssetTypesTitle")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{t("reviewAssetTypesDescription")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 shrink-0"
            aria-label={t("close")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
            {t("reviewAssetTypesViewLabel")}
          </span>
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setFilter("suggested")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filter === "suggested"
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              {t("reviewAssetTypesFilterSuggested")}
              {suggestedIds.size > 0 && (
                <span className="ml-1 tabular-nums opacity-90">({suggestedIds.size})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-200 dark:border-slate-600 ${
                filter === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              {t("reviewAssetTypesFilterAll")}
            </button>
          </div>
        </div>

        {filter === "suggested" && suggestedRows.length > 0 && (
          <div className="px-4 py-2 border-b border-amber-200/60 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/10 shrink-0">
            <button
              type="button"
              onClick={handleApplyAllSuggestedEtf}
              disabled={bulkWorking}
              className="w-full sm:w-auto btn-primary text-sm px-3 py-2 disabled:opacity-60"
            >
              {bulkWorking ? t("loading") : t("applyAllSuggestedEtf")}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">{t("reviewAssetTypesEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((h) => {
                const draft = drafts[h.id] ?? (h.assetType ?? "stock");
                const saved = h.assetType ?? "stock";
                const dirty = draft !== saved;
                const isSuggested = suggestedIds.has(h.id);
                return (
                  <li
                    key={h.id}
                    className={`rounded-lg border p-3 ${
                      isSuggested
                        ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5"
                        : "border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {h.ticker}
                          {h.exchange ? ` · ${h.exchange}` : ""}
                        </p>
                      </div>
                      {isSuggested && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 shrink-0">
                          {t("reviewAssetTypesSuggestedBadge")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="sr-only" htmlFor={`asset-draft-${h.id}`}>
                        {t("assetType")}
                      </label>
                      <select
                        id={`asset-draft-${h.id}`}
                        value={draft}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [h.id]: e.target.value as HoldingAssetType }))
                        }
                        className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-2 py-1.5"
                      >
                        <option value="stock">{t("stockType")}</option>
                        <option value="etf">{t("etfType")}</option>
                        <option value="crypto">{t("cryptoType")}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveOne(h)}
                        disabled={!dirty || savingId === h.id}
                        className="btn-primary text-sm px-3 py-1.5 shrink-0 disabled:opacity-50"
                      >
                        {savingId === h.id ? "…" : t("save")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <button type="button" onClick={onClose} className="w-full btn-secondary text-sm py-2">
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
