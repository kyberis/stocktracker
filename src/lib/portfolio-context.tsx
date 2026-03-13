"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { CashEntry, Holding, QuoteData, ExchangeRates, Goal } from "./types";
import { generateId, normalizeCurrency } from "./utils";
import { useSettings } from "./settings-context";

const QUOTES_CACHE_KEY = "trefolio-quotes-v3";
const RATES_CACHE_KEY = "trefolio-rates-v1";
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PortfolioInfo {
  id: string;
  name: string;
  isDefault: boolean;
  currency: string;
}

const BASE_FX_PAIRS = ["EURUSD", "EURGBP", "EURDKK", "EURCAD"];

function buildFxPairs(holdings: Holding[], portfolioCurrency: string): string[] {
  const needed = new Set<string>();
  for (const pair of BASE_FX_PAIRS) needed.add(pair);

  for (const h of holdings) {
    const norm = normalizeCurrency(h.displayCurrency);
    if (norm === "EUR") continue;
    if (norm === "GBX") { needed.add("EURGBP"); continue; }
    needed.add(`EUR${norm}`);
  }

  if (portfolioCurrency && portfolioCurrency !== "EUR") {
    needed.add(`EUR${portfolioCurrency}`);
  }

  return [...needed];
}

const ACTIVE_PORTFOLIO_KEY = "trefolio-active-portfolio";

