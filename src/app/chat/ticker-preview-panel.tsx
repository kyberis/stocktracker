"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ExternalLink, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface QuoteInfo {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
}

interface TickerPreviewPanelProps {
  ticker: string;
  onClose: () => void;
}

function fmt(n: number, currency?: string): string {
  const f = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!currency) return f;
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF ", JPY: "¥" };
  return `${sym[currency] || currency + " "}${f}`;
}

function fmtCompact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

export default function TickerPreviewPanel({ ticker, onClose }: TickerPreviewPanelProps) {
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  useEffect(() => {
    setLoading(true);
    setError("");
    setQuote(null);
    fetch(`/api/quote?symbols=${encodeURIComponent(ticker)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data: Record<string, QuoteInfo>) => {
        const q = data[ticker];
        if (!q || q.regularMarketPrice === 0) throw new Error("No data available");
        setQuote(q);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [ticker]);

  const isPositive = (quote?.regularMarketChange ?? 0) >= 0;
  const changeColor = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
  const changeBg = isPositive
    ? "bg-emerald-50 dark:bg-emerald-500/10"
    : "bg-red-50 dark:bg-red-500/10";

  const cur = quote?.currency || "USD";

  let range52Pct = 0;
  if (quote && quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow) {
    range52Pct = ((quote.regularMarketPrice - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        className={`relative w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto transition-transform duration-200 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                {ticker.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">${ticker}</h2>
                {quote?.shortName && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{quote.shortName}</p>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 dark:text-slate-400">{error}</p>
            </div>
          )}

          {quote && (
            <div className="space-y-4">
              {/* Price hero */}
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {fmt(quote.regularMarketPrice, cur)}
                </p>
                <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-sm font-semibold ${changeBg} ${changeColor}`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isPositive ? "+" : ""}{fmt(quote.regularMarketChange, cur)}
                  <span className="text-xs opacity-80">
                    ({isPositive ? "+" : ""}{quote.regularMarketChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Prev. Close</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                    {fmt(quote.regularMarketPreviousClose, cur)}
                  </p>
                </div>
                {quote.marketCap != null && quote.marketCap > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Market Cap</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                      {fmtCompact(quote.marketCap)}
                    </p>
                  </div>
                )}
              </div>

              {/* 52-week range */}
              {quote.fiftyTwoWeekHigh > 0 && quote.fiftyTwoWeekLow > 0 && (
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-1.5">52-Week Range</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-slate-300 tabular-nums shrink-0">{fmt(quote.fiftyTwoWeekLow, cur)}</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, range52Pct))}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-200 border-2 border-indigo-600 shadow-sm"
                        style={{ left: `calc(${Math.min(100, Math.max(0, range52Pct))}% - 5px)` }}
                      />
                    </div>
                    <span className="text-gray-600 dark:text-slate-300 tabular-nums shrink-0">{fmt(quote.fiftyTwoWeekHigh, cur)}</span>
                  </div>
                </div>
              )}

              {/* Full details link */}
              <a
                href={`/analisis/${encodeURIComponent(ticker)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View full details
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
