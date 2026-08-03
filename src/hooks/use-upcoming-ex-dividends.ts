"use client";

import { useEffect, useMemo, useState } from "react";
import type { DividendEvent } from "@/lib/api-providers/types";
import type { Holding } from "@/lib/types";

export interface UpcomingExDividendsResult {
  events: DividendEvent[];
  loading: boolean;
  error: boolean;
}

/**
 * Single source of truth for "upcoming ex-dividend events for these
 * holdings" (TRF-004-B / TRF-026). Dedupes tickers before calling
 * /api/ex-dividend — the endpoint caps the ticker list at 30 *before*
 * deduping, so an undeduped caller with repeat-ticker holdings (multiple
 * lots of the same stock) can silently lose coverage of real, unique
 * tickers that fall past that cap.
 */
export function useUpcomingExDividends(holdings: Holding[]): UpcomingExDividendsResult {
  const tickers = useMemo(() => [...new Set(holdings.map((h) => h.ticker))].join(","), [holdings]);

  const [events, setEvents] = useState<DividendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tickers) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/ex-dividend?tickers=${encodeURIComponent(tickers)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tickers]);

  return { events, loading, error };
}
