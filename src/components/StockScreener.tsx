"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { useTrack } from "@/lib/use-track";
import { usePortfolio } from "@/lib/portfolio-context";
import ProCompareCard from "./ProCompareCard";
import BlurredProSection from "./BlurredProSection";
import ScreenerFilters from "./ScreenerFilters";
import ScreenerResults from "./ScreenerResults";
import ScreenerStats from "./ScreenerStats";
import type { ScreenerCacheRow, ScreenerFilters as ScreenerFiltersType } from "@/lib/db/screener";

export default function StockScreener() {
  const { user } = useAuth();
  const { getApiHeaders } = useSettings();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const track = useTrack();
  const { holdings } = usePortfolio();

  const isPro = user?.plan === "pro";
  const isFree = !user || user.plan === "free";

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
    if (!isPro) return;
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
  }, [isPro, getApiHeaders]);

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
    if (isPro) runScreen(filters);
  }, [isPro, filters, runScreen]);

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

  if (!isPro) {
    track("screener_paywall_shown");
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {t("screenerTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("screenerDesc")}</p>
        </div>
        <BlurredProSection blurb={t("blurScreenerTeaser")}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3">Ticker</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">Price</th><th className="py-2 px-3">P/E</th><th className="py-2 px-3">Div. Yield</th><th className="py-2 px-3">Sector</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-slate-300">
              <tr><td className="py-2 px-3 font-mono font-semibold">ASML</td><td className="py-2 px-3">ASML Holding</td><td className="py-2 px-3">&euro;682.40</td><td className="py-2 px-3">38.2</td><td className="py-2 px-3 text-emerald-500">0.92%</td><td className="py-2 px-3">Technology</td></tr>
              <tr><td className="py-2 px-3 font-mono font-semibold">NOVO-B</td><td className="py-2 px-3">Novo Nordisk</td><td className="py-2 px-3">DKK 892</td><td className="py-2 px-3">42.1</td><td className="py-2 px-3">1.21%</td><td className="py-2 px-3">Healthcare</td></tr>
              <tr><td className="py-2 px-3 font-mono font-semibold">TTE</td><td className="py-2 px-3">TotalEnergies</td><td className="py-2 px-3">&euro;58.30</td><td className="py-2 px-3">7.8</td><td className="py-2 px-3 text-emerald-500">5.14%</td><td className="py-2 px-3">Energy</td></tr>
              <tr><td className="py-2 px-3 font-mono font-semibold">SAP</td><td className="py-2 px-3">SAP SE</td><td className="py-2 px-3">&euro;178.50</td><td className="py-2 px-3">35.6</td><td className="py-2 px-3">1.42%</td><td className="py-2 px-3">Technology</td></tr>
              <tr><td className="py-2 px-3 font-mono font-semibold">BNP</td><td className="py-2 px-3">BNP Paribas</td><td className="py-2 px-3">&euro;64.20</td><td className="py-2 px-3">6.4</td><td className="py-2 px-3 text-emerald-500">6.83%</td><td className="py-2 px-3">Financials</td></tr>
              <tr><td className="py-2 px-3 font-mono font-semibold">AIR</td><td className="py-2 px-3">Airbus SE</td><td className="py-2 px-3">&euro;142.80</td><td className="py-2 px-3">28.9</td><td className="py-2 px-3">1.18%</td><td className="py-2 px-3">Industrials</td></tr>
            </tbody>
          </table>
        </BlurredProSection>
        <div className="mt-6">
          <ProCompareCard surface="screener_locked" reason="upgrade_required" />
        </div>
      </div>
    );
  }

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
