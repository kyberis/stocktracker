"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { CashEntry, Holding, QuoteData, ExchangeRates } from "./types";
import { generateId } from "./utils";
import { useSettings } from "./settings-context";

const QUOTES_CACHE_KEY = "trefolio-quotes-v3";
const RATES_CACHE_KEY = "trefolio-rates-v1";
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const FX_PAIRS = ["EURUSD", "EURGBP", "EURDKK", "EURCAD"];

interface PortfolioContextType {
  holdings: Holding[];
  cashEntries: CashEntry[];
  quotes: Record<string, QuoteData>;
  quoteUpdatedAt: Record<string, number>;
  refreshingTickers: Set<string>;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  error: string | null;
  addHolding: (holding: Omit<Holding, "id">) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>;
  addCashEntry: (entry: Omit<CashEntry, "id">) => Promise<void>;
  removeCashEntry: (id: string) => Promise<void>;
  updateCashEntry: (id: string, updates: Partial<CashEntry>) => Promise<void>;
  refreshHoldings: () => Promise<void>;
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

function parseExchangeRatesFromApi(
  data: Record<string, { rate: number; provider: string }>
): ExchangeRates {
  const rates: ExchangeRates = {};
  for (const [pair, val] of Object.entries(data)) {
    if (val && val.rate > 0) {
      rates[pair] = val.rate;
    }
  }
  return rates;
}

export interface PortfolioProviderProps {
  children: React.ReactNode;
  initialHoldings?: Holding[];
  initialCash?: CashEntry[];
}

export function PortfolioProvider({ children, initialHoldings, initialCash }: PortfolioProviderProps) {
  const { getApiHeaders } = useSettings();
  const hasServerData = !!(initialHoldings || initialCash);
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings ?? []);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(initialCash ?? []);
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

