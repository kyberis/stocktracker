"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent, todayLocal } from "@/lib/utils";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import PortfolioBenchmarkChart from "./PortfolioBenchmarkChart";
import Sparkline from "./Sparkline";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useTrack } from "@/lib/use-track";
import type { Holding, CashEntry, ManualAssetType } from "@/lib/types";
import { fixedReturnProgress, isFixedReturnMatured, maturityDateFor } from "@/lib/fixed-return";

const AddManualAssetModal = dynamic(() => import("./AddManualAssetModal"), { ssr: false });

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

const ASSET_TYPE_META: Record<ManualAssetType, { icon: string; labelKey: string; color: string }> = {
  real_estate: { icon: "🏠", labelKey: "realEstate", color: "bg-blue-400" },
  savings: { icon: "🏦", labelKey: "savingsAccounts", color: "bg-amber-400" },
  pension: { icon: "🏛️", labelKey: "pensionRetirement", color: "bg-violet-400" },
  fixed_return: { icon: "📉", labelKey: "assetTypeFixedReturn", color: "bg-sky-400" },
  cash: { icon: "💵", labelKey: "assetTypeCash", color: "bg-emerald-400" },
};

const ASSET_TYPE_BORDER: Record<ManualAssetType, string> = {
  real_estate: "border-l-blue-400",
  savings: "border-l-amber-400",
  pension: "border-l-violet-400",
  fixed_return: "border-l-sky-400",
  cash: "border-l-emerald-400",
};

const TYPE_ORDER: ManualAssetType[] = ["fixed_return", "real_estate", "savings", "pension", "cash"];

