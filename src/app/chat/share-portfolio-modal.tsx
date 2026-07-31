"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Loader2, Pin, TrendingUp, PieChart, BarChart3, Star } from "lucide-react";
import type { Holding, QuoteData, ExchangeRates, CashEntry } from "@/lib/types";
import { calculatePortfolioTotals, computeAllocationByType } from "@/lib/portfolio-summary";

type ShareTab = "holding" | "allocation" | "summary" | "stock_pick";
type HoldingPrivacy = "full" | "anonymous" | "ticker_only";
type AllocationPrivacy = "full" | "percentages" | "categories";
type SummaryPrivacy = "full" | "percentages" | "count_only";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (type: ShareTab, content: string, persistent: boolean) => void;
}

const TABS: { key: ShareTab; label: string; icon: typeof TrendingUp }[] = [
  { key: "holding", label: "Holding", icon: TrendingUp },
  { key: "allocation", label: "Allocation", icon: PieChart },
  { key: "summary", label: "Summary", icon: BarChart3 },
  { key: "stock_pick", label: "Stock Pick", icon: Star },
];

export default function SharePortfolioModal({ open, onClose, onSend }: Props) {
  const [tab, setTab] = useState<ShareTab>("holding");
  const [persistent, setPersistent] = useState(false);

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cash, setCash] = useState<CashEntry[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedTicker, setSelectedTicker] = useState("");
  const [holdingPrivacy, setHoldingPrivacy] = useState<HoldingPrivacy>("full");
  const [allocationPrivacy, setAllocationPrivacy] = useState<AllocationPrivacy>("full");
  const [summaryPrivacy, setSummaryPrivacy] = useState<SummaryPrivacy>("full");
  const [pickNote, setPickNote] = useState("");

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [holdingsRes, cashRes, ratesRes] = await Promise.all([
        fetch("/api/holdings"),
        fetch("/api/cash"),
        fetch(`/api/exchange-rates?pairs=${encodeURIComponent(
          // Keep in sync with ALL_EUR_FX_PAIRS (supported portfolio currencies)
          ["EURUSD","EURGBP","EURCHF","EURSEK","EURNOK","EURDKK","EURCAD","EURAUD","EURNZD","EURJPY","EURPLN","EURCZK","EURHUF","EURRON","EURSGD","EURHKD","EURZAR","EURTRY","EURBRL","EURMXN"].join(",")
        )}`),
      ]);

      if (!holdingsRes.ok || !cashRes.ok || !ratesRes.ok) throw new Error("Failed to load portfolio");

      const [h, c, rawRates] = await Promise.all([holdingsRes.json(), cashRes.json(), ratesRes.json()]);
      setHoldings(h);
      setCash(c);
      const parsedRates: ExchangeRates = {};
      for (const [pair, val] of Object.entries(rawRates as Record<string, { rate: number }>)) {
        if (val && val.rate > 0) parsedRates[pair] = val.rate;
      }
      setExchangeRates(parsedRates);

      const tickers = (h as Holding[]).map((x) => x.ticker);
      if (tickers.length > 0) {
        const quotesRes = await fetch(`/api/quote?symbols=${tickers.join(",")}`);
        if (quotesRes.ok) {
          const qMap: Record<string, QuoteData> = await quotesRes.json();
          setQuotes(qMap);
        }
      }

      if ((h as Holding[]).length > 0) setSelectedTicker((h as Holding[])[0].ticker);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && holdings.length === 0) fetchPortfolioData();
  }, [open, holdings.length, fetchPortfolioData]);

  const rawTotals = useMemo(
    () => (holdings.length > 0 ? calculatePortfolioTotals(holdings, cash, quotes, exchangeRates) : null),
    [holdings, cash, quotes, exchangeRates],
  );

  const totals = useMemo(() => {
    if (!rawTotals) return null;
    const prevValue = rawTotals.totalCurrentEUR - rawTotals.dayGainLossEUR;
    const dayChangePct = prevValue > 0 ? (rawTotals.dayGainLossEUR / prevValue) * 100 : 0;
    return { ...rawTotals, dayGainLoss: rawTotals.dayGainLossEUR, dayGainLossPercent: dayChangePct };
  }, [rawTotals]);

  const allocation = useMemo(
    () => computeAllocationByType(holdings, cash, quotes, exchangeRates),
    [holdings, cash, quotes, exchangeRates],
  );

  const selectedHolding = holdings.find((h) => h.ticker === selectedTicker);
  const selectedQuote = selectedTicker ? quotes[selectedTicker] : undefined;

  function buildPayload(): { type: ShareTab; content: string } | null {
    switch (tab) {
      case "holding": {
        if (!selectedHolding) return null;
        const data: Record<string, unknown> = {
          ticker: selectedHolding.ticker,
          privacy: holdingPrivacy,
          currency: selectedQuote?.currency || selectedHolding.displayCurrency,
        };
        if (holdingPrivacy !== "ticker_only") {
          if (selectedQuote) {
            data.currentPrice = selectedQuote.regularMarketPrice;
            data.changePct = selectedQuote.regularMarketChangePercent;
            data.change = selectedQuote.regularMarketChange;
          }
        }
        if (holdingPrivacy === "full") {
          data.name = selectedHolding.name;
          data.shares = selectedHolding.shares;
          data.avgPrice = selectedHolding.purchasePrice;
        }
        if (holdingPrivacy === "anonymous") {
          data.name = selectedHolding.name;
        }
        return { type: "holding", content: JSON.stringify(data) };
      }
      case "allocation": {
        const items = allocation.map((a) => ({
          label: allocationPrivacy === "categories" ? a.key : a.label,
          pct: a.percent,
          color: a.color,
        }));
        const data: Record<string, unknown> = { items, privacy: allocationPrivacy };
        if (allocationPrivacy === "full" && totals) {
          data.totalValue = totals.totalCurrentEUR;
          data.currency = "EUR";
        }
        return { type: "allocation", content: JSON.stringify(data) };
      }
      case "summary": {
        const data: Record<string, unknown> = {
          holdingsCount: holdings.length,
          privacy: summaryPrivacy,
        };
        if (summaryPrivacy !== "count_only" && totals) {
          data.dayChangePct = totals.dayGainLossPercent;
          const topH = [...holdings]
            .map((h) => {
              const q = quotes[h.ticker];
              const val = q ? h.shares * q.regularMarketPrice : h.valueInEUR;
              return { ticker: h.ticker, val, pct: totals.totalCurrentEUR > 0 ? (val / totals.totalCurrentEUR) * 100 : 0 };
            })
            .sort((a, b) => b.val - a.val)
            .slice(0, 5)
            .map((x) => ({ ticker: x.ticker, pct: x.pct }));
          data.topHoldings = topH;
        }
        if (summaryPrivacy === "full" && totals) {
          data.totalValue = totals.totalCurrentEUR;
          data.dayChange = totals.dayGainLoss;
          data.currency = "EUR";
        }
        return { type: "summary", content: JSON.stringify(data) };
      }
      case "stock_pick": {
        if (!selectedHolding) return null;
        const data: Record<string, unknown> = {
          ticker: selectedHolding.ticker,
          name: selectedHolding.name,
          currency: selectedQuote?.currency || selectedHolding.displayCurrency,
        };
        if (selectedQuote) data.currentPrice = selectedQuote.regularMarketPrice;
        if (pickNote.trim()) data.note = pickNote.trim();
        return { type: "stock_pick", content: JSON.stringify(data) };
      }
      default:
        return null;
    }
  }

  function handleSend() {
    const payload = buildPayload();
    if (!payload) return;
    onSend(payload.type, payload.content, persistent);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-base">Share Portfolio Data</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-8">{error}</p>
          ) : (
            <>
              {/* Holding / Stock Pick: ticker selector */}
              {(tab === "holding" || tab === "stock_pick") && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Select holding</label>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    {holdings.map((h) => (
                      <option key={h.ticker} value={h.ticker}>
                        {h.ticker} — {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Holding: privacy */}
              {tab === "holding" && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Privacy level</label>
                  <select
                    value={holdingPrivacy}
                    onChange={(e) => setHoldingPrivacy(e.target.value as HoldingPrivacy)}
                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="full">Full details (shares, avg price, P&L)</option>
                    <option value="anonymous">Anonymous (price & change only)</option>
                    <option value="ticker_only">Ticker only</option>
                  </select>
                </div>
              )}

              {/* Allocation: privacy */}
              {tab === "allocation" && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Privacy level</label>
                  <select
                    value={allocationPrivacy}
                    onChange={(e) => setAllocationPrivacy(e.target.value as AllocationPrivacy)}
                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="full">Full (amounts + percentages)</option>
                    <option value="percentages">Percentages only</option>
                    <option value="categories">Categories only (names hidden)</option>
                  </select>
                </div>
              )}

              {/* Summary: privacy */}
              {tab === "summary" && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Privacy level</label>
                  <select
                    value={summaryPrivacy}
                    onChange={(e) => setSummaryPrivacy(e.target.value as SummaryPrivacy)}
                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <option value="full">Full (value + change + top holdings)</option>
                    <option value="percentages">Percentages + top holdings</option>
                    <option value="count_only">Holdings count only</option>
                  </select>
                </div>
              )}

              {/* Stock Pick: note */}
              {tab === "stock_pick" && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Your note (optional)</label>
                  <input
                    type="text"
                    value={pickNote}
                    onChange={(e) => setPickNote(e.target.value)}
                    placeholder="Why this stock?"
                    maxLength={200}
                    className="w-full text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                  />
                </div>
              )}

              {/* Preview */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Preview</div>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 flex justify-center">
                  <CardPreview
                    tab={tab}
                    holding={selectedHolding}
                    quote={selectedQuote}
                    holdingPrivacy={holdingPrivacy}
                    allocationPrivacy={allocationPrivacy}
                    summaryPrivacy={summaryPrivacy}
                    allocation={allocation}
                    totals={totals}
                    holdings={holdings}
                    quotes={quotes}
                    pickNote={pickNote}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${persistent ? "bg-indigo-500" : "bg-gray-300 dark:bg-slate-600"}`}
              onClick={() => setPersistent(!persistent)}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${persistent ? "translate-x-4" : ""}`} />
            </div>
            <Pin className={`w-3.5 h-3.5 ${persistent ? "text-indigo-500" : "text-gray-400"}`} />
            <span className="text-sm text-gray-700 dark:text-slate-300">Keep permanently</span>
          </label>

          <button
            onClick={handleSend}
            disabled={loading || (tab === "holding" && !selectedHolding) || (tab === "stock_pick" && !selectedHolding)}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Share in chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline preview (reuses the card shapes from chat-room-view for visual consistency)
// ---------------------------------------------------------------------------

interface CardPreviewProps {
  tab: ShareTab;
  holding?: Holding;
  quote?: QuoteData;
  holdingPrivacy: HoldingPrivacy;
  allocationPrivacy: AllocationPrivacy;
  summaryPrivacy: SummaryPrivacy;
  allocation: { key: string; label: string; percent: number; color: string; valueEUR: number }[];
  totals: { totalCurrentEUR: number; dayGainLoss: number; dayGainLossPercent: number } | null;
  holdings: Holding[];
  quotes: Record<string, QuoteData>;
  pickNote: string;
}

function fmt(n: number, currency?: string): string {
  const f = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!currency) return f;
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF ", JPY: "¥" };
  return `${sym[currency] || currency + " "}${f}`;
}

