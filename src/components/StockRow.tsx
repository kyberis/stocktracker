"use client";

import { useState, useEffect, useCallback } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent, formatCompactNumber, convertCurrency, normalizeCurrency } from "@/lib/utils";
import StockChart from "./StockChart";
import type { Holding, QuoteData, CompanyOverview } from "@/lib/types";

interface StockRowProps {
  holding: Holding;
}

function OverviewSection({ overview }: { overview: CompanyOverview }) {
  const { t } = useI18n();

  const items: Array<{ label: string; value: string | null }> = [
    { label: t("sector"), value: overview.sector || null },
    { label: t("industry"), value: overview.industry || null },
    { label: t("peRatio"), value: overview.peRatio != null ? overview.peRatio.toFixed(2) : null },
    { label: t("forwardPE"), value: overview.forwardPE != null ? overview.forwardPE.toFixed(2) : null },
    { label: t("pegRatio"), value: overview.pegRatio != null ? overview.pegRatio.toFixed(2) : null },
    { label: t("eps"), value: overview.eps != null ? `$${overview.eps.toFixed(2)}` : null },
    {
      label: t("dividendYield"),
      value: overview.dividendYield != null ? `${(overview.dividendYield * 100).toFixed(2)}%` : null,
    },
    {
      label: t("dividendPerShare"),
      value: overview.dividendPerShare != null ? `$${overview.dividendPerShare.toFixed(2)}` : null,
    },
    { label: t("beta"), value: overview.beta != null ? overview.beta.toFixed(2) : null },
    {
      label: t("profitMargin"),
      value: overview.profitMargin != null ? `${(overview.profitMargin * 100).toFixed(1)}%` : null,
    },
    {
      label: t("returnOnEquity"),
      value: overview.returnOnEquity != null ? `${(overview.returnOnEquity * 100).toFixed(1)}%` : null,
    },
    {
      label: t("analystTarget"),
      value: overview.analystTargetPrice != null ? `$${overview.analystTargetPrice.toFixed(2)}` : null,
    },
    { label: t("fiftyDayMA"), value: overview.fiftyDayMA != null ? `$${overview.fiftyDayMA.toFixed(2)}` : null },
    {
      label: t("twoHundredDayMA"),
      value: overview.twoHundredDayMA != null ? `$${overview.twoHundredDayMA.toFixed(2)}` : null,
    },
  ].filter((i) => i.value != null);

  const ratings = overview.analystRatings;
  const totalRatings = ratings
    ? ratings.strongBuy + ratings.buy + ratings.hold + ratings.sell + ratings.strongSell
    : 0;

  return (
    <div className="mt-3">
      <p className="text-xs text-slate-400 font-medium mb-2">{t("fundamentals")}</p>

      {overview.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{overview.description}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
        {items.map(({ label, value }) => (
          <div key={label} className="bg-slate-800/80 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="text-xs font-medium text-slate-200">{value}</p>
          </div>
        ))}
      </div>

      {ratings && totalRatings > 0 && (
        <div className="bg-slate-800/80 rounded-lg px-3 py-2">
          <p className="text-[10px] text-slate-500 mb-1.5">{t("analystRatings")}</p>
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-1.5">
            {ratings.strongBuy > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(ratings.strongBuy / totalRatings) * 100}%` }}
              />
            )}
            {ratings.buy > 0 && (
              <div
                className="bg-green-400"
                style={{ width: `${(ratings.buy / totalRatings) * 100}%` }}
              />
            )}
            {ratings.hold > 0 && (
              <div
                className="bg-amber-400"
                style={{ width: `${(ratings.hold / totalRatings) * 100}%` }}
              />
            )}
            {ratings.sell > 0 && (
              <div
                className="bg-orange-400"
                style={{ width: `${(ratings.sell / totalRatings) * 100}%` }}
              />
            )}
            {ratings.strongSell > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${(ratings.strongSell / totalRatings) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span className="text-emerald-400">{t("buy")} {ratings.strongBuy + ratings.buy}</span>
            <span className="text-amber-400">{t("hold")} {ratings.hold}</span>
            <span className="text-red-400">{t("sell")} {ratings.sell + ratings.strongSell}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockRow({ holding }: StockRowProps) {
  const { quotes, exchangeRates, removeHolding } = usePortfolio();
  const { isAlphaVantage, getApiHeaders, provider, trackAvCalls } = useSettings();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const quote: QuoteData | undefined = quotes[holding.ticker];
  const isFallback = isAlphaVantage && quote?.providerUsed === "yahoo";
  const quoteCurrency = quote ? normalizeCurrency(quote.currency) : holding.displayCurrency;

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

  const totalCost = holding.shares * holding.purchasePrice;
  const totalValue = hasQuote ? holding.shares * currentPriceInDisplay : totalCost;
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  const dayChangePercent = quote?.regularMarketChangePercent ?? 0;

  const isPositive = gainLoss >= 0;
  const gainColor = isPositive ? "text-green-400" : "text-red-400";
  const gainBg = isPositive ? "bg-green-500/10" : "bg-red-500/10";

  const cur = holding.displayCurrency;

  const handleDelete = () => {
    removeHolding(holding.id);
    setShowDeleteConfirm(false);
  };

  let display52High = 0;
  let display52Low = 0;
  if (hasQuote && quote) {
    if (normalizeCurrency(quoteCurrency) === normalizeCurrency(holding.displayCurrency)) {
      display52High = quote.fiftyTwoWeekHigh;
      display52Low = quote.fiftyTwoWeekLow;
    } else {
      display52High = convertCurrency(quote.fiftyTwoWeekHigh, quoteCurrency, holding.displayCurrency, exchangeRates);
      display52Low = convertCurrency(quote.fiftyTwoWeekLow, quoteCurrency, holding.displayCurrency, exchangeRates);
    }
  }

  const fetchOverview = useCallback(async () => {
    if (!isAlphaVantage || overviewLoading || overview) return;
    setOverviewLoading(true);
    try {
      const headers = getApiHeaders();
      const params = new URLSearchParams({ symbol: holding.ticker, provider });
      const res = await fetch(`/api/overview?${params}`, { headers });
      trackAvCalls(res);
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch {
      // Silently fail - overview is supplementary data
    } finally {
      setOverviewLoading(false);
    }
  }, [isAlphaVantage, overviewLoading, overview, getApiHeaders, holding.ticker, provider, trackAvCalls]);

  useEffect(() => {
    if (expanded && isAlphaVantage && !overview && !overviewLoading) {
      fetchOverview();
    }
  }, [expanded, isAlphaVantage, overview, overviewLoading, fetchOverview]);

  // Reset overview when provider changes
  useEffect(() => {
    setOverview(null);
  }, [provider]);

  return (
    <div className="border-b border-slate-700/50 last:border-b-0">
      <div
        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="col-span-4 sm:col-span-3">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-white text-sm truncate">{holding.name}</p>
            {isFallback && (
              <span
                className="flex-shrink-0 text-[9px] font-semibold px-1 py-px rounded bg-blue-500/15 text-blue-400 border border-blue-500/20"
                title={t("yahooFallback")}
              >
                Yahoo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{holding.ticker} · {holding.exchange}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 text-right">
          <p className="text-sm text-slate-200">{holding.shares}</p>
        </div>
        <div className="col-span-3 sm:col-span-2 text-right hidden sm:block">
          <p className="text-sm text-slate-300">
            {formatCurrency(holding.purchasePrice, cur)}
          </p>
        </div>
        <div className="col-span-3 sm:col-span-2 text-right">
          {hasQuote ? (
            <div>
              <p className="text-sm text-white font-medium">
                {formatCurrency(currentPriceInDisplay, cur)}
              </p>
              <p className={`text-xs ${dayChangePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatPercent(dayChangePercent)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">--</p>
          )}
        </div>
        <div className="col-span-3 sm:col-span-2 text-right">
          <p className="text-sm text-white">
            {formatCurrency(totalValue, cur)}
          </p>
        </div>
        <div className="col-span-12 sm:col-span-2 text-right">
          <span className={`inline-block px-2 py-0.5 rounded-md text-sm font-medium ${gainBg} ${gainColor}`}>
            {formatPercent(gainLossPercent)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-slate-800/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pt-2">
            <div className="bg-slate-800 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-400">{t("gainLoss")}</p>
              <p className={`text-sm font-bold ${gainColor}`}>
                {formatCurrency(gainLoss, cur)}
              </p>
            </div>
            {hasQuote && display52High > 0 && (
              <div className="bg-slate-800 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400">{t("week52High")}</p>
                <p className="text-sm font-medium text-white">
                  {formatCurrency(display52High, cur)}
                </p>
              </div>
            )}
            {hasQuote && display52Low > 0 && (
              <div className="bg-slate-800 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400">{t("week52Low")}</p>
                <p className="text-sm font-medium text-white">
                  {formatCurrency(display52Low, cur)}
                </p>
              </div>
            )}
            {hasQuote && quote?.marketCap && quote.marketCap > 0 && (
              <div className="bg-slate-800 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400">{t("marketCap")}</p>
                <p className="text-sm font-medium text-white">
                  {formatCompactNumber(quote.marketCap)}
                </p>
              </div>
            )}
          </div>

          <StockChart
            ticker={holding.ticker}
            purchasePrice={holding.purchasePrice}
            displayCurrency={holding.displayCurrency}
          />

          {isAlphaVantage && overviewLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
              {t("loadingOverview")}
            </div>
          )}

          {isAlphaVantage && overview && <OverviewSection overview={overview} />}

          <div className="mt-3 flex justify-end">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{t("deleteConfirm")}</span>
                <button onClick={handleDelete} className="btn-danger text-sm px-3 py-1">
                  {t("confirm")}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="btn-secondary text-sm px-3 py-1"
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1"
              >
                {t("removeStock")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
