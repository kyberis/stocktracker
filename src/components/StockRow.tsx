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
} from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
import type { Holding, QuoteData } from "@/lib/types";
import AlertBadge from "./AlertBadge";

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

  return (
    <div className="border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="min-w-0 flex-1 mr-4">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{holding.name}</p>
            <AlertBadge ticker={holding.ticker} />
            {isRefreshing && (
              <svg
                className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-gray-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {holding.exchange ? `${holding.exchange} | ` : ""}{holding.ticker} | {hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × {holding.shares}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(totalValueEUR, "EUR")}
          </p>
          {hasQuote ? (
            <p className={`text-xs mt-0.5 flex items-center justify-end gap-1 ${dayColor}`}>
              {marketStatus && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  marketStatus.isOpen
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-gray-400 dark:bg-slate-500"
                }`} />
              )}
              {dayIsPositive ? "+" : ""}{formatCurrency(dayChangeAmountEUR, "EUR")} ({formatPercent(dayChangePercent)})
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