interface PortfolioContextType {
  holdings: Holding[];
  cashEntries: CashEntry[];
  quotes: Record<string, QuoteData>;
  quoteUpdatedAt: Record<string, number>;
  refreshingTickers: Set<string>;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  error: string | null;
  portfolios: PortfolioInfo[];
  activePortfolioId: string | null;
  activePortfolioCurrency: string;
  alertedTickers: Set<string>;
  setActivePortfolio: (id: string | null) => void;
  refreshPortfolios: () => Promise<void | PortfolioInfo[]>;
  addHolding: (holding: Omit<Holding, "id">) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>;
  addCashEntry: (entry: Omit<CashEntry, "id">) => Promise<void>;
  removeCashEntry: (id: string) => Promise<void>;
  updateCashEntry: (id: string, updates: Partial<CashEntry>) => Promise<void>;
  refreshHoldings: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshSingleQuote: (ticker: string) => Promise<void>;
  refreshAlertedTickers: () => Promise<void>;
  lastUpdated: Date | null;
  demoMode: boolean;
  goal: Goal | null;
  goalProgress: number;
  saveGoal: (params: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<Goal | null>;
  deleteGoal: () => Promise<void>;
  refreshGoal: () => Promise<void>;
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
  demoMode?: boolean;
  initialQuotes?: Record<string, QuoteData>;
  initialExchangeRates?: ExchangeRates;
  initialGoal?: Goal | null;
}

export function PortfolioProvider({
  children, initialHoldings, initialCash,
  demoMode, initialQuotes, initialExchangeRates, initialGoal,
}: PortfolioProviderProps) {
  const { getApiHeaders } = useSettings();
  const hasServerData = !!(initialHoldings || initialCash);
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings ?? []);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(initialCash ?? []);
  const [portfolios, setPortfolios] = useState<PortfolioInfo[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(() => {
    if (demoMode || typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_PORTFOLIO_KEY) || null;
  });
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>(initialQuotes ?? {});
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<Record<string, number>>({});
  const [refreshingTickers, setRefreshingTickers] = useState<Set<string>>(new Set());
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(initialExchangeRates ?? {});
  const [isLoading, setIsLoading] = useState(!demoMode);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(demoMode ? new Date() : null);
  const [alertedTickers, setAlertedTickers] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState<Goal | null>(initialGoal ?? null);
  const fetchingRef = useRef(false);
  const fetchPortfolios = useCallback(async (): Promise<PortfolioInfo[]> => {
    try {
      const res = await fetch("/api/portfolios", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      const list: PortfolioInfo[] = data.portfolios ?? [];
      setPortfolios(list);
      return list;
    } catch { return []; }
  }, []);

  const fetchHoldings = useCallback(async () => {
    try {
      const url = activePortfolioId ? `/api/holdings?portfolioId=${encodeURIComponent(activePortfolioId)}` : "/api/holdings";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch holdings");
      const loaded = (await res.json()) as Holding[];
      setHoldings(loaded);
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch holdings");
      return [] as Holding[];
    }
  }, [activePortfolioId]);

  const fetchCashEntries = useCallback(async () => {
    try {
      const url = activePortfolioId ? `/api/cash?portfolioId=${encodeURIComponent(activePortfolioId)}` : "/api/cash";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch cash entries");
      const loaded = (await res.json()) as CashEntry[];
      setCashEntries(loaded);
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cash entries");
      return [] as CashEntry[];
    }
  }, [activePortfolioId]);

  const setActivePortfolio = useCallback((id: string | null) => {
    setActivePortfolioId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
      else localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
    }
  }, []);

  const mountedRef = useRef(false);
  const switchVersionRef = useRef(0);

  // One-time init on mount: load portfolios, cached quotes/rates, and initial holdings if needed
  useEffect(() => {
    if (demoMode) {
      mountedRef.current = true;
      return;
    }

    const init = async () => {
      setIsLoading(true);
      setError(null);

      const loadedPortfolios = await fetchPortfolios();

      // Auto-select the default portfolio when no selection is stored
      // or the stored selection doesn't belong to this user's portfolios
      let resolvedPortfolioId = activePortfolioId;
      const storedIsValid = resolvedPortfolioId && loadedPortfolios.some((p) => p.id === resolvedPortfolioId);
      if ((!resolvedPortfolioId || !storedIsValid) && loadedPortfolios.length > 0) {
        const defaultP = loadedPortfolios.find((p) => p.isDefault) ?? loadedPortfolios[0];
        resolvedPortfolioId = defaultP.id;
        setActivePortfolioId(resolvedPortfolioId);
        if (typeof window !== "undefined") {
          localStorage.setItem(ACTIVE_PORTFOLIO_KEY, resolvedPortfolioId);
        }
      }

      // Fetch holdings/cash if no server data OR if a specific portfolio is selected
      // (server data is unscoped; we need scoped data for a saved portfolio selection)
      const needsFetch = !hasServerData || resolvedPortfolioId != null;
      if (needsFetch) {
        const qp = resolvedPortfolioId ? `?portfolioId=${encodeURIComponent(resolvedPortfolioId)}` : "";
        const [holdingsRes, cashRes] = await Promise.all([
          fetch(`/api/holdings${qp}`, { cache: "no-store" }),
          fetch(`/api/cash${qp}`, { cache: "no-store" }),
        ]);
        const holdingsData: Holding[] = holdingsRes.ok ? await holdingsRes.json() : [];
        const cashData: CashEntry[] = cashRes.ok ? await cashRes.json() : [];
        setHoldings(holdingsData);
        setCashEntries(cashData);
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

      fetch("/api/alerts/tickers", { cache: "no-store" })
        .then((r) => r.ok ? r.json() : { tickers: [] })
        .then((d) => setAlertedTickers(new Set(d.tickers ?? [])))
        .catch(() => {});

      const goalQp = resolvedPortfolioId ? `?portfolioId=${encodeURIComponent(resolvedPortfolioId)}` : "?portfolioId=";
      fetch(`/api/goals${goalQp}`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : { goal: null })
        .then((d) => setGoal(d.goal ?? null))
        .catch(() => {});

      setIsLoading(false);
      mountedRef.current = true;
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch holdings & cash whenever activePortfolioId changes (after initial mount).
  // Fetches directly instead of through fetchHoldings/fetchCashEntries to avoid
  // stale data from slow previous fetches overwriting current state.
  useEffect(() => {
    if (demoMode || !mountedRef.current) return;
    const version = ++switchVersionRef.current;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
        const [holdingsRes, cashRes] = await Promise.all([
          fetch(`/api/holdings${qp}`, { cache: "no-store" }),
          fetch(`/api/cash${qp}`, { cache: "no-store" }),
        ]);

        if (switchVersionRef.current !== version) return;

        const holdingsData: Holding[] = holdingsRes.ok ? await holdingsRes.json() : [];
        const cashData: CashEntry[] = cashRes.ok ? await cashRes.json() : [];

        setHoldings(holdingsData);
        setCashEntries(cashData);
        setIsLoading(false);

        const tickers = [...new Set(holdingsData.map((h) => h.ticker))];
        if (tickers.length > 0) {
          fetchQuotes(tickers);
        }

        const goalQp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "?portfolioId=";
        fetch(`/api/goals${goalQp}`, { cache: "no-store" })
          .then((r) => r.ok ? r.json() : { goal: null })
          .then((d) => { if (switchVersionRef.current === version) setGoal(d.goal ?? null); })
          .catch(() => {});
      } catch (err) {
        if (switchVersionRef.current !== version) return;
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortfolioId]);

  const buildFetchUrl = useCallback(
    (base: string, extra: Record<string, string> = {}) => {
      const params = new URLSearchParams(extra);
      return `${base}?${params}`;
    },
    []
  );

  const getPortfolioCurrency = useCallback(() => {
    if (!activePortfolioId) return "EUR";
    const found = portfolios.find((p) => p.id === activePortfolioId);
    return found?.currency ?? "EUR";
  }, [activePortfolioId, portfolios]);

  const fetchExchangeRates = useCallback(async (currentHoldings?: Holding[]): Promise<ExchangeRates> => {
    const fxPairs = buildFxPairs(currentHoldings ?? holdings, getPortfolioCurrency());
    if (fxPairs.length === 0) return {};
    const params = new URLSearchParams({ pairs: fxPairs.join(",") });
    const res = await fetch(`/api/exchange-rates?${params}`);
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    const data = await res.json();
    return parseExchangeRatesFromApi(data);
  }, [holdings, getPortfolioCurrency]);

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
    if (demoMode || holdings.length === 0) return;
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

  const fetchQuoteForTicker = useCallback(async (ticker: string) => {
    setRefreshingTickers((prev) => { const s = new Set(prev); s.add(ticker); return s; });
    try {
      const headers = getApiHeaders();
      const url = buildFetchUrl("/api/quote", { symbols: ticker });
      const res = await fetch(url, { headers });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, QuoteData>;
      const q = data[ticker];
      if (q) {
        const now = Date.now();
        const stamped = { ...q, fetchedAt: now };
        setQuotes((prev) => { const m = { ...prev, [ticker]: stamped }; saveToStorage(QUOTES_CACHE_KEY, m); return m; });
        setQuoteUpdatedAt((prev) => ({ ...prev, [ticker]: now }));
      }
      const rates = await fetchExchangeRates();
      setExchangeRates((prev) => { const m = { ...prev, ...rates }; saveToStorage(RATES_CACHE_KEY, m); return m; });
      setLastUpdated(new Date());
    } catch { /* non-critical */ } finally {
      setRefreshingTickers((prev) => { const s = new Set(prev); s.delete(ticker); return s; });
    }
  }, [getApiHeaders, buildFetchUrl, fetchExchangeRates]);

  const addHolding = useCallback(async (holding: Omit<Holding, "id">) => {
    const tempId = generateId();
    const optimistic = { ...holding, id: tempId };
    setHoldings((prev) => [...prev, optimistic]);

    try {
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/holdings${qp}`, {
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
      fetchQuoteForTicker(created.ticker);
    } catch (err) {
      setHoldings((prev) => prev.filter((h) => h.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }, [activePortfolioId, fetchQuoteForTicker]);

  const removeHolding = useCallback(async (id: string) => {
    const previous = holdings;
    setHoldings((prev) => prev.filter((h) => h.id !== id));

    try {
      const qp = activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/holdings?id=${encodeURIComponent(id)}${qp}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove holding");
    } catch (err) {
      setHoldings(previous);
      setError(err instanceof Error ? err.message : "Failed to remove holding");
    }
  }, [holdings, activePortfolioId]);

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
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/cash${qp}`, {
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
  }, [activePortfolioId]);

  const removeCashEntry = useCallback(async (id: string) => {
    const previous = cashEntries;
    setCashEntries((prev) => prev.filter((c) => c.id !== id));
    try {
      const qp = activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/cash?id=${encodeURIComponent(id)}${qp}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove cash entry");
    } catch (err) {
      setCashEntries(previous);
      setError(err instanceof Error ? err.message : "Failed to remove cash entry");
    }
  }, [cashEntries, activePortfolioId]);

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
    if (demoMode) return;
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

  const refreshAlertedTickers = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/tickers", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setAlertedTickers(new Set(data.tickers ?? []));
    } catch { /* non-critical */ }
  }, []);

  const fetchGoal = useCallback(async () => {
    if (demoMode) return;
    try {
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "?portfolioId=";
      const res = await fetch(`/api/goals${qp}`, { cache: "no-store" });
      if (!res.ok) { setGoal(null); return; }
      const data = await res.json();
      setGoal(data.goal ?? null);
    } catch { setGoal(null); }
  }, [demoMode, activePortfolioId]);

  const saveGoalCb = useCallback(async (params: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Goal | null> => {
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const saved = data.goal as Goal;
      setGoal(saved);
      return saved;
    } catch { return null; }
  }, []);

  const deleteGoalCb = useCallback(async () => {
    if (!goal) return;
    try {
      await fetch(`/api/goals?id=${encodeURIComponent(goal.id)}`, { method: "DELETE" });
      setGoal(null);
    } catch { /* non-critical */ }
  }, [goal]);

  const refreshHoldings = useCallback(async () => {
    await Promise.all([fetchHoldings(), fetchCashEntries()]);
  }, [fetchHoldings, fetchCashEntries]);

  const activePortfolioCurrency = useMemo(() => {
    if (!activePortfolioId) return "EUR";
    const found = portfolios.find((p) => p.id === activePortfolioId);
    return found?.currency ?? "EUR";
  }, [activePortfolioId, portfolios]);

  const goalProgress = useMemo(() => {
    if (!goal || goal.targetAmount <= 0) return 0;
    // Simple progress: uses convertToEUR-based total from holdings + cash
    // The exact total calculation happens in components that have access to calculatePortfolioTotals
    // Here we provide a reasonable estimate using raw holdings cost as floor
    return 0; // Components compute this from calculatePortfolioTotals
  }, [goal]);

  const noop = useCallback(async () => {}, []);
  const noopGoal = useCallback(async () => null as Goal | null, []);
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
      portfolios,
      activePortfolioId,
      activePortfolioCurrency,
      alertedTickers,
      setActivePortfolio: demoMode ? () => {} : setActivePortfolio,
      refreshPortfolios: demoMode ? noop : fetchPortfolios,
      addHolding: demoMode ? noop : addHolding,
      removeHolding: demoMode ? noop : removeHolding,
      updateHolding: demoMode ? noop : updateHolding,
      addCashEntry: demoMode ? noop : addCashEntry,
      removeCashEntry: demoMode ? noop : removeCashEntry,
      updateCashEntry: demoMode ? noop : updateCashEntry,
      refreshHoldings: demoMode ? noop : refreshHoldings,
      refreshQuotes: demoMode ? noop : refreshQuotes,
      refreshSingleQuote: demoMode ? noop : refreshSingleQuote,
      refreshAlertedTickers: demoMode ? noop : refreshAlertedTickers,
      lastUpdated,
      demoMode: !!demoMode,
      goal,
      goalProgress,
      saveGoal: demoMode ? noopGoal : saveGoalCb,
      deleteGoal: demoMode ? noop : deleteGoalCb,
      refreshGoal: demoMode ? noop : fetchGoal,
    }),
    [
      holdings, cashEntries, quotes, quoteUpdatedAt, refreshingTickers, exchangeRates,
      isLoading, error, portfolios, activePortfolioId, activePortfolioCurrency, alertedTickers, setActivePortfolio, fetchPortfolios,
      addHolding, removeHolding, updateHolding, addCashEntry,
      removeCashEntry, updateCashEntry, refreshHoldings, refreshQuotes, refreshSingleQuote,
      refreshAlertedTickers, lastUpdated, demoMode, noop, noopGoal,
      goal, goalProgress, saveGoalCb, deleteGoalCb, fetchGoal,
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
