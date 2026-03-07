"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { formatCurrency } from "@/lib/utils";
import { useWatchlist } from "@/lib/hooks/use-api";
import { getMarketStatus } from "@/lib/market-hours";
import type { QuoteData, SearchResult } from "@/lib/types";

export default function Watchlist() {
  const { t } = useI18n();
  const { provider, getApiHeaders, trackAvCalls } = useSettings();
  const { data: items = [], mutate } = useWatchlist();
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const tickers = items.map((i) => i.ticker).join(",");
    const headers = getApiHeaders();
    fetch(`/api/quote?symbols=${tickers}&provider=${provider}`, { headers })
      .then((r) => { trackAvCalls(r); return r.ok ? r.json() : {}; })
      .then(setQuotes);
  }, [items, provider, getApiHeaders, trackAvCalls]);

  const searchStocks = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&provider=${provider}`, { headers: getApiHeaders() });
      trackAvCalls(res);
      if (res.ok) setResults(await res.json());
    } finally { setSearching(false); }
  }, [provider, getApiHeaders, trackAvCalls]);

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
            return (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{item.name || item.ticker}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{item.ticker} · {item.exchange}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {q && (
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
                  <button onClick={() => handleRemove(item.id)} className="text-red-400 hover:text-red-600" title={t("removeFromWatchlist")}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
