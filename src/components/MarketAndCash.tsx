"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import PortfolioBenchmarkChart from "./PortfolioBenchmarkChart";
import { useTheme } from "@/lib/theme-context";
import type { Holding, CashEntry, ManualAssetType } from "@/lib/types";

interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  loading: boolean;
}

const INDICES = [
  { symbol: "^GSPC", labelKey: "benchmarkSp500" },
  { symbol: "^IXIC", labelKey: "benchmarkNasdaq" },
  { symbol: "^DJI", labelKey: "benchmarkDowJones" },
  { symbol: "^STOXX50E", labelKey: "benchmarkEuroStoxx50" },
] as const;

const ASSET_TYPE_META: Record<ManualAssetType, { icon: string; labelKey: string }> = {
  real_estate: { icon: "🏠", labelKey: "realEstate" },
  savings: { icon: "🏦", labelKey: "savingsAccounts" },
  pension: { icon: "🏛️", labelKey: "pensionRetirement" },
  cash: { icon: "💵", labelKey: "assetTypeCash" },
};

const TYPE_ORDER: ManualAssetType[] = ["real_estate", "savings", "pension", "cash"];

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function MarketAndCash({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, isLoading, addCashEntry, updateCashEntry, removeCashEntry, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const [indices, setIndices] = useState<IndexQuote[]>(
    INDICES.map((idx) => ({
      symbol: idx.symbol,
      name: idx.labelKey,
      price: 0,
      change: 0,
      changePercent: 0,
      loading: true,
    }))
  );
  const [showChart, setShowChart] = useState(false);

  const [cashName, setCashName] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const fetchIndices = useCallback(async () => {
    try {
      const symbols = INDICES.map((i) => i.symbol).join(",");
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}&provider=yahoo`);
      if (!res.ok) return;
      const data = await res.json();

      setIndices(
        INDICES.map((idx) => {
          const q = data[idx.symbol];
          return {
            symbol: idx.symbol,
            name: idx.labelKey,
            price: q?.regularMarketPrice || 0,
            change: q?.regularMarketChange || 0,
            changePercent: q?.regularMarketChangePercent || 0,
            loading: false,
          };
        })
      );
    } catch {
      setIndices((prev) => prev.map((i) => ({ ...i, loading: false })));
    }
  }, []);

  useEffect(() => {
    fetchIndices();
  }, [fetchIndices]);

  const { totalCurrentEUR, dayGainLossEUR } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
  const prevPortfolioValue = totalCurrentEUR - dayGainLossEUR;
  const dayGainLossPercent = prevPortfolioValue > 0 ? (dayGainLossEUR / prevPortfolioValue) * 100 : 0;

  const cashTotal = cashEntries.reduce((sum, e) => sum + e.amountEUR, 0);

  const groupedEntries = useMemo(() => {
    const groups: Record<ManualAssetType, CashEntry[]> = {
      real_estate: [], savings: [], pension: [], cash: [],
    };
    for (const entry of cashEntries) {
      const type = entry.type ?? "cash";
      groups[type].push(entry);
    }
    return groups;
  }, [cashEntries]);

  const handleAddCash = async () => {
    const parsed = parseFloat(cashAmount);
    if (!cashName.trim() || Number.isNaN(parsed) || parsed < 0) return;
    await addCashEntry({ name: cashName.trim(), amountEUR: parsed });
    setCashName("");
    setCashAmount("");
  };

  const startEdit = (id: string, name: string, amount: number) => {
    setEditingId(id);
    setEditName(name);
    setEditAmount(String(amount));
  };

  const saveEdit = async (id: string) => {
    const parsed = parseFloat(editAmount);
    if (!editName.trim() || Number.isNaN(parsed) || parsed < 0) return;
    await updateCashEntry(id, { name: editName.trim(), amountEUR: parsed });
    setEditingId(null);
  };

  const changeColor = (val: number) =>
    val >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";

  const changeBg = (val: number) =>
    val >= 0
      ? "bg-emerald-50 dark:bg-emerald-500/10"
      : "bg-red-50 dark:bg-red-500/10";

  const cardClass =
    layoutTheme === "terminal"
      ? "border border-zinc-800 rounded-none p-3 sm:p-4"
      : layoutTheme === "canvas"
      ? "bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
      : layoutTheme === "studio"
      ? "rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm p-4 sm:p-5"
      : "card";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Market Indices */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("marketsToday")}
            </h3>
            <button
              onClick={fetchIndices}
              className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              title="Refresh"
              aria-label="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm">
              <caption className="sr-only">Market indices</caption>
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th scope="col" className="text-left text-xs font-medium text-gray-400 dark:text-slate-500 pb-2 pl-4 sm:pl-5">{t("stock")}</th>
                  <th scope="col" className="text-right text-xs font-medium text-gray-400 dark:text-slate-500 pb-2">{t("currentPrice")}</th>
                  <th scope="col" className="text-right text-xs font-medium text-gray-400 dark:text-slate-500 pb-2">{t("dayChange")}</th>
                  <th scope="col" className="text-right text-xs font-medium text-gray-400 dark:text-slate-500 pb-2 pr-4 sm:pr-5">{t("change")}</th>
                </tr>
              </thead>
              <tbody>
                {holdings.length > 0 && (
                  <tr className="border-b border-gray-200 dark:border-slate-600 bg-emerald-50/40 dark:bg-emerald-500/5">
                    <td className="py-2.5 pl-4 sm:pl-5">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {t("portfolio")}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-slate-200 tabular-nums font-medium">
                      {isLoading ? (
                        <span className="inline-block w-16 h-4 bg-gray-100 dark:bg-slate-700 rounded animate-value-shimmer" />
                      ) : (
                        formatCurrency(totalCurrentEUR, baseCurrency)
                      )}
                    </td>
                    <td className={`py-2.5 text-right tabular-nums font-medium ${changeColor(dayGainLossEUR)}`}>
                      {isLoading ? (
                        <span className="inline-block w-12 h-4 bg-gray-100 dark:bg-slate-700 rounded animate-value-shimmer" />
                      ) : (
                        formatCurrency(dayGainLossEUR, baseCurrency)
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-4 sm:pr-5">
                      {isLoading ? (
                        <span className="inline-block w-14 h-5 bg-gray-100 dark:bg-slate-700 rounded animate-value-shimmer" />
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${changeColor(dayGainLossPercent)} ${changeBg(dayGainLossPercent)}`}>
                          {formatPercent(dayGainLossPercent)}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                {indices.map((idx) => (
                  <tr key={idx.symbol} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                    <td className="py-2.5 pl-4 sm:pl-5">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t(idx.name as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-700 dark:text-slate-200 tabular-nums">
                      {idx.loading ? (
                        <span className="inline-block w-16 h-4 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
                      ) : (
                        idx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      )}
                    </td>
                    <td className={`py-2.5 text-right tabular-nums ${changeColor(idx.change)}`}>
                      {idx.loading ? (
                        <span className="inline-block w-12 h-4 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
                      ) : (
                        <span>
                          {idx.change >= 0 ? "+" : ""}
                          {idx.change.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-4 sm:pr-5">
                      {idx.loading ? (
                        <span className="inline-block w-14 h-5 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${changeColor(idx.changePercent)} ${changeBg(idx.changePercent)}`}>
                          {formatPercent(idx.changePercent)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={() => setShowChart(!showChart)}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showChart ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {t("viewBenchmarkChart")}
            </button>
          </div>
        </div>

        {/* Assets & Cash Balances */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("manualAssets")}</h3>
            {cashEntries.length > 0 && (
              <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(cashTotal, baseCurrency)}
              </span>
            )}
          </div>

          <div className="space-y-3 mb-3">
            {cashEntries.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("noCashEntries")}</p>
            ) : (
              TYPE_ORDER
                .filter((type) => groupedEntries[type].length > 0)
                .map((type) => {
                  const meta = ASSET_TYPE_META[type];
                  const entries = groupedEntries[type];
                  const groupTotal = entries.reduce((s, e) => s + e.amountEUR, 0);
                  return (
                    <div key={type}>
                      {/* Only show type header if there are non-cash types */}
                      {(TYPE_ORDER.some((t) => t !== "cash" && groupedEntries[t].length > 0)) && (
                        <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-100 dark:border-slate-700/50">
                          <span className="text-sm">{meta.icon}</span>
                          <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                            {t(meta.labelKey as Parameters<typeof t>[0])}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 ml-auto tabular-nums">
                            {formatCurrency(groupTotal, baseCurrency)}
                          </span>
                        </div>
                      )}
                      {entries.map((entry) => {
                        const isEditing = editingId === entry.id;
                        return isEditing ? (
                          <div key={entry.id} className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-2 space-y-1.5">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              aria-label={t("cashName")}
                              className="w-full text-sm"
                              autoFocus
                            />
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                aria-label={t("cash") + " EUR"}
                                className="flex-1 text-sm"
                              />
                              <button className="btn-primary text-xs px-2 py-1" onClick={() => saveEdit(entry.id)}>
                                {t("saveChanges")}
                              </button>
                              <button className="btn-secondary text-xs px-2 py-1" onClick={() => setEditingId(null)}>
                                {t("cancel")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={entry.id}
                            className="group flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="text-sm text-gray-600 dark:text-slate-300 truncate block">{entry.name}</span>
                              {entry.notes && (
                                <span className="text-[11px] text-gray-400 dark:text-slate-500 truncate block">{entry.notes}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                                {formatCurrency(entry.amountEUR, baseCurrency)}
                              </span>
                              <div className="hidden group-hover:flex items-center gap-1">
                                <button
                                  onClick={() => startEdit(entry.id, entry.name, entry.amountEUR)}
                                  className="p-0.5 rounded text-gray-400 hover:text-emerald-500 transition-colors"
                                  title={t("editValues")}
                                  aria-label={t("editValues")}
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => removeCashEntry(entry.id)}
                                  className="p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                                  title={t("removeStock")}
                                  aria-label={t("removeStock")}
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-slate-700">
            <input
              value={cashName}
              onChange={(e) => setCashName(e.target.value)}
              placeholder={t("cashName")}
              aria-label={t("cashName")}
              className="flex-1 text-xs min-w-0"
            />
            <input
              type="number"
              min="0"
              step="any"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="EUR"
              aria-label={t("cash") + " EUR"}
              className="w-20 text-xs"
            />
            <button
              className="btn-primary text-xs px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              disabled={!cashName.trim() || !cashAmount}
              onClick={handleAddCash}
              aria-label="Add cash"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {showChart && <PortfolioBenchmarkChart />}
    </div>
  );
}
