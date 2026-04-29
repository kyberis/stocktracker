"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import { usePortfolio } from "@/lib/portfolio-context";
import ScreenerFilters from "./ScreenerFilters";
import ScreenerResults from "./ScreenerResults";
import ScreenerStats from "./ScreenerStats";
import type { ScreenerCacheRow, ScreenerFilters as ScreenerFiltersType } from "@/lib/db/screener";

export default function StockScreener() {
  const { getApiHeaders } = useSettings();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();
  const { holdings } = usePortfolio();

  const STORAGE_KEY = "trefolio_screener_filters";

  const [results, setResults] = useState<ScreenerCacheRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScreenerFiltersType>(() => {
    const defaults: ScreenerFiltersType = { sortBy: "dividendYield", sortDir: "desc", limit: 50, page: 1 };
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaults;
  });
  const [meta, setMeta] = useState<{ sectors: string[]; countries: string[]; exchanges: string[]; total: number } | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters]);

  useEffect(() => {
    track("screener_page_viewed");
  }, [track]);

  useEffect(() => {
    const headers = getApiHeaders();
    fetch("/api/screener?action=meta", { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load screener metadata: ${r.status}`);
        return r.json();
      })
      .then(setMeta)
      .catch((err) => {
        console.error("[StockScreener] Failed to load metadata:", err);
        setFetchError("Unable to load screener filters. Please try again later.");
      });
  }, [getApiHeaders]);

  const runScreen = useCallback(async (f: ScreenerFiltersType) => {
    setLoading(true);
    setFetchError(null);
    try {
      const headers = getApiHeaders();
      const params = new URLSearchParams();
      if (f.sector) params.set("sector", f.sector);
      if (f.divYieldMin != null) params.set("divYieldMin", String(f.divYieldMin));
      if (f.divYieldMax != null) params.set("divYieldMax", String(f.divYieldMax));
      if (f.peMin != null) params.set("peMin", String(f.peMin));
      if (f.peMax != null) params.set("peMax", String(f.peMax));
      if (f.marketCap) params.set("marketCap", f.marketCap);
      if (f.exchange) params.set("exchange", f.exchange);
      if (f.country) params.set("country", f.country);
      if (f.sortBy) params.set("sortBy", f.sortBy);
      if (f.sortDir) params.set("sortDir", f.sortDir);
      if (f.page) params.set("page", String(f.page));
      if (f.limit) params.set("limit", String(f.limit));

      const res = await fetch(`/api/screener?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setTotal(data.total);
      } else {
        const body = await res.json().catch(() => null);
        const message = body?.error || `Screener request failed (${res.status})`;
        console.error("[StockScreener] Screen request failed:", res.status, body);
        setFetchError(message);
      }
    } catch (err) {
      console.error("[StockScreener] Screen request error:", err);
      setFetchError("Unable to run the screener. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getApiHeaders]);

  useEffect(() => {
    runScreen(filters);
  }, [filters, runScreen]);

  const handleFiltersChange = useCallback((newFilters: ScreenerFiltersType) => {
    setFilters({ ...newFilters, page: 1 });
  }, []);

  const handleSort = useCallback((sortBy: string) => {
    track("screener_results_sorted", { sort_column: sortBy });
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortDir: prev.sortBy === sortBy && prev.sortDir === "desc" ? "asc" : "desc",
      page: 1,
    }));
  }, [track]);

  const holdingTickers = new Set((holdings || []).map((h) => h.ticker.toUpperCase()));

  const containerClass = layoutTheme === "terminal"
    ? "max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-4 space-y-2 sm:space-y-4"
    : layoutTheme === "canvas"
    ? "max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8"
    : layoutTheme === "studio"
    ? "max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6"
    : "max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8";

  return (
    <div className={containerClass} style={{ fontFamily: "var(--font-primary, inherit)" }}>
      {/* Header */}
      <div>
        <h1 className={`font-bold flex items-center gap-3 ${layoutTheme === "terminal" ? "text-lg font-mono text-zinc-300" : "text-2xl"}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          {t("screenerTitle")}
        </h1>
        <p className={`mt-1 ${layoutTheme === "terminal" ? "text-xs font-mono text-zinc-500" : "text-sm text-gray-500 dark:text-slate-400"}`}>
          {t("screenerDesc")}
        </p>
      </div>

      <ScreenerFilters
        filters={filters}
        meta={meta}
        onChange={handleFiltersChange}
      />

      {fetchError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {fetchError}
        </div>
      )}

      <ScreenerResults
        results={results}
        total={total}
        loading={loading}
        filters={filters}
        holdingTickers={holdingTickers}
        onSort={handleSort}
      />

      {results.length > 0 && (
        <ScreenerStats results={results} holdingTickers={holdingTickers} />
      )}

      {/* Disclaimer */}
      <p className={`text-center ${layoutTheme === "terminal" ? "text-[10px] font-mono text-zinc-600" : "text-xs text-gray-400 dark:text-slate-500"}`}>
        {t("screenerDisclaimer")}
      </p>
    </div>
  );
}