function buildSparkPath(points: number[], w: number, h: number): string {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 1;
  return points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = pad + ((max - v) / range) * (h - 2 * pad);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const PortfolioSparkline = memo(function PortfolioSparkline({ width = 56, height = 20, positive }: { width?: number; height?: number; positive?: boolean }) {
  const [points, setPoints] = useState<number[]>([]);
  const { activePortfolioId, demoMode } = usePortfolio();

  useEffect(() => {
    if (demoMode) return;
    const pid = activePortfolioId || "";
    fetch(`/api/portfolio/history?range=1w&portfolioId=${encodeURIComponent(pid)}`)
      .then((r) => (r.ok ? r.json() : { points: [] }))
      .then((data) => {
        const raw = Array.isArray(data.points) ? data.points : [];
        setPoints(raw.map((p: { value: number }) => p.value).filter((v: number) => v > 0));
      })
      .catch(() => {});
  }, [activePortfolioId, demoMode]);

  if (points.length < 2) {
    return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />;
  }

  const isUp = positive ?? points[points.length - 1] >= points[0];
  const color = isUp ? "var(--gain, #22c55e)" : "var(--loss, #ef4444)";
  const d = buildSparkPath(points, width, height);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

interface Props {
  holdings?: Holding[];
  cashEntries?: CashEntry[];
}

export default function MarketAndCash({ holdings: holdingsProp, cashEntries: cashEntriesProp }: Props) {
  const { holdings: ctxHoldings, cashEntries: ctxCashEntries, quotes, exchangeRates, isLoading, addCashEntry, updateCashEntry, removeCashEntry, activePortfolioCurrency, portfolios, activePortfolioId, moveToPortfolio, demoMode } = usePortfolio();
  const { user } = useAuth();
  const baseCurrency = activePortfolioCurrency;
  const holdings = holdingsProp ?? ctxHoldings;
  const cashEntries = cashEntriesProp ?? ctxCashEntries;
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();
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
  const [editAssetEntry, setEditAssetEntry] = useState<CashEntry | null>(null);
  const [movingCashId, setMovingCashId] = useState<string | null>(null);
  const [moveCashLoading, setMoveCashLoading] = useState(false);

  const isPro = user?.plan === "pro";
  const otherPortfolios = activePortfolioId
    ? portfolios.filter((p) => p.id !== activePortfolioId)
    : [];
  const canMoveCash = isPro && otherPortfolios.length > 0 && !!activePortfolioId;

  const handleMoveCash = async (cashId: string, toPortfolioId: string) => {
    if (!activePortfolioId || moveCashLoading) return;
    setMoveCashLoading(true);
    await moveToPortfolio({
      type: "cash",
      cashId,
      fromPortfolioId: activePortfolioId,
      toPortfolioId,
    });
    setMoveCashLoading(false);
    setMovingCashId(null);
  };

  const fetchIndices = useCallback(async () => {
    if (demoMode) {
      setIndices((prev) => prev.map((i) => ({ ...i, loading: false })));
      return;
    }
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
  }, [demoMode]);

  useEffect(() => {
    fetchIndices();
  }, [fetchIndices]);

  const { totalCurrentEUR, dayGainLossEUR } = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, baseCurrency);
  const prevPortfolioValue = totalCurrentEUR - dayGainLossEUR;
  const dayGainLossPercent = prevPortfolioValue > 0 ? (dayGainLossEUR / prevPortfolioValue) * 100 : 0;

  const cashTotal = cashEntries.reduce((sum, e) => sum + e.amountEUR, 0);

  const groupedEntries = useMemo(() => {
    const groups: Record<ManualAssetType, CashEntry[]> = {
      real_estate: [], savings: [], pension: [], fixed_return: [], cash: [],
    };
    for (const entry of cashEntries) {
      const type = entry.type ?? "cash";
      groups[type].push(entry);
    }
    return groups;
  }, [cashEntries]);

  const activeTypes = useMemo(
    () => TYPE_ORDER.filter((type) => groupedEntries[type].length > 0),
    [groupedEntries],
  );

  const groupTotals = useMemo(() => {
    const totals: Record<ManualAssetType, number> = {
      real_estate: 0, savings: 0, pension: 0, fixed_return: 0, cash: 0,
    };
    for (const type of TYPE_ORDER) {
      totals[type] = groupedEntries[type].reduce((s, e) => s + e.amountEUR, 0);
    }
    return totals;
  }, [groupedEntries]);

  const handleAddCash = async () => {
    const parsed = parseFloat(cashAmount);
    if (!cashName.trim() || Number.isNaN(parsed) || parsed < 0) return;
    track("cash_entry_added");
    try {
      await addCashEntry({ name: cashName.trim(), amountEUR: parsed });
      setCashName("");
      setCashAmount("");
    } catch {
      // Error is surfaced via portfolio context
    }
  };

  const startEdit = (id: string, name: string, amount: number) => {
    setEditingId(id);
    setEditName(name);
    setEditAmount(String(amount));
  };

  const saveEdit = async (id: string) => {
    const parsed = parseFloat(editAmount);
    if (!editName.trim() || Number.isNaN(parsed) || parsed < 0) return;
    try {
      await updateCashEntry(id, { name: editName.trim(), amountEUR: parsed });
      setEditingId(null);
    } catch {
      // Error is surfaced via portfolio context
    }
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
      ? "border border-zinc-800 rounded-none overflow-hidden"
      : layoutTheme === "canvas"
      ? "bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      : layoutTheme === "studio"
      ? "rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden"
      : "overflow-hidden rounded-[var(--radius-card,16px)] border border-[var(--border)] bg-[color:var(--surface-strong)] text-[var(--foreground)] shadow-[0_14px_28px_rgba(1,6,16,0.22)]";

  const sectionPad =
    layoutTheme === "terminal"
      ? "p-3 sm:p-4"
      : layoutTheme === "canvas"
      ? "p-5 sm:p-6"
      : layoutTheme === "studio"
      ? "p-4 sm:p-5"
      : "p-4 sm:p-5";

  const dividerClass =
    layoutTheme === "terminal"
      ? "border-zinc-800"
      : layoutTheme === "canvas"
        ? "border-slate-200"
        : layoutTheme === "studio"
          ? "border-white/5"
          : "border-[color:var(--border)]";

  return (
    <div className={cardClass}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Market Indices */}
        <div className={`${sectionPad} lg:border-r ${dividerClass}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
              {t("marketsToday")}
            </h3>
            <button
              onClick={fetchIndices}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2 text-xs text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-highlight)] hover:text-[color:var(--foreground)]"
              title="Refresh"
              aria-label="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-4">
            <table className="w-full text-sm">
              <caption className="sr-only">Market indices</caption>
              <thead>
                <tr className={`border-b ${dividerClass}`}>
                  <th scope="col" className="pb-2 pl-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] sm:pl-4">{t("stock")}</th>
                  <th scope="col" className="hidden pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] sm:table-cell">{t("weekTrend")}</th>
                  <th scope="col" className="hidden pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] sm:table-cell">{t("dayChange")}</th>
                  <th scope="col" className="pb-2 pr-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] sm:pr-4">{t("change")}</th>
                </tr>
              </thead>
              <tbody>
                {holdings.length > 0 && (
                  <tr className={`border-b border-l-2 border-l-emerald-400 bg-emerald-500/[0.05] ${dividerClass}`}>
                    <td className="py-2.5 pl-3 sm:pl-4">
                      <span className="font-semibold text-emerald-400">
                        {t("portfolio")}
                      </span>
                    </td>
                    <td className="py-2.5 text-center hidden sm:table-cell">
                      <PortfolioSparkline width={56} height={20} positive={dayGainLossEUR >= 0} />
                    </td>
                    <td className={`py-2.5 text-right tabular-nums font-medium hidden sm:table-cell ${changeColor(dayGainLossEUR)}`}>
                      {isLoading ? (
                        <span className="inline-block w-12 h-4 bg-gray-100 dark:bg-slate-700 rounded animate-value-shimmer" />
                      ) : (
                        formatCurrency(dayGainLossEUR, baseCurrency)
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-3 sm:pr-4">
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
                  <tr key={idx.symbol} className={`border-b last:border-0 ${dividerClass}`}>
                    <td className="py-2.5 pl-3 sm:pl-4">
                      <span className="font-medium text-[color:var(--foreground)]">
                        {t(idx.name as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="py-2.5 text-center hidden sm:table-cell">
                      <Sparkline ticker={idx.symbol} width={56} height={20} positive={idx.changePercent >= 0} />
                    </td>
                    <td className={`py-2.5 text-right tabular-nums hidden sm:table-cell ${changeColor(idx.change)}`}>
                      {idx.loading ? (
                        <span className="inline-block w-12 h-4 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
                      ) : (
                        <span>
                          {idx.change >= 0 ? "+" : ""}
                          {idx.change.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-3 sm:pr-4">
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

          <div className={`mt-3 pt-3 border-t ${dividerClass}`}>
            <button
              onClick={() => {
                track("benchmark_chart_toggled");
                setShowChart(!showChart);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showChart ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {t("viewBenchmarkChart")}
            </button>
          </div>

          {showChart && (
            <div className={`mt-3 pt-3 border-t ${dividerClass}`}>
              <PortfolioBenchmarkChart />
            </div>
          )}
        </div>

        {/* Assets & Cash Balances */}
        <div id="dashboard-cash-assets" className={`${sectionPad} border-t lg:border-t-0 ${dividerClass} scroll-mt-24`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{t("manualAssets")}</h3>
          </div>

          {cashEntries.length > 0 && (
            <div className="mb-3">
              <span className="text-xl font-bold tabular-nums text-[color:var(--foreground)]">
                {formatCurrency(cashTotal, baseCurrency)}
              </span>

              {activeTypes.length >= 2 && cashTotal > 0 && (
                <div className="mt-2">
                  <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                    {activeTypes.map((type) => {
                      const pct = (groupTotals[type] / cashTotal) * 100;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={type}
                          className={`${ASSET_TYPE_META[type].color} rounded-full`}
                          style={{ width: `${pct}%` }}
                          title={`${t(ASSET_TYPE_META[type].labelKey as Parameters<typeof t>[0])}: ${formatCurrency(groupTotals[type], baseCurrency)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {activeTypes.map((type) => (
                      <div key={type} className="flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${ASSET_TYPE_META[type].color}`} />
                        <span className="text-[10px] text-[color:var(--muted)]">
                          {t(ASSET_TYPE_META[type].labelKey as Parameters<typeof t>[0])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 mb-3">
            {cashEntries.length === 0 ? (
              <p className="text-xs text-[color:var(--muted)]">{t("noCashEntries")}</p>
            ) : (
              activeTypes.map((type) => {
                const meta = ASSET_TYPE_META[type];
                const entries = groupedEntries[type];
                const groupTotal = groupTotals[type];
                const showHeader = activeTypes.length >= 2;
                return (
                  <div key={type} className={showHeader ? `border-l-2 ${ASSET_TYPE_BORDER[type]} pl-2.5` : ""}>
                    {showHeader && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs">{meta.icon}</span>
                        <span className="text-xs font-semibold text-[color:var(--foreground)]">
                          {t(meta.labelKey as Parameters<typeof t>[0])}
                        </span>
                        <span className="ml-auto text-xs font-semibold tabular-nums text-[color:var(--muted)]">
                          {formatCurrency(groupTotal, baseCurrency)}
                        </span>
                      </div>
                    )}
                    {entries.map((entry) => {
                      const isEditing = editingId === entry.id;
                      return isEditing ? (
                        <div key={entry.id} className="space-y-1.5 rounded-xl border border-emerald-500/18 bg-emerald-500/[0.05] p-2">
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
                          className="group -mx-2 flex items-center justify-between rounded-xl px-2 py-1.5 transition-colors hover:bg-[color:var(--surface-soft)]"
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <span className="block truncate text-sm text-[color:var(--foreground)]">{entry.name}</span>
                            {entry.type === "fixed_return" && entry.startDate && (entry.termMonths ?? 0) > 0 && (
                              <span className="block truncate text-[11px] text-[color:var(--muted)]">
                                {(() => {
                                  const params = {
                                    principal: entry.displayAmount ?? entry.amountEUR,
                                    startDate: entry.startDate!,
                                    termMonths: entry.termMonths!,
                                    totalReturnPct: entry.totalReturnPct ?? 0,
                                  };
                                  const asOf = todayLocal();
                                  const matured = isFixedReturnMatured(params, asOf);
                                  if (matured) return t("fixedReturnMatured");
                                  const pct = Math.round(fixedReturnProgress(params, asOf) * 100);
                                  const maturity = maturityDateFor(params);
                                  return `${t("fixedReturnStartDate")} ${entry.startDate} · ${pct}% · ${t("fixedReturnMaturityDate")} ${maturity ?? ""}`;
                                })()}
                              </span>
                            )}
                            {entry.notes && entry.type !== "fixed_return" && (
                              <span className="block truncate text-[11px] text-[color:var(--muted)]">{entry.notes}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-medium tabular-nums text-[color:var(--foreground)]">
                              {formatCurrency(entry.amountEUR, baseCurrency)}
                            </span>
                            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  if (entry.type && entry.type !== "cash") {
                                    setEditAssetEntry(entry);
                                    return;
                                  }
                                  startEdit(entry.id, entry.name, entry.amountEUR);
                                }}
                                className="rounded p-1.5 min-h-9 min-w-9 inline-flex items-center justify-center text-[color:var(--muted)] transition-colors hover:text-emerald-400"
                                title={t("editValues")}
                                aria-label={t("editValues")}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              {canMoveCash && (
                                <div className="relative">
                                  <button
                                    onClick={() => setMovingCashId(movingCashId === entry.id ? null : entry.id)}
                                    disabled={moveCashLoading}
                                    className="rounded p-0.5 text-[color:var(--muted)] transition-colors hover:text-blue-300 disabled:opacity-50"
                                    title={t("moveToPortfolio")}
                                    aria-label={t("moveToPortfolio")}
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                  </button>
                                  {movingCashId === entry.id && (
                                    <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[160px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-overlay)] py-1 shadow-lg">
                                      {otherPortfolios.map((p) => (
                                        <button
                                          key={p.id}
                                          onClick={() => handleMoveCash(entry.id, p.id)}
                                          disabled={moveCashLoading}
                                          className="w-full px-3 py-1.5 text-left text-xs text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)] disabled:opacity-50"
                                        >
                                          {p.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => removeCashEntry(entry.id)}
                                className="rounded p-0.5 text-[color:var(--muted)] transition-colors hover:text-red-400"
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

          <div className={`flex items-center gap-1.5 border-t pt-2 ${dividerClass}`}>
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
      {editAssetEntry && (
        <AddManualAssetModal
          isOpen={!!editAssetEntry}
          editEntry={editAssetEntry}
          onClose={() => setEditAssetEntry(null)}
        />
      )}
    </div>
  );
}
