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
import { useTheme } from "@/lib/theme-context";

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
  } = usePortfolio();
  const { t } = useI18n();
  const { layoutTheme } = useTheme();
  const [now, setNow] = useState(() => new Date());

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

  const dayIsPositive = dayChangeAmountEUR >= 0;
  const dayColor = dayIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const cur = holding.displayCurrency;

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

  const priceInfo = `${holding.exchange ? `${holding.exchange} | ` : ""}${holding.ticker} | ${hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × ${holding.shares}`;
  const dayText = hasQuote ? `${dayIsPositive ? "+" : ""}${formatCurrency(dayChangeAmountEUR, "EUR")} (${formatPercent(dayChangePercent)})` : "--";
  const rowLabel = `${holding.name}, ${formatCurrency(totalValueEUR, "EUR")}, ${dayText}`;
  const refreshSpinner = isRefreshing && (
    <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
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
            <AlertBadge ticker={holding.ticker} />
            {refreshSpinner}
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0 tabular-nums">
            <span className="text-zinc-500 w-12 text-right">{holding.shares}</span>
            <span className="text-zinc-300 w-20 text-right font-semibold">{formatCurrency(totalValueEUR, "EUR")}</span>
            <span className={`w-24 text-right ${hasQuote ? (dayIsPositive ? "text-green-400" : "text-red-400") : "text-zinc-600"}`}>{dayText}</span>
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
            <p className="text-xs text-slate-400 mt-0.5">{holding.ticker}{holding.exchange ? ` · ${holding.exchange}` : ""}</p>
          </div>
          {marketDot}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValueEUR, "EUR")}</p>
            <p className="text-xs text-slate-400 mt-0.5">{hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × {holding.shares}</p>
          </div>
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-xl ${hasQuote ? (dayIsPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600") : "bg-slate-50 text-slate-400"}`}>
            {hasQuote ? `${dayIsPositive ? "+" : ""}${formatPercent(dayChangePercent)}` : "--"}
          </span>
        </div>
      </div>
    );
  }

  /* ── STUDIO: Row with sparkline placeholder ────────────────── */
  if (layoutTheme === "studio") {
    const sparkPath = hasQuote ? "M0,8 L3,6 L6,9 L9,4 L12,5 L15,2 L18,6 L21,3 L24,5" : "M0,8 L24,8";
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
            <p className="text-xs text-zinc-500 mt-0.5">{holding.ticker}{holding.exchange ? ` · ${holding.exchange}` : ""}</p>
          </div>
          <svg className="w-16 h-6 mx-3 shrink-0" viewBox="0 0 24 12" aria-hidden="true">
            <path d={sparkPath} fill="none" stroke={hasQuote ? (dayIsPositive ? "#34d399" : "#f87171") : "#555"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold font-mono text-white">{formatCurrency(totalValueEUR, "EUR")}</p>
            <p className={`text-xs font-mono mt-0.5 ${hasQuote ? (dayIsPositive ? "text-emerald-400" : "text-red-400") : "text-zinc-600"}`}>{dayText}</p>
          </div>
        </div>
      </div>
    );
  }

  const fxTag = fxImpactEUR !== null && Math.abs(fxImpactEUR) >= 0.01 ? (
    <span
      className={`text-[10px] px-1 py-0.5 rounded ${fxImpactEUR >= 0 ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"}`}
      title={t("fxImpact")}
    >
      FX {fxImpactEUR >= 0 ? "+" : ""}{formatCurrency(fxImpactEUR, "EUR")}
    </span>
  ) : null;

  /* ── DEFAULT: Original layout ──────────────────────────────── */
  return (
    <div className="border-b border-gray-100 dark:border-slate-700 last:border-b-0" data-testid="stock-row-default">
      <div
        role="button"
        tabIndex={0}
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label={rowLabel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="min-w-0 flex-1 mr-4">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{holding.name}</p>
            <AlertBadge ticker={holding.ticker} />
            {refreshSpinner}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{priceInfo}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValueEUR, "EUR")}</p>
          {hasQuote ? (
            <p className={`text-xs mt-0.5 flex items-center justify-end gap-1 ${dayColor}`}>
              {marketDot}
              {dayIsPositive ? "+" : ""}{formatCurrency(dayChangeAmountEUR, "EUR")} ({formatPercent(dayChangePercent)})
              {fxTag}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">--</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(StockRow);
