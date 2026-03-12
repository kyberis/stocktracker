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

export function useTickerBar(demoMode = false): TickerBarData & { bigMovers: BigMover[] } {
  const [data, setData] = useState<TickerBarData>(
    demoMode
      ? DEMO_DATA
      : { eurUsd: null, btcPriceUsd: null, btcChange24h: null, gold: NULL_QUOTE, silver: NULL_QUOTE, sp500: NULL_QUOTE, oil: NULL_QUOTE, loading: true }
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/ticker-bar");
      if (!res.ok) return;
      const json = await res.json();
      setData({
        eurUsd: json.eurUsd?.rate ?? null,
        btcPriceUsd: json.btc?.priceUsd ?? null,
        btcChange24h: json.btc?.change24h ?? null,
        gold: parseQuote(json.gold),
        silver: parseQuote(json.silver),
        sp500: parseQuote(json.sp500),
        oil: parseQuote(json.oil),
        loading: false,
      });
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (demoMode) return;
    fetchData();
    const id = window.setInterval(fetchData, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [demoMode, fetchData]);

  const bigMovers = useMemo(() => deriveBigMovers(data), [data]);

  return { ...data, bigMovers };
}
