"use client";

import { useState, useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import StockRow from "./StockRow";
import type { Holding } from "@/lib/types";

type SortField = "name" | "gainLoss" | "value" | "shares";
type SortDir = "asc" | "desc";

interface Props {
  holdings?: Holding[];
}

export default function PortfolioTable({ holdings: holdingsProp }: Props) {
  const { holdings: ctxHoldings, quotes } = usePortfolio();
  const holdings = holdingsProp ?? ctxHoldings;
  const { t } = useI18n();
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState("");

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
    () => sortedHoldings.filter((h) => (h.assetType ?? "stock") !== "etf"),
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
      <div className="card text-center py-12">
        <p className="text-gray-400 dark:text-slate-500 text-lg">{t("noHoldings")}</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 min-w-[200px] text-sm"
        />
      </div>

      <div className="hidden sm:flex sm:items-center sm:justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          {renderSortButton("name", t("priceTimesCount"))}
        </div>
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
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {t("stocksGroup")}
              </span>
              <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">
                ({stocks.length})
              </span>
            </div>
            {stocks.map((holding) => (
              <StockRow key={holding.id} holding={holding} />
            ))}
          </>
        )}
        {etfs.length > 0 && (
          <>
            <div className="sticky top-0 z-[1] px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {t("etfsGroup")}
              </span>
              <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">
                ({etfs.length})
              </span>
            </div>
            {etfs.map((holding) => (
              <StockRow key={holding.id} holding={holding} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
