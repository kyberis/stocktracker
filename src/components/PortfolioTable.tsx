"use client";

import { useState, useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import StockRow from "./StockRow";

type SortField = "name" | "gainLoss" | "value" | "shares";
type SortDir = "asc" | "desc";

export default function PortfolioTable() {
  const { holdings, quotes } = usePortfolio();
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

      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
        <div className="col-span-3">
          {renderSortButton("name", t("stock"))}
        </div>
        <div className="col-span-1 text-right">
          {renderSortButton("shares", t("shares"))}
        </div>
        <div className="col-span-2 text-right">
          <span className="text-xs text-gray-400 dark:text-slate-500">{t("purchasePrice")}</span>
        </div>
        <div className="col-span-2 text-right">
          <span className="text-xs text-gray-400 dark:text-slate-500">{t("currentPrice")}</span>
        </div>
        <div className="col-span-2 text-right">
          {renderSortButton("value", t("value"))}
        </div>
        <div className="col-span-2 text-right">
          {renderSortButton("gainLoss", t("returnPercent"))}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {sortedHoldings.map((holding) => (
          <StockRow key={holding.id} holding={holding} />
        ))}
      </div>
    </div>
  );
}