function CardPreview({ tab, holding, quote, holdingPrivacy, allocationPrivacy, summaryPrivacy, allocation, totals, holdings, quotes, pickNote }: CardPreviewProps) {
  if (tab === "holding" && holding) {
    const cur = quote?.currency || holding.displayCurrency;
    return (
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[240px] text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">{holding.ticker.slice(0, 2)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{holding.ticker}</div>
            {holdingPrivacy === "full" && <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{holding.name}</div>}
            {holdingPrivacy === "anonymous" && <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{holding.name}</div>}
          </div>
        </div>
        {holdingPrivacy !== "ticker_only" && (
          <div className="space-y-1 text-xs">
            {quote && <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-medium">{fmt(quote.regularMarketPrice, cur)}</span></div>}
            {holdingPrivacy === "full" && <div className="flex justify-between"><span className="text-gray-500">Shares</span><span className="font-medium">{holding.shares}</span></div>}
            {holdingPrivacy === "full" && <div className="flex justify-between"><span className="text-gray-500">Avg price</span><span className="font-medium">{fmt(holding.purchasePrice, cur)}</span></div>}
            {quote && <div className="flex justify-between"><span className="text-gray-500">Change</span><span className={`font-medium ${quote.regularMarketChangePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>{quote.regularMarketChangePercent >= 0 ? "+" : ""}{quote.regularMarketChangePercent.toFixed(2)}%</span></div>}
          </div>
        )}
        <div className="mt-2 text-[10px] text-gray-400 uppercase tracking-wider">Shared Holding</div>
      </div>
    );
  }

  if (tab === "allocation" && allocation.length > 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[240px] text-sm">
        <div className="text-xs font-semibold mb-2">Portfolio Allocation</div>
        {allocationPrivacy === "full" && totals && <div className="text-lg font-bold mb-2">{fmt(totals.totalCurrentEUR, "EUR")}</div>}
        <div className="flex h-3 rounded-full overflow-hidden mb-2">
          {allocation.map((a, i) => <div key={i} style={{ width: `${a.percent}%`, backgroundColor: a.color }} className="min-w-[2px]" />)}
        </div>
        <div className="space-y-1">
          {allocation.slice(0, 6).map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span className="flex-1 truncate text-gray-600 dark:text-slate-300">{allocationPrivacy === "categories" ? "••••" : a.label}</span>
              <span className="font-medium">{a.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-gray-400 uppercase tracking-wider">Shared Allocation</div>
      </div>
    );
  }

  if (tab === "summary" && totals) {
    const showValues = summaryPrivacy === "full";
    const showPcts = summaryPrivacy !== "count_only";
    const topH = showPcts
      ? [...holdings]
          .map((h) => {
            const q = quotes[h.ticker];
            const val = q ? h.shares * q.regularMarketPrice : h.valueInEUR;
            return { ticker: h.ticker, pct: totals.totalCurrentEUR > 0 ? (val / totals.totalCurrentEUR) * 100 : 0, val };
          })
          .sort((a, b) => b.val - a.val)
          .slice(0, 5)
      : [];
    return (
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[240px] text-sm">
        <div className="text-xs font-semibold mb-1">Portfolio Summary</div>
        {showValues && <div className="text-lg font-bold">{fmt(totals.totalCurrentEUR, "EUR")}</div>}
        {showPcts && (
          <div className={`text-sm font-medium ${totals.dayGainLossPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totals.dayGainLossPercent >= 0 ? "+" : ""}{totals.dayGainLossPercent.toFixed(2)}%
            {showValues && <span className="text-gray-500 ml-1 text-xs">({totals.dayGainLoss >= 0 ? "+" : ""}{fmt(totals.dayGainLoss, "EUR")})</span>}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">{holdings.length} holdings</div>
        {topH.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {topH.map((h, i) => <div key={i} className="flex justify-between text-xs"><span className="text-gray-600 dark:text-slate-300">{h.ticker}</span><span className="font-medium">{h.pct.toFixed(1)}%</span></div>)}
          </div>
        )}
        <div className="mt-2 text-[10px] text-gray-400 uppercase tracking-wider">Shared Summary</div>
      </div>
    );
  }

  if (tab === "stock_pick" && holding) {
    const cur = quote?.currency || holding.displayCurrency;
    return (
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-[200px] max-w-[240px] text-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300">{holding.ticker.slice(0, 2)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{holding.ticker}</div>
            <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{holding.name}</div>
          </div>
        </div>
        {quote && <div className="text-sm font-bold">{fmt(quote.regularMarketPrice, cur)}</div>}
        {pickNote.trim() && <div className="mt-1 text-xs text-gray-600 dark:text-slate-300 italic">&ldquo;{pickNote}&rdquo;</div>}
        <div className="mt-2 text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1"><span>⭐</span> Stock Pick</div>
      </div>
    );
  }

  return <p className="text-xs text-gray-400 py-4">Select data to share</p>;
}
