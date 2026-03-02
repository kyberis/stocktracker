"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { Holding, QuoteData, ExchangeRates } from "./types";
import { generateId } from "./utils";
import { useSettings } from "./settings-context";

const QUOTES_CACHE_KEY = "stocktracker-quotes-v3";
const RATES_CACHE_KEY = "stocktracker-rates-v1";
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const FX_PAIRS = ["EURUSD=X", "EURGBP=X", "EURDKK=X", "EURCAD=X"];

interface PortfolioContextType {
  holdings: Holding[];
  quotes: Record<string, QuoteData>;
  quoteUpdatedAt: Record<string, number>;
  refreshingTickers: Set<string>;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  error: string | null;
  addHolding: (holding: Omit<Holding, "id">) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshSingleQuote: (ticker: string) => Promise<void>;
  lastUpdated: Date | null;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

function loadCacheEntry<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as CacheEntry<T> | T;
      if (
        parsed &&
        typeof parsed === "object" &&
        "data" in parsed &&
        "timestamp" in parsed
      ) {
        const entry = parsed as CacheEntry<T>;
        return {
          data: entry.data,
          timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
        };
      }
      return { data: parsed as T, timestamp: Date.now() };
    }
  } catch { /* ignore */ }
  return null;
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function parseExchangeRates(quotes: Record<string, QuoteData>): ExchangeRates {
  const rates: ExchangeRates = {};
  for (const pair of FX_PAIRS) {
    const quote = quotes[pair];
    if (quote && quote.regularMarketPrice > 0) {
      const key = pair.replace("=X", "");
      rates[key] = quote.regularMarketPrice;
    }
  }
  return rates;
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { provider, getApiHeaders, trackAvCalls } = useSettings();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<Record<string, number>>({});
  const [refreshingTickers, setRefreshingTickers] = useState<Set<string>>(new Set());
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchingRef = useRef(false);
  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/holdings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch holdings");
      const loaded = (await res.json()) as Holding[];
      setHoldings(loaded);
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch holdings");
      return [] as Holding[];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      await fetchHoldings();
      const cachedQuotes = loadCacheEntry<Record<string, QuoteData>>(QUOTES_CACHE_KEY);
      if (cachedQuotes?.data) {
        setQuotes(cachedQuotes.data);
        const nextUpdatedAt: Record<string, number> = {};
        for (const [symbol, quote] of Object.entries(cachedQuotes.data)) {
          if (typeof quote.fetchedAt === "number") {
            nextUpdatedAt[symbol] = quote.fetchedAt;
          }
        }
        setQuoteUpdatedAt(nextUpdatedAt);
        setLastUpdated(new Date(cachedQuotes.timestamp));
      }

      const cachedRates = loadCacheEntry<ExchangeRates>(RATES_CACHE_KEY);
      if (cachedRates?.data) setExchangeRates(cachedRates.data);
      setIsLoading(false);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHoldings]);

  const buildFetchUrl = useCallback(
    (base: string, extra: Record<string, string> = {}) => {
      const params = new URLSearchParams({ provider, ...extra });
      return `${base}?${params}`;
    },
    [provider]
  );

  const fetchQuotes = useCallback(async (tickers: string[]) => {
    if (fetchingRef.current || tickers.length === 0) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const allSymbols = [...tickers, ...FX_PAIRS];
      const allQuotes: Record<string, QuoteData> = {};
      const batchSize = 10;
      const headers = getApiHeaders();

      for (let i = 0; i < allSymbols.length; i += batchSize) {
        const batch = allSymbols.slice(i, i + batchSize);
        const url = buildFetchUrl("/api/quote", { symbols: batch.join(",") });
        const res = await fetch(url, { headers });
        trackAvCalls(res);
        if (!res.ok) throw new Error("Failed to fetch quotes");
        const data = await res.json();
        Object.assign(allQuotes, data);
      }

      const stockQuotes: Record<string, QuoteData> = {};
      const now = Date.now();
      const updatedAtByTicker: Record<string, number> = {};
      for (const [key, val] of Object.entries(allQuotes)) {
        if (!key.includes("=X")) {
          stockQuotes[key] = { ...val, fetchedAt: now };
          updatedAtByTicker[key] = now;
        }
      }

      const rates = parseExchangeRates(allQuotes);

      setQuotes(stockQuotes);
      setQuoteUpdatedAt(updatedAtByTicker);
      setExchangeRates(rates);
      saveToStorage(QUOTES_CACHE_KEY, stockQuotes);
      saveToStorage(RATES_CACHE_KEY, rates);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch quotes");
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [getApiHeaders, buildFetchUrl, trackAvCalls]);

  const refreshQuotes = useCallback(async () => {
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    await fetchQuotes(tickers);
  }, [holdings, fetchQuotes]);

  const refreshSingleQuote = useCallback(async (ticker: string) => {
    if (!ticker || fetchingRef.current || refreshingTickers.has(ticker)) return;
    setError(null);
    setRefreshingTickers((prev) => {
      const next = new Set(prev);
      next.add(ticker);
      return next;
    });

    try {
      const headers = getApiHeaders();
      const symbols = [ticker, ...FX_PAIRS];
      const url = buildFetchUrl("/api/quote", { symbols: symbols.join(",") });
      const res = await fetch(url, { headers });
      trackAvCalls(res);
      if (!res.ok) throw new Error("Failed to fetch quote");

      const allQuotes = (await res.json()) as Record<string, QuoteData>;
      const now = Date.now();
      const nextQuote = allQuotes[ticker];
      if (nextQuote) {
        const withTimestamp = { ...nextQuote, fetchedAt: now };
        setQuotes((prev) => {
          const merged = { ...prev, [ticker]: withTimestamp };
          saveToStorage(QUOTES_CACHE_KEY, merged);
          return merged;
        });
        setQuoteUpdatedAt((prev) => ({ ...prev, [ticker]: now }));
      }

      const rates = parseExchangeRates(allQuotes);
      setExchangeRates((prev) => {
        const merged = { ...prev, ...rates };
        saveToStorage(RATES_CACHE_KEY, merged);
        return merged;
      });
      setLastUpdated(new Date(now));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch quote");
    } finally {
      setRefreshingTickers((prev) => {
        const next = new Set(prev);
        next.delete(ticker);
        return next;
      });
    }
  }, [buildFetchUrl, getApiHeaders, refreshingTickers, trackAvCalls]);

  const addHolding = useCallback(async (holding: Omit<Holding, "id">) => {
    const tempId = generateId();
    const optimistic = { ...holding, id: tempId };
    setHoldings((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holding),
      });
      if (!res.ok) throw new Error("Failed to add holding");
      const created = (await res.json()) as Holding;
      setHoldings((prev) => prev.map((h) => (h.id === tempId ? created : h)));
    } catch (err) {
      setHoldings((prev) => prev.filter((h) => h.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }, []);

  const removeHolding = useCallback(async (id: string) => {
    const previous = holdings;
    setHoldings((prev) => prev.filter((h) => h.id !== id));

    try {
      const res = await fetch(`/api/holdings?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove holding");
    } catch (err) {
      setHoldings(previous);
      setError(err instanceof Error ? err.message : "Failed to remove holding");
    }
  }, [holdings]);

  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    const previous = holdings;
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));

    try {
      const res = await fetch("/api/holdings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      });
      if (!res.ok) throw new Error("Failed to update holding");
      const updated = (await res.json()) as Holding;
      setHoldings((prev) => prev.map((h) => (h.id === id ? updated : h)));
    } catch (err) {
      setHoldings(previous);
      setError(err instanceof Error ? err.message : "Failed to update holding");
    }
  }, [holdings]);

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        quotes,
        quoteUpdatedAt,
        refreshingTickers,
        exchangeRates,
        isLoading,
        error,
        addHolding,
        removeHolding,
        updateHolding,
        refreshQuotes,
        refreshSingleQuote,
        lastUpdated,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used within PortfolioProvider");
  return context;
}
