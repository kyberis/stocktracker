"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { computeValueByAssetType } from "@/lib/portfolio-summary";
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
  const { holdings, quotes, exchangeRates, activePortfolioId } =
    usePortfolio();
  const portfolioIdRef = useRef(activePortfolioId);
  portfolioIdRef.current = activePortfolioId;

  const postSnapshot = useCallback(() => {
    if (demoMode) return;
    if (!isAnyMarketActive(holdings)) return;

    if (holdings.length === 0) return;
    const allHaveFreshQuote = holdings.every(
      (h) => (quotes[h.ticker]?.regularMarketPrice ?? 0) > 0,
    );
    if (!allHaveFreshQuote) return;

    const byType = computeValueByAssetType(holdings, quotes, exchangeRates, "EUR");
    const holdingsValue = byType.stock + byType.etf + byType.crypto;
    if (holdingsValue <= 0) return;

    fetch("/api/portfolio/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalValueEUR: holdingsValue,
        portfolioId: portfolioIdRef.current || "",
        stockValueEUR: byType.stock,
        etfValueEUR: byType.etf,
        cryptoValueEUR: byType.crypto,
      }),
    }).catch(() => {});
    // activePortfolioId omitted from deps — portfolioIdRef avoids race when id updates before holdings.
     
  }, [holdings, quotes, exchangeRates, demoMode]);

  useEffect(() => {
    postSnapshot();
  }, [postSnapshot]);

  useEffect(() => {
    if (demoMode) return;
    const id = setInterval(postSnapshot, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [demoMode, postSnapshot]);
}
