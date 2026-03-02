"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { Holding, QuoteData, ExchangeRates } from "./types";
import { generateId } from "./utils";
import { useSettings } from "./settings-context";

const QUOTES_CACHE_KEY = "stocktracker-quotes-v3";
const RATES_CACHE_KEY = "stocktracker-rates-v1";
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const FX_PAIRS = ["EURUSD=X", "EURGBP=X", "EURDKK=X", "EURCAD=X"];

interface PortfolioContextType {
  holdings: Holding[];
  quotes: Record<string, QuoteData>;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  error: string | null;
  addHolding: (holding: Omit<Holding, "id">) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>;
  refreshQuotes: () => Promise<void>;
  lastUpdated: Date | null;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

function loadFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as CacheEntry<T>;
      if (Date.now() - parsed.timestamp < CACHE_TTL) return parsed.data;
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
  const { provider, alphaVantageApiKey, getApiHeaders, trackAvCalls } = useSettings();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);
  const fetchingRef = useRef(false);
  const providerRef = useRef(provider);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

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

      const loaded = await fetchHoldings();
    const cachedQuotes = loadFromStorage<Record<string, QuoteData>>(QUOTES_CACHE_KEY);
      if (cachedQuotes) {
        setQuotes(cachedQuotes);
        setLastUpdated(new Date());
      }

      const cachedRates = loadFromStorage<ExchangeRates>(RATES_CACHE_KEY);
      if (cachedRates) setExchangeRates(cachedRates);

      if (!cachedQuotes && loaded.length > 0) {
        const tickers = [...new Set(loaded.map((h) => h.ticker))];
        await fetchQuotes(tickers);
      }

      setInitialized(true);
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
      for (const [key, val] of Object.entries(allQuotes)) {
        if (!key.includes("=X")) stockQuotes[key] = val;
      }

      const rates = parseExchangeRates(allQuotes);

      setQuotes(stockQuotes);
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

  useEffect(() => {
    if (!initialized || holdings.length === 0) return;
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    fetchQuotes(tickers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, alphaVantageApiKey]);

  const refreshQuotes = useCallback(async () => {
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    localStorage.removeItem(QUOTES_CACHE_KEY);
    localStorage.removeItem(RATES_CACHE_KEY);
    await fetchQuotes(tickers);
  }, [holdings, fetchQuotes]);

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
        exchangeRates,
        isLoading,
        error,
        addHolding,
        removeHolding,
        updateHolding,
        refreshQuotes,
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
