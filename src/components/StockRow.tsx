"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  convertCurrency,
  convertToEUR,
  normalizeCurrency,
  resolveQuoteCurrency,
} from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
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
      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">{t("fundamentals")}</p>

      {overview.description && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3 line-clamp-2">{overview.description}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
        {items.map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] text-gray-400 dark:text-slate-500">{label}</p>
            <p className="text-xs font-medium text-gray-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {ratings && totalRatings > 0 && (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1.5">{t("analystRatings")}</p>
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
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">{t("buy")} {ratings.strongBuy + ratings.buy}</span>
            <span className="text-amber-600 dark:text-amber-400">{t("hold")} {ratings.hold}</span>
            <span className="text-red-500 dark:text-red-400">{t("sell")} {ratings.sell + ratings.strongSell}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockRow({ holding }: StockRowProps) {
  const {
    quotes,
    quoteUpdatedAt,
    refreshingTickers,
    exchangeRates,
    removeHolding,
    updateHolding,
    refreshSingleQuote,
  } = usePortfolio();
  const { isAlphaVantage, getApiHeaders, provider, trackAvCalls } = useSettings();
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(holding.name);
  const [editTicker, setEditTicker] = useState(holding.ticker);
  const [editIsin, setEditIsin] = useState(holding.isin);
  const [editShares, setEditShares] = useState(String(holding.shares));
  const [editPurchasePrice, setEditPurchasePrice] = useState(String(holding.purchasePrice));
  const [editDisplayCurrency, setEditDisplayCurrency] = useState(holding.displayCurrency);
  const [editExchange, setEditExchange] = useState(holding.exchange);
  const [editAssetType, setEditAssetType] = useState<"stock" | "etf">(holding.assetType ?? "stock");
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeError, setTradeError] = useState<string | null>(null);

  const quote: QuoteData | undefined = quotes[holding.ticker];
  const isCashHolding =
    holding.exchange.trim().toUpperCase() === "CASH" ||
    holding.ticker.trim().toUpperCase().startsWith("CASH-");
  const isFallback = isAlphaVantage && quote?.providerUsed === "yahoo";
  const isAvSource = quote?.providerUsed === "alphavantage";
  const isRefreshing = refreshingTickers.has(holding.ticker);
  const marketStatus = isCashHolding ? null : getMarketStatus(holding.exchange, now);
  const lastFetchedAt = quoteUpdatedAt[holding.ticker] ?? quote?.fetchedAt;
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
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  const dayChangePercent = quote?.regularMarketChangePercent ?? 0;

  const isPositive = gainLoss >= 0;
  const gainColor = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const gainBg = isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10";

  const cur = holding.displayCurrency;

  const handleDelete = () => {
    removeHolding(holding.id);
    setShowDeleteConfirm(false);
  };

  const handleStartEdit = () => {
    setEditName(holding.name);
    setEditTicker(holding.ticker);
    setEditIsin(holding.isin);
    setEditShares(String(holding.shares));
    setEditPurchasePrice(String(holding.purchasePrice));
    setEditDisplayCurrency(holding.displayCurrency);
    setEditExchange(holding.exchange);
    setEditAssetType(holding.assetType ?? "stock");
    setIsEditing(true);
    setShowDeleteConfirm(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const parsedShares = parseFloat(editShares);
    const parsedPurchasePrice = parseFloat(editPurchasePrice);
    const nextShares = isCashHolding ? 1 : parsedShares;
    const nextPurchasePrice = parsedPurchasePrice;
    if (
      !editName.trim() ||
      !editTicker.trim() ||
      !editDisplayCurrency.trim() ||
      !editExchange.trim() ||
      Number.isNaN(nextShares) ||
      Number.isNaN(nextPurchasePrice) ||
      nextShares <= 0 ||
      nextPurchasePrice < 0
    ) {
      return;
    }

    await updateHolding(holding.id, {
      name: editName.trim(),
      ticker: editTicker.trim().toUpperCase(),
      isin: editIsin.trim(),
      assetType: editAssetType,
      shares: nextShares,
      purchasePrice: nextPurchasePrice,
      displayCurrency: editDisplayCurrency.trim().toUpperCase(),
      exchange: editExchange.trim().toUpperCase(),
    });
    setIsEditing(false);
  };

  const handleApplyTrade = async () => {
    const qty = parseFloat(tradeQuantity);
    const price = parseFloat(tradePrice);
    if (Number.isNaN(qty) || Number.isNaN(price) || qty <= 0 || price < 0) {
      setTradeError(t("tradeInvalid"));
      return;
    }

    if (tradeAction === "sell" && qty >= holding.shares) {
      setTradeError(t("sellExceedsShares"));
      return;
    }

    setTradeError(null);
    let nextShares = holding.shares;
    let nextPurchasePrice = holding.purchasePrice;

    if (tradeAction === "buy") {
      const prevCost = holding.shares * holding.purchasePrice;
      const addCost = qty * price;
      nextShares = holding.shares + qty;
      nextPurchasePrice = nextShares > 0 ? (prevCost + addCost) / nextShares : 0;
    } else {
      nextShares = holding.shares - qty;
      nextPurchasePrice = holding.purchasePrice;
    }

    await updateHolding(holding.id, {
      shares: nextShares,
      purchasePrice: nextPurchasePrice,
    });
    setTradeQuantity("");
    setTradePrice("");
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

  useEffect(() => {
    setOverview(null);
  }, [provider]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <div
        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="col-span-4 sm:col-span-3">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{holding.name}</p>
            <span className="flex-shrink-0 text-[9px] font-semibold px-1 py-px rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
              {(holding.assetType ?? "stock").toUpperCase()}
            </span>
            {isFallback ? (
              <span
                className="flex-shrink-0 text-[9px] font-semibold px-1 py-px rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                title={t("yahooFallback")}
              >
                Yahoo
              </span>
            ) : isAvSource ? (
              <span
                className="flex-shrink-0 text-[9px] font-semibold px-1 py-px rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                title={t("avSource")}
              >
                AV
              </span>
            ) : null}
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshSingleQuote(holding.ticker);
              }}
              disabled={isRefreshing}
              className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("refreshOne")}
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
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
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
            <span>{holding.ticker} · {holding.exchange}</span>
            {marketStatus && (
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-px rounded-full ${
                  marketStatus.isOpen
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600"
                }`}
                title={marketStatus.isOpen ? t("marketOpenTooltip") : t("marketClosedTooltip")}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  marketStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-gray-400 dark:bg-slate-500"
                }`} />
                {marketStatus.isOpen ? t("marketOpen") : t("marketClosed")}
                {marketStatus.isOpen && marketStatus.nextEvent && (
                  <span className="font-normal opacity-75">· {marketStatus.nextEvent}</span>
                )}
              </span>
            )}
            {lastFetchedAt && (
              <span>· {t("lastUpdated")}: {new Date(lastFetchedAt).toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 text-right">
          <p className="text-sm text-gray-700 dark:text-slate-200">{holding.shares}</p>
        </div>
        <div className="col-span-3 sm:col-span-2 text-right hidden sm:block">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {formatCurrency(holding.purchasePrice, cur)}
          </p>
        </div>
        <div className="col-span-3 sm:col-span-2 text-right">
          {hasQuote ? (
            <div>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                {formatCurrency(currentPriceInDisplay, cur)}
              </p>
              <p className={`text-xs ${dayChangePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {formatPercent(dayChangePercent)}
              </p>
              {marketStatus && (
                <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5 hidden sm:block">
                  {marketStatus.isOpen ? t("delayLabel") : t("prevCloseLabel")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-slate-500">--</p>
          )}
        </div>
        <div className="col-span-3 sm:col-span-2 text-right">
          <p className="text-sm text-gray-900 dark:text-white">
            {formatCurrency(totalValue, cur)}
          </p>
        </div>
        <div className="col-span-12 sm:col-span-2 text-right">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-semibold ${gainBg} ${gainColor}`}>
            {formatPercent(gainLossPercent)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-gray-50/50 dark:bg-slate-800/30">
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pt-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editName")}</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editTicker")}</label>
                <input
                  value={editTicker}
                  onChange={(e) => setEditTicker(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editISIN")}</label>
                <input
                  value={editIsin}
                  onChange={(e) => setEditIsin(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editExchange")}</label>
                <input
                  value={editExchange}
                  onChange={(e) => setEditExchange(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("assetType")}</label>
                <select
                  value={editAssetType}
                  onChange={(e) => setEditAssetType(e.target.value as "stock" | "etf")}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="stock">{t("stockType")}</option>
                  <option value="etf">{t("etfType")}</option>
                </select>
              </div>
              {!isCashHolding && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("shares")}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editShares}
                    onChange={(e) => setEditShares(e.target.value)}
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                  {isCashHolding ? t("cashAmount") : t("purchasePrice")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editPurchasePrice}
                  onChange={(e) => setEditPurchasePrice(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("editCurrency")}</label>
                <select
                  value={editDisplayCurrency}
                  onChange={(e) => setEditDisplayCurrency(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                  <option value="GBX">GBX (pence)</option>
                  <option value="DKK">DKK</option>
                  <option value="CAD">CA$ CAD</option>
                  <option value="CHF">CHF</option>
                  <option value="JPY">¥ JPY</option>
                </select>
              </div>
            </div>
          )}

          {!isEditing && !isCashHolding && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 pt-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("tradeAction")}</label>
                <select
                  value={tradeAction}
                  onChange={(e) => setTradeAction(e.target.value as "buy" | "sell")}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="buy">{t("buy")}</option>
                  <option value="sell">{t("sell")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("tradeQuantity")}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{t("tradePrice")}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(e.target.value)}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyTrade();
                  }}
                  className="btn-primary text-sm px-3 py-2 w-full"
                >
                  {t("applyTrade")}
                </button>
              </div>
              {tradeError && (
                <p className="text-xs text-red-500 sm:col-span-4">{tradeError}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pt-2">
            <div className="bg-white dark:bg-slate-700/50 rounded-xl px-3 py-2 shadow-sm border border-gray-100 dark:border-slate-600">
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("gainLoss")}</p>
              <p className={`text-sm font-bold ${gainColor}`}>
                {formatCurrency(gainLoss, cur)}
              </p>
            </div>
            {hasQuote && display52High > 0 && (
              <div className="bg-white dark:bg-slate-700/50 rounded-xl px-3 py-2 shadow-sm border border-gray-100 dark:border-slate-600">
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("week52High")}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(display52High, cur)}
                </p>
              </div>
            )}
            {hasQuote && display52Low > 0 && (
              <div className="bg-white dark:bg-slate-700/50 rounded-xl px-3 py-2 shadow-sm border border-gray-100 dark:border-slate-600">
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("week52Low")}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(display52Low, cur)}
                </p>
              </div>
            )}
            {hasQuote && quote?.marketCap && quote.marketCap > 0 && (
              <div className="bg-white dark:bg-slate-700/50 rounded-xl px-3 py-2 shadow-sm border border-gray-100 dark:border-slate-600">
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("marketCap")}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
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
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500" />
              {t("loadingOverview")}
            </div>
          )}

          {isAlphaVantage && overview && <OverviewSection overview={overview} />}

          <div className="mt-3 flex items-center justify-between">
            <Link
              href={`/stock/${encodeURIComponent(holding.ticker)}?exchange=${encodeURIComponent(holding.exchange)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {t("viewDetails")}
            </Link>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-slate-400">{t("deleteConfirm")}</span>
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
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                      className="btn-primary text-sm px-3 py-1"
                    >
                      {t("saveChanges")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                      className="btn-secondary text-sm px-3 py-1"
                    >
                      {t("cancel")}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(); }}
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors px-3 py-1"
                  >
                    {t("editValues")}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                  className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors px-3 py-1"
                >
                  {t("removeStock")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
