"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import StockRow from "./StockRow";
import { useTheme } from "@/lib/theme-context";
import type { Holding } from "@/lib/types";

const StockDetailDrawer = dynamic(() => import("./StockDetailDrawer"), { ssr: false });

type SortField = "name" | "gainLoss" | "value" | "shares";
type SortDir = "asc" | "desc";

interface Props {
  holdings?: Holding[];
  onAddStock?: () => void;
}

export default function PortfolioTable({ holdings: holdingsProp, onAddStock }: Props) {
  const { holdings: ctxHoldings, quotes } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState("");
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
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
        case "shares":
          return mul * (a.shares - b.shares);
        case "value": {
          const aQuote = quotes[a.ticker];
          const bQuote = quotes[b.ticker];
          const aVal = aQuote ? a.shares * aQuote.regularMarketPrice : 0;
          const bVal = bQuote ? b.shares * bQuote.regularMarketPrice : 0;
          return mul * (aVal - bVal);
        }
        case "gainLoss": {
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
        default:
          return 0;
      }
    });
  }, [holdings, quotes, sortField, sortDir, filter]);

  const stocks = useMemo(
    () => sortedHoldings.filter((h) => (h.assetType ?? "stock") !== "etf" && h.assetType !== "crypto"),
    [sortedHoldings]
  );
  const etfs = useMemo(
    () => sortedHoldings.filter((h) => h.assetType === "etf"),
    [sortedHoldings]
  );

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

  const searchInput = (
    <input
      type="text"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      placeholder={t("searchPlaceholder")}
      aria-label={t("searchPlaceholder")}
      className="flex-1 min-w-[200px] text-sm"
    />
  );

  const drawer = selectedHolding && (
    <StockDetailDrawer key={selectedHolding.id} holding={selectedHolding} onClose={() => setSelectedHolding(null)} />
  );

  /* ── TERMINAL: Dense compact list, no card, monospace header ── */
  if (layoutTheme === "terminal") {
    return (
      <div className="border border-zinc-800 rounded-none overflow-hidden" data-testid="portfolio-table-terminal" data-tour="holdings">
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-3">{searchInput}</div>
        <div className="hidden sm:flex items-center justify-between px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          <div className="flex items-center gap-3">
            {renderSortButton("name", "SYMBOL")}
          </div>
          <div className="flex items-center gap-4">
            <span className="w-12 text-right">QTY</span>
            {renderSortButton("value", "VALUE")}
            <span className="w-1" />
            {renderSortButton("gainLoss", "DAY")}
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {stocks.length > 0 && (
            <>
              <div className="px-3 py-1 bg-zinc-900 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                <span>{t("stocksGroup")}</span><span>({stocks.length})</span>
              </div>
              {stocks.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
            </>
          )}
          {etfs.length > 0 && (
            <>
              <div className="px-3 py-1 bg-zinc-900 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                <span>{t("etfsGroup")}</span><span>({etfs.length})</span>
              </div>
              {etfs.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
            </>
          )}
        </div>
        {drawer}
      </div>
    );
  }

  /* ── CANVAS: Card grid layout ──────────────────────────────── */
  if (layoutTheme === "canvas") {
    return (
      <div data-testid="portfolio-table-canvas" data-tour="holdings">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex items-center gap-3">{searchInput}</div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {renderSortButton("name", t("priceTimesCount"))}
          <span className="text-slate-300">·</span>
          {renderSortButton("value", t("value"))}
          <span className="text-slate-300">·</span>
          {renderSortButton("gainLoss", t("dayPlusMinus"))}
        </div>
        {stocks.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{t("stocksGroup")} ({stocks.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {stocks.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
            </div>
          </>
        )}
        {etfs.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{t("etfsGroup")} ({etfs.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {etfs.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
            </div>
          </>
        )}
        {drawer}
      </div>
    );
  }

  /* ── STUDIO: Sleek glass card ──────────────────────────────── */
  if (layoutTheme === "studio") {
    return (
      <div className="rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden" data-testid="portfolio-table-studio" data-tour="holdings">
        <div className="p-4 border-b border-white/5 flex items-center gap-3">{searchInput}</div>
        <div className="hidden sm:flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center gap-3">{renderSortButton("name", t("priceTimesCount"))}</div>
          <div className="flex items-center gap-3">
            {renderSortButton("value", t("value"))}
            <span className="text-zinc-700">·</span>
            {renderSortButton("gainLoss", t("dayPlusMinus"))}
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {stocks.length > 0 && (
            <>
              <div className="sticky top-0 z-[1] px-4 py-2 bg-zinc-950/90 backdrop-blur-sm border-b border-white/5 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("stocksGroup")}</span>
                <span className="text-[10px] text-zinc-600">({stocks.length})</span>
              </div>
              {stocks.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
            </>
          )}
          {etfs.length > 0 && (
            <>
              <div className="sticky top-0 z-[1] px-4 py-2 bg-zinc-950/90 backdrop-blur-sm border-b border-white/5 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("etfsGroup")}</span>
                <span className="text-[10px] text-zinc-600">({etfs.length})</span>
              </div>
              {etfs.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
            </>
          )}
        </div>
        {drawer}
      </div>
    );
  }

  /* ── DEFAULT: Original card layout ─────────────────────────── */
  return (
    <div className="card p-0 overflow-hidden" data-testid="portfolio-table-default" data-tour="holdings">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3 flex-wrap">{searchInput}</div>
      <div className="hidden sm:flex sm:items-center sm:justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">{renderSortButton("name", t("priceTimesCount"))}</div>
        <div className="flex items-center gap-3">
          {renderSortButton("value", t("value"))}
          <span className="text-gray-300 dark:text-slate-600">·</span>
          {renderSortButton("gainLoss", t("dayPlusMinus"))}
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {stocks.length > 0 && (
          <>
            <div className="sticky top-0 z-[1] px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("stocksGroup")}</span>
              <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">({stocks.length})</span>
            </div>
            {stocks.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
          </>
        )}
        {etfs.length > 0 && (
          <>
            <div className="sticky top-0 z-[1] px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("etfsGroup")}</span>
              <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">({etfs.length})</span>
            </div>
            {etfs.map((h) => <StockRow key={h.id} holding={h} onSelect={setSelectedHolding} />)}
          </>
        )}
      </div>
      {drawer}
    </div>
  );
}
