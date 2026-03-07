"use client";

import { useState, useEffect, useCallback, memo } from "react";
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
import dynamic from "next/dynamic";
import { getMarketStatus } from "@/lib/market-hours";
import type { Holding, QuoteData, CompanyOverview } from "@/lib/types";
import OverviewSection from "./stock-row/OverviewSection";
import EditForm from "./stock-row/EditForm";
import TradePanel from "./stock-row/TradePanel";

const StockChart = dynamic(() => import("./StockChart"), { ssr: false });

interface StockRowProps {
  holding: Holding;
}

function StockRow({ holding }: StockRowProps) {
  const {
    quotes,
    quoteUpdatedAt,
    refreshingTickers,
    exchangeRates,
    removeHolding,
    updateHolding,
    refreshSingleQuote,
    refreshHoldings,
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
  const [reportSent, setReportSent] = useState(false);
  const [reportSending, setReportSending] = useState(false);

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
  const dayChangeAmountEUR = hasQuote && quote
    ? convertToEUR(holding.shares * (quote.regularMarketChange ?? 0), quoteCurrency, exchangeRates)
    : 0;
  const totalValueEUR = hasQuote
    ? convertToEUR(totalValue, holding.displayCurrency, exchangeRates)
    : holding.valueInEUR;

  const isPositive = gainLoss >= 0;
  const gainColor = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const gainBg = isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10";

  const dayIsPositive = dayChangeAmountEUR >= 0;
  const dayColor = dayIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";

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
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdingId: "",
        ticker: holding.ticker,
        name: holding.name,
        exchange: holding.exchange,
        isin: holding.isin,
        assetType: holding.assetType || "stock",
        accountId: holding.accountId || "",
        type: tradeAction,
        date: new Date().toISOString().slice(0, 10),
        shares: qty,
        pricePerShare: price,
        totalAmount: qty * price,
        fees: 0,
        taxes: 0,
        currency: holding.displayCurrency || "EUR",
        displayCurrency: holding.displayCurrency || "EUR",
        notes: "",
      }),
    }).catch(() => null);

    setTradeQuantity("");
    setTradePrice("");
    if (response?.ok) {
      refreshHoldings();
    }
  };

  const handleReportMissingPrice = async () => {
    if (reportSending || reportSent) return;
    setReportSending(true);
    try {
      const isinPart = holding.isin ? ` (ISIN: ${holding.isin})` : "";
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `${t("reportMissingPriceSubject")}: ${holding.ticker}`,
          message: `Ticker "${holding.ticker}"${isinPart} on exchange ${holding.exchange} (${holding.displayCurrency}) is not returning a current price. Holding: ${holding.name}, ${holding.shares} shares @ ${holding.purchasePrice} ${holding.displayCurrency}.`,
        }),
      });
      setReportSent(true);
    } catch {
      // Silently fail — non-critical action
    } finally {
      setReportSending(false);
    }
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
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1 mr-4">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{holding.name}</p>
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

      {expanded && (
        <div className="px-4 pb-4 bg-gray-50/50 dark:bg-slate-800/30">
          {isEditing && (
            <EditForm
              isCashHolding={isCashHolding}
              editName={editName} setEditName={setEditName}
              editTicker={editTicker} setEditTicker={setEditTicker}
              editIsin={editIsin} setEditIsin={setEditIsin}
              editExchange={editExchange} setEditExchange={setEditExchange}
              editAssetType={editAssetType} setEditAssetType={setEditAssetType}
              editShares={editShares} setEditShares={setEditShares}
              editPurchasePrice={editPurchasePrice} setEditPurchasePrice={setEditPurchasePrice}
              editDisplayCurrency={editDisplayCurrency} setEditDisplayCurrency={setEditDisplayCurrency}
            />
          )}

          {!isEditing && !isCashHolding && (
            <TradePanel
              tradeAction={tradeAction} setTradeAction={setTradeAction}
              tradeQuantity={tradeQuantity} setTradeQuantity={setTradeQuantity}
              tradePrice={tradePrice} setTradePrice={setTradePrice}
              tradeError={tradeError}
              onApply={handleApplyTrade}
            />
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
            <div className="flex items-center gap-3">
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
              {isAlphaVantage && (
                <Link
                  href={`/stock/${encodeURIComponent(holding.ticker)}/intelligence?exchange=${encodeURIComponent(holding.exchange)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t("viewIntelligence")}
                </Link>
              )}
            </div>
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

export default memo(StockRow);