  const fetchCashEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/cash", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch cash entries");
      const loaded = (await res.json()) as CashEntry[];
      setCashEntries(loaded);
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cash entries");
      return [] as CashEntry[];
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      // Skip API fetch for holdings/cash if server-provided initial data exists
      if (!hasServerData) {
        await Promise.all([fetchHoldings(), fetchCashEntries()]);
      }
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
  }, [fetchHoldings, fetchCashEntries]);

  const buildFetchUrl = useCallback(
    (base: string, extra: Record<string, string> = {}) => {
      const params = new URLSearchParams(extra);
      return `${base}?${params}`;
    },
    []
  );

  const fetchExchangeRates = useCallback(async (): Promise<ExchangeRates> => {
    const params = new URLSearchParams({ pairs: FX_PAIRS.join(",") });
    const res = await fetch(`/api/exchange-rates?${params}`);
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    const data = await res.json();
    return parseExchangeRatesFromApi(data);
  }, []);

  const fetchQuotes = useCallback(async (tickers: string[]) => {
    if (fetchingRef.current || tickers.length === 0) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const allQuotes: Record<string, QuoteData> = {};
      const batchSize = 10;
      const headers = getApiHeaders();

      const batches: string[][] = [];
      for (let i = 0; i < tickers.length; i += batchSize) {
        batches.push(tickers.slice(i, i + batchSize));
      }

      const [batchResults, rates] = await Promise.all([
        Promise.all(
          batches.map(async (batch) => {
            const url = buildFetchUrl("/api/quote", { symbols: batch.join(",") });
            const res = await fetch(url, { headers });
            if (res.status === 429) throw new Error("rate_limited");
            if (!res.ok) throw new Error("Failed to fetch quotes");
            return res.json();
          })
        ),
        fetchExchangeRates(),
      ]);

      for (const data of batchResults) {
        Object.assign(allQuotes, data);
      }

      const stockQuotes: Record<string, QuoteData> = {};
      const now = Date.now();
      const updatedAtByTicker: Record<string, number> = {};
      for (const [key, val] of Object.entries(allQuotes)) {
        stockQuotes[key] = { ...val, fetchedAt: now };
        updatedAtByTicker[key] = now;
      }

      setQuotes(stockQuotes);
      setQuoteUpdatedAt(updatedAtByTicker);
      setExchangeRates(rates);
      saveToStorage(QUOTES_CACHE_KEY, stockQuotes);
      saveToStorage(RATES_CACHE_KEY, rates);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch quotes";
      setError(msg === "rate_limited" ? "Rate limit reached. Retrying shortly..." : msg);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [getApiHeaders, buildFetchUrl, fetchExchangeRates]);

  const refreshQuotes = useCallback(async () => {
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    await fetchQuotes(tickers);
  }, [holdings, fetchQuotes]);

  const { refreshInterval } = useSettings();

  useEffect(() => {
    if (holdings.length === 0) return;
    const ms = refreshInterval * 60 * 1000;
    const id = window.setInterval(() => {
      const tickers = [...new Set(holdings.map((h) => h.ticker))];
      if (tickers.length > 0) fetchQuotes(tickers);
    }, ms);
    return () => window.clearInterval(id);
  }, [holdings, refreshInterval, fetchQuotes]);

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
      const url = buildFetchUrl("/api/quote", { symbols: ticker });
      const res = await fetch(url, { headers });
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

      const rates = await fetchExchangeRates();
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
  }, [buildFetchUrl, getApiHeaders, refreshingTickers, fetchExchangeRates]);

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
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to add holding");
      }
      const created = (await res.json()) as Holding;
      setHoldings((prev) => {
        const merged = prev.some(
          (h) => h.id !== tempId && h.id === created.id
        );
        if (merged) {
          return prev
            .filter((h) => h.id !== tempId)
            .map((h) => (h.id === created.id ? created : h));
        }
        return prev.map((h) => (h.id === tempId ? created : h));
      });
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

  const addCashEntry = useCallback(async (entry: Omit<CashEntry, "id">) => {
    const tempId = generateId();
    const optimistic = { ...entry, id: tempId };
    setCashEntries((prev) => [...prev, optimistic]);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error("Failed to add cash entry");
      const created = (await res.json()) as CashEntry;
      setCashEntries((prev) => prev.map((c) => (c.id === tempId ? created : c)));
    } catch (err) {
      setCashEntries((prev) => prev.filter((c) => c.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to add cash entry");
    }
  }, []);

  const removeCashEntry = useCallback(async (id: string) => {
    const previous = cashEntries;
    setCashEntries((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/cash?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove cash entry");
    } catch (err) {
      setCashEntries(previous);
      setError(err instanceof Error ? err.message : "Failed to remove cash entry");
    }
  }, [cashEntries]);

  const updateCashEntry = useCallback(async (id: string, updates: Partial<CashEntry>) => {
    const previous = cashEntries;
    setCashEntries((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      const res = await fetch("/api/cash", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      });
      if (!res.ok) throw new Error("Failed to update cash entry");
      const updated = (await res.json()) as CashEntry;
      setCashEntries((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setCashEntries(previous);
      setError(err instanceof Error ? err.message : "Failed to update cash entry");
    }
  }, [cashEntries]);

  const enrichedNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const enrichable = holdings.filter(
      (h) =>
        !enrichedNamesRef.current.has(h.id) &&
        h.name === h.ticker &&
        quotes[h.ticker]?.shortName &&
        quotes[h.ticker].shortName !== h.ticker
    );
    if (enrichable.length === 0) return;

    for (const h of enrichable) {
      enrichedNamesRef.current.add(h.id);
      updateHolding(h.id, { name: quotes[h.ticker].shortName });
    }
  }, [quotes, holdings, updateHolding]);

  const refreshHoldings = useCallback(async () => {
    await fetchHoldings();
  }, [fetchHoldings]);

  const value = useMemo(
    () => ({
      holdings,
      cashEntries,
      quotes,
      quoteUpdatedAt,
      refreshingTickers,
      exchangeRates,
      isLoading,
      error,
      addHolding,
      removeHolding,
      updateHolding,
      addCashEntry,
      removeCashEntry,
      updateCashEntry,
      refreshHoldings,
      refreshQuotes,
      refreshSingleQuote,
      lastUpdated,
    }),
    [
      holdings, cashEntries, quotes, quoteUpdatedAt, refreshingTickers, exchangeRates,
      isLoading, error, addHolding, removeHolding, updateHolding, addCashEntry,
      removeCashEntry, updateCashEntry, refreshHoldings, refreshQuotes, refreshSingleQuote, lastUpdated,
    ]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used within PortfolioProvider");
  return context;
}
