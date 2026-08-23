"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export const BIG_MOVE_THRESHOLD = 4;

export interface QuoteSnapshot {
  price: number | null;
  changePercent: number | null;
}

export interface BigMover {
  label: string;
  changePercent: number;
}

export interface TickerBarData {
  eurUsd: number | null;
  btcPriceUsd: number | null;
  btcChange24h: number | null;
  gold: QuoteSnapshot;
  silver: QuoteSnapshot;
  sp500: QuoteSnapshot;
  oil: QuoteSnapshot;
  loading: boolean;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

const NULL_QUOTE: QuoteSnapshot = { price: null, changePercent: null };

const DEMO_DATA: TickerBarData = {
  eurUsd: 1.08,
  btcPriceUsd: 68000,
  btcChange24h: 2.34,
  gold: { price: 2340, changePercent: 0.45 },
  silver: { price: 29.5, changePercent: -0.82 },
  sp500: { price: 5420, changePercent: 0.31 },
  oil: { price: 78.2, changePercent: -1.15 },
  loading: false,
};

const EMPTY: TickerBarData = {
  eurUsd: null,
  btcPriceUsd: null,
  btcChange24h: null,
  gold: NULL_QUOTE,
  silver: NULL_QUOTE,
  sp500: NULL_QUOTE,
  oil: NULL_QUOTE,
  loading: true,
};

/** Module singleton so MarketTickerBar + MarketMoveToast share one poll. */
let sharedInflight: Promise<TickerBarData> | null = null;
let sharedData: TickerBarData | null = null;
let sharedFetchedAt = 0;
const listeners = new Set<(data: TickerBarData) => void>();

function parseQuote(raw: { price?: number; changePercent?: number } | undefined): QuoteSnapshot {
  if (!raw) return NULL_QUOTE;
  return { price: raw.price ?? null, changePercent: raw.changePercent ?? null };
}

function deriveBigMovers(data: TickerBarData): BigMover[] {
  const candidates: { label: string; changePercent: number | null }[] = [
    { label: "BTC", changePercent: data.btcChange24h },
    { label: "Gold", changePercent: data.gold.changePercent },
    { label: "Silver", changePercent: data.silver.changePercent },
    { label: "S&P 500", changePercent: data.sp500.changePercent },
    { label: "Oil", changePercent: data.oil.changePercent },
  ];
  return candidates.filter(
    (c): c is BigMover => c.changePercent != null && Math.abs(c.changePercent) >= BIG_MOVE_THRESHOLD,
  );
}

function notify(data: TickerBarData) {
  sharedData = data;
  sharedFetchedAt = Date.now();
  for (const listener of listeners) listener(data);
}

async function fetchTickerBarShared(force = false): Promise<TickerBarData> {
  if (
    !force &&
    sharedData &&
    !sharedData.loading &&
    Date.now() - sharedFetchedAt < POLL_INTERVAL_MS
  ) {
    return sharedData;
  }
  if (sharedInflight) return sharedInflight;

  sharedInflight = (async () => {
    try {
      const res = await fetch("/api/ticker-bar");
      if (!res.ok) {
        const fallback = sharedData
          ? { ...sharedData, loading: false }
          : { ...EMPTY, loading: false };
        notify(fallback);
        return fallback;
      }
      const json = await res.json();
      const next: TickerBarData = {
        eurUsd: json.eurUsd?.rate ?? null,
        btcPriceUsd: json.btc?.priceUsd ?? null,
        btcChange24h: json.btc?.change24h ?? null,
        gold: parseQuote(json.gold),
        silver: parseQuote(json.silver),
        sp500: parseQuote(json.sp500),
        oil: parseQuote(json.oil),
        loading: false,
      };
      notify(next);
      return next;
    } catch {
      const fallback = sharedData
        ? { ...sharedData, loading: false }
        : { ...EMPTY, loading: false };
      notify(fallback);
      return fallback;
    } finally {
      sharedInflight = null;
    }
  })();

  return sharedInflight;
}

export function useTickerBar(demoMode = false): TickerBarData & { bigMovers: BigMover[] } {
  const [data, setData] = useState<TickerBarData>(() => {
    if (demoMode) return DEMO_DATA;
    if (sharedData) return sharedData;
    return EMPTY;
  });

  const onShared = useCallback((next: TickerBarData) => {
    setData(next);
  }, []);

  useEffect(() => {
    if (demoMode) {
      setData(DEMO_DATA);
      return;
    }

    listeners.add(onShared);
    void fetchTickerBarShared(false);
    const id = window.setInterval(() => {
      void fetchTickerBarShared(true);
    }, POLL_INTERVAL_MS);

    return () => {
      listeners.delete(onShared);
      window.clearInterval(id);
    };
  }, [demoMode, onShared]);

  const bigMovers = useMemo(() => deriveBigMovers(data), [data]);

  return { ...data, bigMovers };
}
