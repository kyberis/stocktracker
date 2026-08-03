"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { formatCurrency } from "@/lib/utils";
import { useWatchlist } from "@/lib/hooks/use-api";
import { usePortfolio } from "@/lib/portfolio-context";
import { getMarketStatus } from "@/lib/market-hours";
import type { QuoteData, SearchResult } from "@/lib/types";
import AlertForm from "./AlertForm";

export default function Watchlist() {
  const { t } = useI18n();
  const { getApiHeaders } = useSettings();
  const { data: items = [], mutate } = useWatchlist();
  const { alertedTickers } = usePortfolio();
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [alertFormTicker, setAlertFormTicker] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const tickers = items.map((i) => i.ticker).join(",");
    const headers = getApiHeaders();
    fetch(`/api/quote?symbols=${tickers}`, { headers })
      .then((r) => r.ok ? r.json() : {})
      .then(setQuotes);
  }, [items, getApiHeaders]);

  const searchStocks = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: getApiHeaders() });
      if (res.ok) setResults(await res.json());
    } finally { setSearching(false); }
  }, [getApiHeaders]);

  const handleAddItem = async (result: SearchResult) => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: result.symbol, name: result.shortname, exchange: result.exchange }),
    });
    setQuery("");
    setResults([]);
    mutate();
  };

  const handleRemove = async (id: string) => {
    await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    mutate();
  };

  let searchTimeout: ReturnType<typeof setTimeout>;
  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchStocks(val), 300);
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("watchlist")}</h3>

      {/* Search to add */}
      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="w-full text-sm"
        />
        {searching && <div className="absolute right-3 top-2.5"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" /></div>}
        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg max-h-40 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.symbol}
                onClick={() => handleAddItem(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{r.symbol}</span>
                  <span className="text-gray-500 dark:text-slate-400 ml-2">{r.shortname}</span>
                </div>
                <span className="text-emerald-500 text-[10px]">+ {t("addToWatchlist")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t("noWatchlistItems")}</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const q = quotes[item.ticker];
            const mktStatus = item.exchange ? getMarketStatus(item.exchange, now) : null;
            const hasAlert = alertedTickers.has(item.ticker);
            const showAlertForm = alertFormTicker === item.ticker;

            return (
              <div key={item.id}>
                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{item.name || item.ticker}</p>
                        {hasAlert && (
                          <span title={t("alertActive")} aria-label={t("alertActive")}>
                            <svg className="w-3 h-3 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{item.ticker} · {item.exchange}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {q && q.regularMarketPrice > 0 && (
                      <div className="text-right">
                        <p className="text-xs font-mono font-medium text-gray-900 dark:text-white">
                          {formatCurrency(q.regularMarketPrice, q.currency)}
                        </p>
                        <p className={`text-[10px] font-mono flex items-center gap-1 ${
                          q.regularMarketChangePercent >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}>
                          {mktStatus?.isOpen && (
                            <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                          )}
                          {q.regularMarketChangePercent >= 0 ? "+" : ""}{q.regularMarketChangePercent.toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {q && !(q.regularMarketPrice > 0) && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-gray-400 dark:text-slate-500">—</p>
                      </div>
                    )}
                    {/* Set alert button */}
                    <button
                      onClick={() => setAlertFormTicker(showAlertForm ? null : item.ticker)}
                      className={`p-1 rounded transition-colors ${hasAlert ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-emerald-500"}`}
                      title={hasAlert ? t("alertActive") : t("setAlert")}
                      aria-label={hasAlert ? t("alertActive") : t("setAlert")}
                    >
                      <svg className="w-4 h-4" fill={hasAlert ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </button>
                    <button onClick={() => handleRemove(item.id)} className="text-red-400 hover:text-red-600" title={t("removeFromWatchlist")} aria-label="Remove from watchlist">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Inline alert form */}
                {showAlertForm && (
                  <div className="ml-3 mr-3 mt-1 mb-2">
                    <AlertForm
                      ticker={item.ticker}
                      name={item.name || item.ticker}
                      exchange={item.exchange}
                      source="watchlist"
                      quote={q}
                      compact
                      onCreated={() => setAlertFormTicker(null)}
                      onCancel={() => setAlertFormTicker(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
