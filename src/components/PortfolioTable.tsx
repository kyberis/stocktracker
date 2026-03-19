"use client";

import { useState, useMemo, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { convertToEUR } from "@/lib/utils";
import StockRow from "./StockRow";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import type { Holding } from "@/lib/types";

const StockDetailDrawer = dynamic(() => import("./StockDetailDrawer"), { ssr: false });

const COLLAPSED_COUNT = 7;

type SortField = "name" | "returnPct" | "returnAbs" | "size";
type SortDir = "asc" | "desc";

export type ReturnDisplayMode = "pct" | "abs";

export const ReturnDisplayContext = createContext<{
  mode: ReturnDisplayMode;
  toggle: () => void;
}>({ mode: "pct", toggle: () => {} });

export function useReturnDisplay() {
  return useContext(ReturnDisplayContext);
}

interface Props {
  holdings?: Holding[];
  onAddStock?: () => void;
}

export default function PortfolioTable({ holdings: holdingsProp, onAddStock }: Props) {
  const { holdings: ctxHoldings, quotes, exchangeRates } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();
  const [sortField, setSortField] = useState<SortField>("returnPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [returnMode, setReturnMode] = useState<ReturnDisplayMode>("pct");

  const toggleReturnMode = () => {
    setReturnMode((m) => (m === "pct" ? "abs" : "pct"));
    track("portfolio_return_mode_toggled");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
    track("portfolio_sort_changed");
  };

  const sortedHoldings = useMemo(() => {
    let filtered = holdings;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = holdings.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.ticker.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return mul * a.name.localeCompare(b.name);
        case "size": {
          const aQuote = quotes[a.ticker];
          const bQuote = quotes[b.ticker];
          const aVal = aQuote
            ? convertToEUR(a.shares * aQuote.regularMarketPrice, a.displayCurrency, exchangeRates)
            : a.valueInEUR;
          const bVal = bQuote
            ? convertToEUR(b.shares * bQuote.regularMarketPrice, b.displayCurrency, exchangeRates)
            : b.valueInEUR;
          return mul * (aVal - bVal);
        }
        case "returnPct": {
          const aQuote = quotes[a.ticker];
          const bQuote = quotes[b.ticker];
          const aGain = aQuote
            ? ((aQuote.regularMarketPrice - a.purchasePrice) / a.purchasePrice) * 100
            : 0;
          const bGain = bQuote
            ? ((bQuote.regularMarketPrice - b.purchasePrice) / b.purchasePrice) * 100
            : 0;
          return mul * (aGain - bGain);
        }
        case "returnAbs": {
          const aQuote = quotes[a.ticker];
          const bQuote = quotes[b.ticker];
          const aGain = aQuote
            ? convertToEUR(a.shares * (aQuote.regularMarketPrice - a.purchasePrice), a.displayCurrency, exchangeRates)
            : 0;
          const bGain = bQuote
            ? convertToEUR(b.shares * (bQuote.regularMarketPrice - b.purchasePrice), b.displayCurrency, exchangeRates)
            : 0;
          return mul * (aGain - bGain);
        }
        default:
          return 0;
      }
    });
  }, [holdings, quotes, exchangeRates, sortField, sortDir, filter]);

  const hasFilter = filter.trim().length > 0;
  const visibleHoldings = expanded || hasFilter ? sortedHoldings : sortedHoldings.slice(0, COLLAPSED_COUNT);
  const canExpand = sortedHoldings.length > COLLAPSED_COUNT && !hasFilter;
  const noResults = hasFilter && sortedHoldings.length === 0;

  const renderSortButton = (field: SortField, label: string) => (
    <button
      onClick={() => toggleSort(field)}
      className={`text-xs font-medium transition-colors ${
        sortField === field
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200"
      }`}
    >
      {label}
      {sortField === field && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );

  const returnDisplayCtx = useMemo(() => ({
    mode: returnMode,
    toggle: toggleReturnMode,
  }), [returnMode]);

  if (holdings.length === 0) {
    return (
      <div className="card text-center py-10 px-4">
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        <p className="text-gray-400 dark:text-slate-500 text-base mb-4">{t("noHoldings")}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="/import"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {t("emptyStateImport")}
          </a>
          {onAddStock && (
            <button
              onClick={onAddStock}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("addStock")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleToggleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded) track("portfolio_display_all");
  };

  const searchInput = (
    <input
      type="text"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      onBlur={() => {
        if (filter.trim()) track("portfolio_search_used");
      }}
      placeholder={t("searchPlaceholder")}
      aria-label={t("searchPlaceholder")}
      className="flex-1 min-w-[200px] text-sm"
    />
  );

  const drawer = selectedHolding && typeof document !== "undefined"
    ? createPortal(
        <StockDetailDrawer key={selectedHolding.id} holding={selectedHolding} onClose={() => setSelectedHolding(null)} />,
        document.body,
      )
    : null;

  const noResultsCTA = (
    <div className={`flex flex-col items-center justify-center py-10 px-4 text-center ${layoutTheme === "terminal" ? "font-mono" : ""}`}>
      <svg
        className={`w-8 h-8 mb-3 ${
          layoutTheme === "terminal" ? "text-zinc-600" :
          layoutTheme === "canvas" ? "text-slate-300" :
          layoutTheme === "studio" ? "text-zinc-600" :
          "text-gray-300 dark:text-slate-600"
        }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <p className={`text-sm mb-1 ${
        layoutTheme === "terminal" ? "text-zinc-500" :
        layoutTheme === "canvas" ? "text-slate-500" :
        layoutTheme === "studio" ? "text-zinc-500" :
        "text-gray-500 dark:text-slate-400"
      }`}>
        {t("noResults")}
      </p>
      <p className={`text-xs mb-4 ${
        layoutTheme === "terminal" ? "text-zinc-600" :
        layoutTheme === "canvas" ? "text-slate-400" :
        layoutTheme === "studio" ? "text-zinc-600" :
        "text-gray-400 dark:text-slate-500"
      }`}>
        &ldquo;<span className="font-medium">{filter}</span>&rdquo;
      </p>
      {onAddStock && (
        <button
          onClick={onAddStock}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            layoutTheme === "terminal"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-mono"
              : layoutTheme === "canvas"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              : layoutTheme === "studio"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("searchNoResultsAdd")}
        </button>
      )}
    </div>
  );

  /* ── TERMINAL: Dense compact list, no card, monospace header ── */
  if (layoutTheme === "terminal") {
    return (
      <ReturnDisplayContext.Provider value={returnDisplayCtx}>
        <div className="border border-zinc-800 rounded-none overflow-hidden" data-testid="portfolio-table-terminal" data-tour="holdings">
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-3">
            {searchInput}
            <span className="text-[10px] font-mono text-zinc-600 shrink-0">{t("holdings")} ({sortedHoldings.length})</span>
          </div>
          <div className="hidden sm:flex items-center justify-between px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            <div className="flex items-center gap-3">
              {renderSortButton("name", "SYMBOL")}
            </div>
            <div className="flex items-center gap-4">
              {renderSortButton("size", "SIZE")}
              <span className="w-1" />
              {renderSortButton("returnPct", "RET %")}
              <span className="w-1" />
              {renderSortButton("returnAbs", "RET €")}
            </div>
          </div>
          <div className={expanded ? "overflow-y-auto" : ""}>
            {noResults && noResultsCTA}
            {visibleHoldings.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
          </div>
          {canExpand && (
            <button onClick={handleToggleExpand} className="w-full px-3 py-2 text-xs font-mono text-green-400 hover:bg-zinc-800/60 border-t border-zinc-800 transition-colors">
              {expanded ? t("showLess") : `${t("viewAll")} (${sortedHoldings.length})`}
            </button>
          )}
          {drawer}
        </div>
      </ReturnDisplayContext.Provider>
    );
  }

  /* ── CANVAS: Card grid layout ──────────────────────────────── */
  if (layoutTheme === "canvas") {
    return (
      <ReturnDisplayContext.Provider value={returnDisplayCtx}>
        <div data-testid="portfolio-table-canvas" data-tour="holdings">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
            {searchInput}
            <span className="text-xs text-slate-400 shrink-0">{t("holdings")} ({sortedHoldings.length})</span>
          </div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {renderSortButton("name", t("priceTimesCount"))}
            <span className="text-slate-300">·</span>
            {renderSortButton("size", t("sortSize"))}
            <span className="text-slate-300">·</span>
            {renderSortButton("returnPct", t("sortReturnPct"))}
            <span className="text-slate-300">·</span>
            {renderSortButton("returnAbs", t("sortReturnAbs"))}
          </div>
          {noResults && noResultsCTA}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleHoldings.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
          </div>
          {canExpand && (
            <button onClick={handleToggleExpand} className="mt-4 w-full py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              {expanded ? t("showLess") : `${t("viewAll")} (${sortedHoldings.length})`}
            </button>
          )}
          {drawer}
        </div>
      </ReturnDisplayContext.Provider>
    );
  }

  /* ── STUDIO: Sleek glass card ──────────────────────────────── */
  if (layoutTheme === "studio") {
    return (
      <ReturnDisplayContext.Provider value={returnDisplayCtx}>
        <div className="rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden" data-testid="portfolio-table-studio" data-tour="holdings">
          <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
            {searchInput}
            <span className="text-xs text-zinc-500 shrink-0">{t("holdings")} ({sortedHoldings.length})</span>
          </div>
          <div className="hidden sm:flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
            <div className="flex items-center gap-3">{renderSortButton("name", t("priceTimesCount"))}</div>
            <div className="flex items-center gap-3">
              {renderSortButton("size", t("sortSize"))}
              <span className="text-zinc-700">·</span>
              {renderSortButton("returnPct", t("sortReturnPct"))}
              <span className="text-zinc-700">·</span>
              {renderSortButton("returnAbs", t("sortReturnAbs"))}
            </div>
          </div>
          <div className={expanded ? "overflow-y-auto" : ""}>
            {noResults && noResultsCTA}
            {visibleHoldings.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
          </div>
          {canExpand && (
            <button onClick={handleToggleExpand} className="w-full px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.03] border-t border-white/5 transition-colors">
              {expanded ? t("showLess") : `${t("viewAll")} (${sortedHoldings.length})`}
            </button>
          )}
          {drawer}
        </div>
      </ReturnDisplayContext.Provider>
    );
  }

  /* ── DEFAULT: Original card layout ─────────────────────────── */
  return (
    <ReturnDisplayContext.Provider value={returnDisplayCtx}>
      <div className="card p-0 overflow-hidden" data-testid="portfolio-table-default" data-tour="holdings">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          {searchInput}
          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{t("holdings")} ({sortedHoldings.length})</span>
        </div>
        <div className="hidden sm:flex sm:items-center sm:justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">{renderSortButton("name", t("priceTimesCount"))}</div>
          <div className="flex items-center gap-3">
            {renderSortButton("size", t("sortSize"))}
            <span className="text-gray-300 dark:text-slate-600">·</span>
            {renderSortButton("returnPct", t("sortReturnPct"))}
            <span className="text-gray-300 dark:text-slate-600">·</span>
            {renderSortButton("returnAbs", t("sortReturnAbs"))}
          </div>
        </div>
        <div className={expanded ? "overflow-y-auto" : ""}>
          {noResults && noResultsCTA}
          {visibleHoldings.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
        </div>
        {canExpand && (
          <button onClick={handleToggleExpand} className="w-full px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 transition-colors">
            {expanded ? t("showLess") : `${t("viewAll")} (${sortedHoldings.length})`}
          </button>
        )}
        {drawer}
      </div>
    </ReturnDisplayContext.Provider>
  );
}
