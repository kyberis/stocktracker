"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import {
  formatCurrency,
  formatPercent,
  convertCurrency,
  convertToEUR,
  normalizeCurrency,
  resolveQuoteCurrency,
  hasExchangeRate,
} from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
import type { Holding, QuoteData } from "@/lib/types";
import AlertBadge from "./AlertBadge";
import Sparkline from "./Sparkline";
import HoldingHealthBadge from "./HoldingHealthBadge";
import HoldingResearchLinks from "./HoldingResearchLinks";
import { useTheme } from "@/lib/theme-context";
import { useReturnDisplay } from "./PortfolioTable";

const MOBILE_BREAKPOINT = 768;

interface StockRowProps {
  holding: Holding;
  onSelect?: (holding: Holding) => void;
}

function StockRow({ holding, onSelect }: StockRowProps) {
  const router = useRouter();
  const {
    quotes,
    refreshingTickers,
    exchangeRates,
    activePortfolioCurrency,
  } = usePortfolio();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const [now, setNow] = useState(() => new Date());
  const baseCurrency = activePortfolioCurrency || "EUR";

  const quote: QuoteData | undefined = quotes[holding.ticker];
  const isCashHolding =
    holding.exchange.trim().toUpperCase() === "CASH" ||
    holding.ticker.trim().toUpperCase().startsWith("CASH-");
  const isRefreshing = refreshingTickers.has(holding.ticker);
  const marketStatus = isCashHolding ? null : getMarketStatus(holding.exchange, now);
  const quoteCurrency = quote
    ? resolveQuoteCurrency(holding.displayCurrency, quote.currency)
    : holding.displayCurrency;

  let currentPriceInDisplay = 0;
  let hasQuote = false;

  if (quote && quote.regularMarketPrice > 0) {
    hasQuote = true;
    if (normalizeCurrency(quoteCurrency) === normalizeCurrency(holding.displayCurrency)) {
      currentPriceInDisplay = quote.regularMarketPrice;
    } else {
      currentPriceInDisplay = convertCurrency(
        quote.regularMarketPrice,
        quoteCurrency,
        holding.displayCurrency,
        exchangeRates
      );
    }
  }

  if (hasQuote && holding.displayCurrency === "GBX" && holding.valueInEUR > 0) {
    const derivedValueEUR = convertToEUR(
      holding.shares * currentPriceInDisplay,
      holding.displayCurrency,
      exchangeRates
    );
    if (derivedValueEUR > holding.valueInEUR * 10) {
      hasQuote = false;
      currentPriceInDisplay = 0;
    }
  }

  const totalCost = holding.shares * holding.purchasePrice;
  const totalValue = hasQuote ? holding.shares * currentPriceInDisplay : totalCost;
  const dayChangePercent = quote?.regularMarketChangePercent ?? 0;
  const dayChangeAmountEUR = hasQuote && quote
    ? convertToEUR(holding.shares * (quote.regularMarketChange ?? 0), quoteCurrency, exchangeRates)
    : 0;
  const totalValueEUR = hasQuote
    ? convertToEUR(totalValue, holding.displayCurrency, exchangeRates)
    : holding.valueInEUR;

  // FX impact: difference between actual gain and gain at constant FX rate
  // stockGain = change in value due to stock price movement alone (in display currency, then converted)
  // fxGain = totalGain - stockGain = the portion of gain due to currency movement
  const stockGainLocal = hasQuote ? holding.shares * (currentPriceInDisplay - holding.purchasePrice) : 0;
  const totalGainEUR = totalValueEUR - convertToEUR(totalCost, holding.displayCurrency, exchangeRates);
  const stockGainEUR = hasQuote && hasExchangeRate(holding.displayCurrency, exchangeRates)
    ? convertToEUR(stockGainLocal, holding.displayCurrency, exchangeRates)
    : 0;
  const fxImpactEUR = hasQuote && hasExchangeRate(holding.displayCurrency, exchangeRates)
    ? totalGainEUR - stockGainEUR
    : null;

  const totalReturnPct = hasQuote && holding.purchasePrice > 0
    ? ((currentPriceInDisplay - holding.purchasePrice) / holding.purchasePrice) * 100
    : 0;
  const totalReturnAbsEUR = totalValueEUR - convertToEUR(totalCost, holding.displayCurrency, exchangeRates);
  // Display values in the portfolio's main currency (not hard-coded EUR)
  const totalValueBase = convertCurrency(totalValueEUR, "EUR", baseCurrency, exchangeRates);
  const dayChangeAmountBase = convertCurrency(dayChangeAmountEUR, "EUR", baseCurrency, exchangeRates);
  const totalReturnAbsBase = convertCurrency(totalReturnAbsEUR, "EUR", baseCurrency, exchangeRates);
  const fxImpactBase = fxImpactEUR == null
    ? null
    : convertCurrency(fxImpactEUR, "EUR", baseCurrency, exchangeRates);
  const totalReturnIsPositive = totalReturnAbsEUR >= 0;

  const dayIsPositive = dayChangeAmountEUR >= 0;
  const dayColor = dayIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const returnColor = totalReturnIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const cur = holding.displayCurrency;

  const { mode: returnMode, toggle: toggleReturnMode, showDayChange } = useReturnDisplay();

  const displayIsPositive = showDayChange ? dayIsPositive : totalReturnIsPositive;
  const displayColor = displayIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleClick = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT) {
      router.push(`/stock/${encodeURIComponent(holding.ticker)}?exchange=${encodeURIComponent(holding.exchange)}`);
    } else {
      onSelect?.(holding);
    }
  }, [router, holding, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); }
  }, [handleClick]);

  const awaitingQuote = !hasQuote && !isCashHolding;
  const priceInfo = `${holding.exchange ? `${holding.exchange} | ` : ""}${holding.ticker} | ${hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × ${holding.shares}`;
  // Same info but with bullet separators; used by the default (clean) layout so
  // the row sits on a single visual baseline with the hero/column headers.
  const priceInfoDefault = [
    holding.ticker,
    holding.exchange || null,
    `${hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × ${holding.shares}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const dayText = hasQuote ? `${dayIsPositive ? "+" : ""}${formatCurrency(dayChangeAmountBase, baseCurrency)} (${formatPercent(dayChangePercent)})` : "--";
  const returnText = hasQuote
    ? showDayChange
      ? returnMode === "pct"
        ? `${dayIsPositive ? "+" : ""}${formatPercent(dayChangePercent)}`
        : `${dayIsPositive ? "+" : ""}${formatCurrency(dayChangeAmountBase, baseCurrency)}`
      : returnMode === "pct"
        ? `${totalReturnIsPositive ? "+" : ""}${formatPercent(totalReturnPct)}`
        : `${totalReturnIsPositive ? "+" : ""}${formatCurrency(totalReturnAbsBase, baseCurrency)}`
    : "--";
  const rowLabel = `${holding.name}, ${formatCurrency(totalValueBase, baseCurrency)}, ${dayText}`;
  const assetTypeBadge = holding.assetType === "crypto" ? (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">CRYPTO</span>
  ) : holding.assetType === "etf" ? (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 shrink-0">ETF</span>
  ) : null;
  const showSpinner = isRefreshing || awaitingQuote;
  const refreshSpinner = showSpinner && (
    <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
  const valueShimmer = (
    <span className="inline-block h-4 w-16 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
  );
  const dayShimmer = (
    <span className="inline-block h-3 w-20 rounded bg-gray-100 dark:bg-slate-700/60 animate-pulse" />
  );
  const marketDot = marketStatus && (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${marketStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-gray-400 dark:bg-slate-500"}`} aria-label={marketStatus.isOpen ? "Market open" : "Market closed"} role="img" />
  );

  /* ── TERMINAL: Dense monospace row ─────────────────────────── */
  if (layoutTheme === "terminal") {
    return (
      <div className="border-b border-zinc-800 last:border-b-0" data-testid="stock-row-terminal">
        <div role="button" tabIndex={0} aria-label={rowLabel} className="flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800/60 cursor-pointer transition-colors font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500" onClick={handleClick} onKeyDown={handleKeyDown}>
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
            {marketDot}
            <span className="text-xs text-zinc-500 w-16 shrink-0">{holding.ticker}</span>
            <span className="text-xs text-zinc-400 truncate">{holding.name}</span>
            {assetTypeBadge}
            <AlertBadge ticker={holding.ticker} />
            {refreshSpinner}
            <HoldingResearchLinks holding={holding} className="hidden sm:flex shrink-0" />
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0 tabular-nums">
            <HoldingHealthBadge holding={holding} size={22} />
            <Sparkline ticker={holding.ticker} width={48} height={16} positive={hasQuote ? dayIsPositive : undefined} className="hidden sm:block shrink-0" />
            <span className="text-zinc-300 w-20 text-right font-semibold">{awaitingQuote ? valueShimmer : formatCurrency(totalValueBase, baseCurrency)}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); toggleReturnMode(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleReturnMode(); } }}
              className={`w-24 text-right cursor-pointer hover:underline ${hasQuote ? (displayIsPositive ? "text-green-400" : "text-red-400") : "text-zinc-600"}`}
              title={returnMode === "pct" ? "Click for absolute" : "Click for %"}
            >
              {awaitingQuote ? dayShimmer : returnText}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── CANVAS: Card-based holding ────────────────────────────── */
  if (layoutTheme === "canvas") {
    return (
      <div role="button" tabIndex={0} aria-label={rowLabel} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-slate-300 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600" onClick={handleClick} onKeyDown={handleKeyDown} data-testid="stock-row-canvas">
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-slate-900 truncate">{holding.name}</p>
              <AlertBadge ticker={holding.ticker} />
              {refreshSpinner}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-slate-400">{holding.ticker}{holding.exchange ? ` · ${holding.exchange}` : ""}</p>
              {assetTypeBadge}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HoldingHealthBadge holding={holding} size={28} />
            {marketDot}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">{awaitingQuote ? <span className="inline-block h-7 w-24 rounded bg-slate-200 animate-pulse align-middle" /> : formatCurrency(totalValueBase, baseCurrency)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × {holding.shares}</p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkline ticker={holding.ticker} width={56} height={20} positive={hasQuote ? dayIsPositive : undefined} className="shrink-0" />
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); toggleReturnMode(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleReturnMode(); } }}
              className={`text-sm font-semibold px-2.5 py-1 rounded-xl cursor-pointer ${hasQuote ? (displayIsPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600") : "bg-slate-50 text-slate-400"}`}
              title={returnMode === "pct" ? "Click for absolute" : "Click for %"}
            >
              {awaitingQuote ? dayShimmer : returnText}
            </span>
          </div>
        </div>
        <HoldingResearchLinks holding={holding} variant="pills" className="mt-3" />
      </div>
    );
  }

  /* ── STUDIO: Row with real sparkline ────────────────────────── */
  if (layoutTheme === "studio") {
    return (
      <div className="border-b border-white/5 last:border-b-0" data-testid="stock-row-studio">
        <div role="button" tabIndex={0} aria-label={rowLabel} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" onClick={handleClick} onKeyDown={handleKeyDown}>
          <div className="min-w-0 flex-1 mr-3">
            <div className="flex items-center gap-2">
              {marketDot}
              <p className="font-medium text-white text-sm truncate">{holding.name}</p>
              <AlertBadge ticker={holding.ticker} />
              {refreshSpinner}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-zinc-500">{holding.ticker}{holding.exchange ? ` · ${holding.exchange}` : ""}</p>
              {assetTypeBadge}
            </div>
            <HoldingResearchLinks holding={holding} className="mt-1" />
          </div>
          <HoldingHealthBadge holding={holding} size={26} />
          <Sparkline ticker={holding.ticker} width={64} height={24} positive={hasQuote ? dayIsPositive : undefined} className="mx-2 shrink-0" />
          <div className="text-right shrink-0">
            <p className="text-sm font-bold font-mono text-white">{awaitingQuote ? valueShimmer : formatCurrency(totalValueBase, baseCurrency)}</p>
            <p
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); toggleReturnMode(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleReturnMode(); } }}
              className={`text-xs font-mono mt-0.5 cursor-pointer hover:underline ${hasQuote ? (displayIsPositive ? "text-emerald-400" : "text-red-400") : "text-zinc-600"}`}
              title={returnMode === "pct" ? "Click for absolute" : "Click for %"}
            >
              {awaitingQuote ? dayShimmer : returnText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fxTag = fxImpactBase !== null && Math.abs(fxImpactBase) >= 0.01 ? (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] ${fxImpactBase >= 0 ? "border border-blue-400/18 bg-blue-500/10 text-blue-300" : "border border-amber-400/18 bg-amber-500/10 text-amber-300"}`}
      title={t("fxImpact")}
    >
      FX {fxImpactBase >= 0 ? "+" : ""}{formatCurrency(fxImpactBase, baseCurrency)}
    </span>
  ) : null;

  /* ── DEFAULT: Single-line grid layout ──────────────────────── */
  return (
    <div className="border-b border-[color:var(--border)] last:border-b-0" data-testid="stock-row-default">
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
        aria-label={rowLabel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <span className="mt-1.5 flex-shrink-0">
            {marketDot ?? <span className="inline-block w-1.5 h-1.5 rounded-full bg-transparent" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-[color:var(--foreground)]">{holding.name}</p>
              {assetTypeBadge}
              <AlertBadge ticker={holding.ticker} />
              {refreshSpinner}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[color:var(--muted)]">{priceInfoDefault}</p>
            <HoldingResearchLinks holding={holding} className="mt-1" />
          </div>
        </div>
        <HoldingHealthBadge holding={holding} size={24} />
        <Sparkline ticker={holding.ticker} width={56} height={20} positive={hasQuote ? dayIsPositive : undefined} className="hidden md:block shrink-0" />
        <div className="w-[110px] text-right tabular-nums shrink-0">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            {awaitingQuote ? valueShimmer : formatCurrency(totalValueBase, baseCurrency)}
          </p>
        </div>
        <div className="w-[110px] text-right tabular-nums shrink-0">
          {awaitingQuote ? (
            <div className="flex justify-end">{dayShimmer}</div>
          ) : hasQuote ? (
            <p
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); toggleReturnMode(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleReturnMode(); } }}
              className={`flex cursor-pointer items-center justify-end gap-1 text-sm font-medium ${displayColor} hover:underline`}
              title={returnMode === "pct" ? "Click for absolute" : "Click for %"}
            >
              {returnText}
              {fxTag}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-slate-500">--</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(StockRow);
