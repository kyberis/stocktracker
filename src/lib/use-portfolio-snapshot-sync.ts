"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { calculatePortfolioTotals } from "@/lib/portfolio-summary";
import { isAnyMarketActive } from "@/lib/market-hours";

/** Match /api/portfolio/snapshot 5-minute UTC buckets — writes create new rows while the app stays open. */
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Upserts portfolio_snapshots when totals change, and on a fixed interval while mounted.
 * Interval writes create distinct hourly rows so evolution charts can show intra-week detail
 * when the app stays open (snapshots are still sparse across days the user does not visit).
 */
export function usePortfolioSnapshotSync(options: { demoMode: boolean }) {
  const { demoMode } = options;
  const { holdings, cashEntries, quotes, exchangeRates, activePortfolioId } =
    usePortfolio();
  const portfolioIdRef = useRef(activePortfolioId);
  portfolioIdRef.current = activePortfolioId;

  const postSnapshot = useCallback(() => {
    if (demoMode) return;
    if (!isAnyMarketActive(holdings)) return;

    const allHaveValue = holdings.every(
      (h) => (quotes[h.ticker]?.regularMarketPrice ?? 0) > 0 || h.valueInEUR > 0,
    );
    if (!allHaveValue || holdings.length === 0) return;

    // Always compute in EUR — the DB columns are total_value_eur / total_invested_eur.
    const totals = calculatePortfolioTotals(holdings, cashEntries, quotes, exchangeRates, "EUR");
    if (totals.totalCurrentEUR <= 0) return;

    fetch("/api/portfolio/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalValueEUR: totals.totalCurrentEUR,
        portfolioId: portfolioIdRef.current || "",
      }),
    }).catch(() => {});
    // activePortfolioId omitted from deps — portfolioIdRef avoids race when id updates before holdings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, cashEntries, quotes, exchangeRates, demoMode]);

  useEffect(() => {
    postSnapshot();
  }, [postSnapshot]);

  useEffect(() => {
    if (demoMode) return;
    const id = setInterval(postSnapshot, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [demoMode, postSnapshot]);
}
