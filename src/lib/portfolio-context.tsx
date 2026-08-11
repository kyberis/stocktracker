"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { CashEntry, Holding, QuoteData, ExchangeRates, Goal } from "./types";
import { generateId } from "./utils";
import { useSettings } from "./settings-context";
import { fetchWithAuthRedirect } from "@/lib/auth/client-redirect";
import { marketDataSymbolForHolding } from "@/lib/market-symbol";
import { buildNeededFxPairs } from "@/lib/fx-pairs";

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

function buildFxPairs(
  holdings: Holding[],
  portfolioCurrency: string,
  quotes?: Record<string, QuoteData>,
): string[] {
  return buildNeededFxPairs([
    ...holdings.map((h) => h.displayCurrency),
    portfolioCurrency,
    ...(quotes ? Object.values(quotes).map((q) => q.currency) : []),
  ]);
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
  isInitializing: boolean;
  isRefreshing: boolean;
  error: string | null;
  portfolios: PortfolioInfo[];
  activePortfolioId: string | null;
  activePortfolioCurrency: string;
  alertedTickers: Set<string>;
  /** Increments on every add/remove of holdings or cash entries — used by charts to trigger recalculation. */
  mutationVersion: number;
  setActivePortfolio: (id: string | null) => void;
  refreshPortfolios: () => Promise<void | PortfolioInfo[]>;
  addHolding: (holding: Omit<Holding, "id"> & { purchaseDate?: string }) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>;
  addCashEntry: (entry: Omit<CashEntry, "id">) => Promise<void>;
  removeCashEntry: (id: string) => Promise<void>;
  updateCashEntry: (id: string, updates: Partial<CashEntry>) => Promise<void>;
  moveToPortfolio: (params: {
    type: "holding" | "cash";
    ticker?: string;
    exchange?: string;
    cashId?: string;
    fromPortfolioId: string;
    toPortfolioId: string;
  }) => Promise<boolean>;
  refreshHoldings: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshSingleQuote: (ticker: string) => Promise<void>;
  refreshAlertedTickers: () => Promise<void>;
  lastUpdated: Date | null;
  holdingsLastFetchedAt: Date | null;
  demoMode: boolean;
  goals: Goal[];
  /** Primary goal (highest priority) — convenience alias for dashboard widgets */
  goal: Goal | null;
  saveGoal: (params: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<Goal | null>;
  deleteGoal: (goalId?: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
  /** @deprecated Use refreshGoals */
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
  initialPortfolios?: PortfolioInfo[];
}

export function PortfolioProvider({
  children, initialHoldings, initialCash,
  demoMode, initialQuotes, initialExchangeRates, initialGoal,
  initialPortfolios,
}: PortfolioProviderProps) {
  const { getApiHeaders } = useSettings();
  const hasServerData = !!(initialHoldings || initialCash);
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings ?? []);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(initialCash ?? []);
  const [portfolios, setPortfolios] = useState<PortfolioInfo[]>(initialPortfolios ?? []);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>(initialQuotes ?? {});
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<Record<string, number>>({});
  const [refreshingTickers, setRefreshingTickers] = useState<Set<string>>(new Set());
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(initialExchangeRates ?? {});
  const hasInitialQuotes = !!(initialQuotes && Object.keys(initialQuotes).length > 0);
  const [isInitializing, setIsInitializing] = useState(!demoMode && !hasInitialQuotes);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(demoMode ? new Date() : null);
  const [holdingsLastFetchedAt, setHoldingsLastFetchedAt] = useState<Date | null>(
    (demoMode || initialHoldings) ? new Date() : null
  );
  const [alertedTickers, setAlertedTickers] = useState<Set<string>>(new Set());
  const [mutationVersion, setMutationVersion] = useState(0);
  const [goals, setGoals] = useState<Goal[]>(initialGoal ? [initialGoal] : []);

  const setActivePortfolio = useCallback((id: string | null) => {
    setActivePortfolioId(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
      else localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
    }
  }, []);

  const restoredPortfolioRef = useRef(false);
  useEffect(() => {
    if (demoMode || restoredPortfolioRef.current) return;
    restoredPortfolioRef.current = true;
    const stored = localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
    if (stored) setActivePortfolio(stored);
  }, [demoMode, setActivePortfolio]);
  const fetchingRef = useRef(false);
  const fetchPortfolios = useCallback(async (): Promise<PortfolioInfo[]> => {
    try {
      const res = await fetchWithAuthRedirect("/api/portfolios", { cache: "no-store" });
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
      const res = await fetchWithAuthRedirect(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch holdings");
      const loaded = (await res.json()) as Holding[];
      setHoldings(loaded);
      setHoldingsLastFetchedAt(new Date());
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch holdings");
      return [] as Holding[];
    }
  }, [activePortfolioId]);

  const fetchCashEntries = useCallback(async () => {
    try {
      const url = activePortfolioId ? `/api/cash?portfolioId=${encodeURIComponent(activePortfolioId)}` : "/api/cash";
      const res = await fetchWithAuthRedirect(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch cash entries");
      const loaded = (await res.json()) as CashEntry[];
      setCashEntries(loaded);
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cash entries");
      return [] as CashEntry[];
    }
  }, [activePortfolioId]);

  const mountedRef = useRef(false);
  const switchVersionRef = useRef(0);

  // One-time init on mount: load portfolios, cached quotes/rates, and initial holdings if needed
  useEffect(() => {
    if (demoMode) {
      mountedRef.current = true;
      return;
    }

    const init = async () => {
      setError(null);

      const loadedPortfolios = initialPortfolios?.length
        ? initialPortfolios
        : await fetchPortfolios();

      const defaultP = loadedPortfolios.find(p => p.isDefault) ?? loadedPortfolios[0];

      const storedFromDisk =
        typeof window !== "undefined" ? localStorage.getItem(ACTIVE_PORTFOLIO_KEY) : null;
      let resolvedPortfolioId = activePortfolioId ?? storedFromDisk ?? null;
      const storedIsValid = resolvedPortfolioId && loadedPortfolios.some((p) => p.id === resolvedPortfolioId);
      if ((!resolvedPortfolioId || !storedIsValid) && loadedPortfolios.length > 0) {
        resolvedPortfolioId = defaultP.id;
        setActivePortfolio(resolvedPortfolioId);
      }

      // page.tsx fetches unscoped holdings which covers the default portfolio.
      // Only re-fetch when the resolved portfolio differs from the default.
      const serverCoversResolved = hasServerData &&
        (!resolvedPortfolioId || resolvedPortfolioId === defaultP?.id);
      const needsFetch = !serverCoversResolved;
      let holdingsData: Holding[] = initialHoldings ?? [];
      if (needsFetch) {
        const qp = resolvedPortfolioId ? `?portfolioId=${encodeURIComponent(resolvedPortfolioId)}` : "";
        const [holdingsRes, cashRes] = await Promise.all([
          fetchWithAuthRedirect(`/api/holdings${qp}`, { cache: "no-store" }),
          fetchWithAuthRedirect(`/api/cash${qp}`, { cache: "no-store" }),
        ]);
        holdingsData = holdingsRes.ok ? await holdingsRes.json() : [];
        const cashData: CashEntry[] = cashRes.ok ? await cashRes.json() : [];
        setHoldings(holdingsData);
        setCashEntries(cashData);
      }

      const hasServerQuotes = initialQuotes && Object.keys(initialQuotes).length > 0;
      const hasServerRates = initialExchangeRates && Object.keys(initialExchangeRates).length > 0;

      let hasCachedQuotes = false;
      if (!hasServerQuotes) {
        const cachedQuotes = loadCacheEntry<Record<string, QuoteData>>(QUOTES_CACHE_KEY);
        if (cachedQuotes?.data) {
          hasCachedQuotes = true;
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
      } else {
        setLastUpdated(new Date());
      }

      if (!hasServerRates) {
        const cachedRates = loadCacheEntry<ExchangeRates>(RATES_CACHE_KEY);
        if (cachedRates?.data) setExchangeRates(cachedRates.data);
      }

      fetchWithAuthRedirect("/api/alerts/tickers", { cache: "no-store" })
        .then((r) => r.ok ? r.json() : { tickers: [] })
        .then((d) => setAlertedTickers(new Set(d.tickers ?? [])))
        .catch(() => {});

      const goalQp = resolvedPortfolioId ? `?portfolioId=${encodeURIComponent(resolvedPortfolioId)}` : "?portfolioId=";
      fetchWithAuthRedirect(`/api/goals${goalQp}`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : { goals: [] })
        .then((d) => setGoals(d.goals ?? (d.goal ? [d.goal] : [])))
        .catch(() => {});

      mountedRef.current = true;

      const allTickers = [...new Set(holdingsData.map((h: Holding) => h.ticker))];
      if (allTickers.length > 0 && !hasServerQuotes) {
        if (hasCachedQuotes) setIsInitializing(false);
        fetchQuotes(allTickers, { background: hasCachedQuotes });
      } else {
        setIsInitializing(false);
        if (hasServerQuotes && allTickers.length > 0) {
          setTimeout(() => {
            if (!fetchingRef.current) fetchQuotes(allTickers, { background: true });
          }, 30_000);
        }
      }
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
    setError(null);

    (async () => {
      try {
        const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
        const [holdingsRes, cashRes] = await Promise.all([
          fetchWithAuthRedirect(`/api/holdings${qp}`, { cache: "no-store" }),
          fetchWithAuthRedirect(`/api/cash${qp}`, { cache: "no-store" }),
        ]);

        if (switchVersionRef.current !== version) return;

        const holdingsData: Holding[] = holdingsRes.ok ? await holdingsRes.json() : [];
        const cashData: CashEntry[] = cashRes.ok ? await cashRes.json() : [];

        setHoldings(holdingsData);
        setCashEntries(cashData);
        setHoldingsLastFetchedAt(new Date());

        const tickers = [...new Set(holdingsData.map((h) => h.ticker))];
        if (tickers.length > 0) {
          fetchQuotes(tickers, { background: true });
        }

        const goalQp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "?portfolioId=";
        fetchWithAuthRedirect(`/api/goals${goalQp}`, { cache: "no-store" })
          .then((r) => r.ok ? r.json() : { goals: [] })
          .then((d) => { if (switchVersionRef.current === version) setGoals(d.goals ?? (d.goal ? [d.goal] : [])); })
          .catch(() => {});
      } catch (err) {
        if (switchVersionRef.current !== version) return;
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
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

  const fetchExchangeRates = useCallback(async (
    currentHoldings?: Holding[],
    currentQuotes?: Record<string, QuoteData>,
  ): Promise<ExchangeRates> => {
    const fxPairs = buildFxPairs(
      currentHoldings ?? holdings,
      getPortfolioCurrency(),
      currentQuotes,
    );
    if (fxPairs.length === 0) return {};
    const params = new URLSearchParams({ pairs: fxPairs.join(",") });
    const res = await fetchWithAuthRedirect(`/api/exchange-rates?${params}`);
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error("Failed to fetch exchange rates");
    const data = await res.json();
    return parseExchangeRatesFromApi(data);
  }, [holdings, getPortfolioCurrency]);

  const quoteRequestSymbol = useCallback(
    (ticker: string) => {
      const holding = holdings.find((h) => h.ticker === ticker);
      return holding ? marketDataSymbolForHolding(holding) : ticker;
    },
    [holdings],
  );

  const fetchQuotes = useCallback(async (tickers: string[], options?: { background?: boolean }) => {
    if (fetchingRef.current || tickers.length === 0) return;
    const { background = false } = options ?? {};
    fetchingRef.current = true;
    setIsRefreshing(true);
    if (!background) setError(null);

    try {
      const allQuotes: Record<string, QuoteData> = {};
      const batchSize = 10;
      const headers = getApiHeaders();

      const requestByTicker = new Map(
        tickers.map((t) => [t, quoteRequestSymbol(t)] as const),
      );
      const uniqueRequestSymbols = [...new Set(requestByTicker.values())];

      const batches: string[][] = [];
      for (let i = 0; i < uniqueRequestSymbols.length; i += batchSize) {
        batches.push(uniqueRequestSymbols.slice(i, i + batchSize));
      }

      const batchResults = await Promise.all(
        batches.map(async (batch) => {
          const url = buildFetchUrl("/api/quote", { symbols: batch.join(",") });
          const res = await fetchWithAuthRedirect(url, { headers });
          if (res.status === 429) throw new Error("rate_limited");
          if (!res.ok) throw new Error("Failed to fetch quotes");
          return res.json();
        }),
      );

      for (const data of batchResults) {
        Object.assign(allQuotes, data);
      }

      const stockQuotes: Record<string, QuoteData> = {};
      const now = Date.now();
      const updatedAtByTicker: Record<string, number> = {};
      for (const ticker of tickers) {
        const requestSymbol = requestByTicker.get(ticker) ?? ticker;
        const val = allQuotes[requestSymbol] ?? allQuotes[ticker];
        if (!val) continue;
        stockQuotes[ticker] = { ...val, fetchedAt: now };
        updatedAtByTicker[ticker] = now;
      }

      // Fetch FX after quotes so quote.currency (e.g. HKD) is included — not only displayCurrency
      const rates = await fetchExchangeRates(holdings, stockQuotes);

      setQuotes(stockQuotes);
      setQuoteUpdatedAt(updatedAtByTicker);
      setExchangeRates(rates);
      saveToStorage(QUOTES_CACHE_KEY, stockQuotes);
      saveToStorage(RATES_CACHE_KEY, rates);
      setLastUpdated(new Date());
    } catch (err) {
      if (!background) {
        const msg = err instanceof Error ? err.message : "Failed to fetch quotes";
        setError(msg === "rate_limited" ? "Rate limit reached. Retrying shortly..." : msg);
      }
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
      fetchingRef.current = false;
    }
  }, [getApiHeaders, buildFetchUrl, fetchExchangeRates, quoteRequestSymbol]);

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
      if (tickers.length > 0) fetchQuotes(tickers, { background: true });
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
      const requestSymbol = quoteRequestSymbol(ticker);
      const url = buildFetchUrl("/api/quote", { symbols: requestSymbol });
      const res = await fetchWithAuthRedirect(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch quote");

      const allQuotes = (await res.json()) as Record<string, QuoteData>;
      const now = Date.now();
      const nextQuote = allQuotes[requestSymbol] ?? allQuotes[ticker];
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
  }, [buildFetchUrl, getApiHeaders, refreshingTickers, fetchExchangeRates, quoteRequestSymbol]);

  const fetchQuoteForTicker = useCallback(async (ticker: string) => {
    setRefreshingTickers((prev) => { const s = new Set(prev); s.add(ticker); return s; });
    try {
      const headers = getApiHeaders();
      const requestSymbol = quoteRequestSymbol(ticker);
      const url = buildFetchUrl("/api/quote", { symbols: requestSymbol });
      const res = await fetchWithAuthRedirect(url, { headers });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, QuoteData>;
      const q = data[requestSymbol] ?? data[ticker];
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
  }, [getApiHeaders, buildFetchUrl, fetchExchangeRates, quoteRequestSymbol]);

  const addHolding = useCallback(async (holding: Omit<Holding, "id"> & { purchaseDate?: string }) => {
    const tempId = generateId();
    const optimistic = { ...holding, id: tempId };
    setHoldings((prev) => [...prev, optimistic]);
    // Start quote fetch immediately so the hero can show "Calculating…" instead of €0
    void fetchQuoteForTicker(holding.ticker);

    try {
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetchWithAuthRedirect(`/api/holdings${qp}`, {
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
      setMutationVersion((v) => v + 1);
      // Refresh quote if the earlier request finished before the holding was saved
      if (!quotes[created.ticker]?.regularMarketPrice) {
        void fetchQuoteForTicker(created.ticker);
      }
    } catch (err) {
      setHoldings((prev) => prev.filter((h) => h.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }, [activePortfolioId, fetchQuoteForTicker, quotes]);

  const removeHolding = useCallback(async (id: string) => {
    const previous = holdings;
    setHoldings((prev) => prev.filter((h) => h.id !== id));

    try {
      const qp = activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetchWithAuthRedirect(`/api/holdings?id=${encodeURIComponent(id)}${qp}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove holding");
      setMutationVersion((v) => v + 1);
    } catch (err) {
      setHoldings(previous);
      setError(err instanceof Error ? err.message : "Failed to remove holding");
    }
  }, [holdings, activePortfolioId]);

  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    const previous = holdings;
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));

    try {
      const res = await fetchWithAuthRedirect("/api/holdings", {
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
      const res = await fetchWithAuthRedirect(`/api/cash${qp}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) {
        let message = "Failed to add cash entry";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          /* ignore parse errors */
        }
        throw new Error(message);
      }
      const created = (await res.json()) as CashEntry;
      setCashEntries((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      setMutationVersion((v) => v + 1);
    } catch (err) {
      setCashEntries((prev) => prev.filter((c) => c.id !== tempId));
      setError(err instanceof Error ? err.message : "Failed to add cash entry");
      throw err;
    }
  }, [activePortfolioId]);

  const removeCashEntry = useCallback(async (id: string) => {
    const previous = cashEntries;
    setCashEntries((prev) => prev.filter((c) => c.id !== id));
    try {
      const qp = activePortfolioId ? `&portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetchWithAuthRedirect(`/api/cash?id=${encodeURIComponent(id)}${qp}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove cash entry");
      setMutationVersion((v) => v + 1);
    } catch (err) {
      setCashEntries(previous);
      setError(err instanceof Error ? err.message : "Failed to remove cash entry");
    }
  }, [cashEntries, activePortfolioId]);

  const updateCashEntry = useCallback(async (id: string, updates: Partial<CashEntry>) => {
    const previous = cashEntries;
    setCashEntries((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      const res = await fetchWithAuthRedirect("/api/cash", {
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
      const res = await fetchWithAuthRedirect("/api/alerts/tickers", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setAlertedTickers(new Set(data.tickers ?? []));
    } catch { /* non-critical */ }
  }, []);

  const fetchGoals = useCallback(async () => {
    if (demoMode) return;
    try {
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "?portfolioId=";
      const res = await fetchWithAuthRedirect(`/api/goals${qp}`, { cache: "no-store" });
      if (!res.ok) { setGoals([]); return; }
      const data = await res.json();
      setGoals(data.goals ?? (data.goal ? [data.goal] : []));
    } catch { setGoals([]); }
  }, [demoMode, activePortfolioId]);

  const saveGoalCb = useCallback(async (params: Omit<Goal, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Goal | null> => {
    try {
      const res = await fetchWithAuthRedirect("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const saved = data.goal as Goal;
      setGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === saved.id);
        if (idx >= 0) return prev.map((g) => (g.id === saved.id ? saved : g));
        return [...prev, saved];
      });
      return saved;
    } catch { return null; }
  }, []);

  const deleteGoalCb = useCallback(async (goalId?: string) => {
    const id = goalId ?? goals[0]?.id;
    if (!id) return;
    try {
      await fetchWithAuthRedirect(`/api/goals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch { /* non-critical */ }
  }, [goals]);

  const refreshHoldings = useCallback(async () => {
    await Promise.all([fetchHoldings(), fetchCashEntries()]);
  }, [fetchHoldings, fetchCashEntries]);

  const moveToPortfolio = useCallback(async (params: {
    type: "holding" | "cash";
    ticker?: string;
    exchange?: string;
    cashId?: string;
    fromPortfolioId: string;
    toPortfolioId: string;
  }): Promise<boolean> => {
    try {
      const res = await fetchWithAuthRedirect("/api/portfolios/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) return false;
      await Promise.all([fetchHoldings(), fetchCashEntries()]);
      setMutationVersion((v) => v + 1);
      return true;
    } catch {
      return false;
    }
  }, [fetchHoldings, fetchCashEntries]);

  const activePortfolioCurrency = useMemo(() => {
    if (!activePortfolioId) return "EUR";
    const found = portfolios.find((p) => p.id === activePortfolioId);
    return found?.currency ?? "EUR";
  }, [activePortfolioId, portfolios]);

  const isLoading = isInitializing || isRefreshing;

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
      isInitializing,
      isRefreshing,
      error,
      portfolios,
      activePortfolioId,
      activePortfolioCurrency,
      alertedTickers,
      mutationVersion,
      setActivePortfolio: demoMode ? () => {} : setActivePortfolio,
      refreshPortfolios: demoMode ? noop : fetchPortfolios,
      addHolding: demoMode ? noop : addHolding,
      removeHolding: demoMode ? noop : removeHolding,
      updateHolding: demoMode ? noop : updateHolding,
      addCashEntry: demoMode ? noop : addCashEntry,
      removeCashEntry: demoMode ? noop : removeCashEntry,
      updateCashEntry: demoMode ? noop : updateCashEntry,
      moveToPortfolio: demoMode ? (async () => false) : moveToPortfolio,
      refreshHoldings: demoMode ? noop : refreshHoldings,
      refreshQuotes: demoMode ? noop : refreshQuotes,
      refreshSingleQuote: demoMode ? noop : refreshSingleQuote,
      refreshAlertedTickers: demoMode ? noop : refreshAlertedTickers,
      lastUpdated,
      holdingsLastFetchedAt,
      demoMode: !!demoMode,
      goals,
      goal: goals[0] ?? null,
      saveGoal: demoMode ? noopGoal : saveGoalCb,
      deleteGoal: demoMode ? noop : deleteGoalCb,
      refreshGoals: demoMode ? noop : fetchGoals,
      refreshGoal: demoMode ? noop : fetchGoals,
    }),
    [
      holdings, cashEntries, quotes, quoteUpdatedAt, refreshingTickers, exchangeRates,
      isLoading, isInitializing, isRefreshing, error, portfolios, activePortfolioId, activePortfolioCurrency, alertedTickers, mutationVersion, setActivePortfolio, fetchPortfolios,
      addHolding, removeHolding, updateHolding, addCashEntry,
      removeCashEntry, updateCashEntry, moveToPortfolio, refreshHoldings, refreshQuotes, refreshSingleQuote,
      refreshAlertedTickers, lastUpdated, holdingsLastFetchedAt, demoMode, noop, noopGoal,
      goals, saveGoalCb, deleteGoalCb, fetchGoals,
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
