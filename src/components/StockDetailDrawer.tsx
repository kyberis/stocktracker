"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  convertCurrency,
  convertToEUR,
  normalizeCurrency,
  resolveQuoteCurrency,
  todayLocal,
} from "@/lib/utils";
import { getMarketStatus } from "@/lib/market-hours";
import type { Holding, HoldingAssetType, QuoteData, CompanyOverview } from "@/lib/types";
import { holdingDetailHref } from "@/lib/asset-detail-href";
import { holdingIsEtfLike } from "@/lib/services/etf-lookthrough";
import OverviewSection from "./stock-row/OverviewSection";
import EditForm from "./stock-row/EditForm";
import HoldingTagsField from "./HoldingTagsField";
import TradePanel from "./stock-row/TradePanel";
import AlertForm from "./AlertForm";
import AlertBadge from "./AlertBadge";
import TierFeatureBadge from "./TierFeatureBadge";
import HoldingResearchLinks from "./HoldingResearchLinks";
import dynamic from "next/dynamic";

const StockChart = dynamic(() => import("./StockChart"), { ssr: false });
const TransactionHistory = dynamic(() => import("./TransactionHistory"), { ssr: false });

interface StockDetailDrawerProps {
  holding: Holding;
  onClose: () => void;
}

export default function StockDetailDrawer({ holding, onClose }: StockDetailDrawerProps) {
  const {
    quotes,
    quoteUpdatedAt,
    refreshingTickers,
    exchangeRates,
    holdings,
    removeHolding,
    updateHolding,
    refreshSingleQuote,
    refreshHoldings,
    alertedTickers,
    activePortfolioCurrency,
  } = usePortfolio();
  const baseCurrency = activePortfolioCurrency || "EUR";
  const exchangeExtraCodes = useMemo(
    () => holdings.map((h) => h.exchange).filter(Boolean),
    [holdings],
  );
  const { hasPremiumMarketData, getApiHeaders } = useSettings();
  const { user } = useAuth();
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  const canAccessPremium = user?.plan === "pro" && hasPremiumMarketData;
  const [now, setNow] = useState(() => new Date());
  const [visible, setVisible] = useState(false);
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
  const [editAssetType, setEditAssetType] = useState<HoldingAssetType>(holding.assetType ?? "stock");
  const [editTags, setEditTags] = useState<string[]>(holding.tags ?? []);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [assetTypeSaving, setAssetTypeSaving] = useState(false);
  const hasAlert = alertedTickers.has(holding.ticker);

  const quote: QuoteData | undefined = quotes[holding.ticker];
  const isCashHolding =
    holding.exchange.trim().toUpperCase() === "CASH" ||
    holding.ticker.trim().toUpperCase().startsWith("CASH-");
  const suggestEtfFix =
    !isCashHolding &&
    (holding.assetType ?? "stock") === "stock" &&
    holdingIsEtfLike(holding, quote);
  const suggestFundFix =
    !isCashHolding &&
    (holding.assetType ?? "stock") === "stock" &&
    quote?.quoteType?.toUpperCase() === "MUTUALFUND";
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
  const totalValueBase = convertCurrency(totalValueEUR, "EUR", baseCurrency, exchangeRates);
  const dayChangeAmountBase = convertCurrency(dayChangeAmountEUR, "EUR", baseCurrency, exchangeRates);

  const isPositive = gainLoss >= 0;
  const gainColor = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const gainBg = isPositive ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10";
  const dayIsPositive = dayChangeAmountEUR >= 0;
  const dayColor = dayIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const cur = holding.displayCurrency;

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

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // ESC key to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  // Clock tick for market status
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const overviewFetchedRef = useRef(false);

  useEffect(() => {
    if (!canAccessPremium || overviewFetchedRef.current) return;
    overviewFetchedRef.current = true;
    let cancelled = false;
    setOverviewLoading(true);
    (async () => {
      try {
        const headers = getApiHeaders();
        const params = new URLSearchParams({ symbol: holding.ticker });
        const res = await fetch(`/api/overview?${params}`, { headers });
        if (!cancelled && res.ok) setOverview(await res.json());
      } catch { /* supplementary */ } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [canAccessPremium, getApiHeaders, holding.ticker]);

  const handleDelete = () => {
    removeHolding(holding.id);
    setShowDeleteConfirm(false);
    handleClose();
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
    setEditTags(holding.tags ?? []);
    setIsEditing(true);
    setShowDeleteConfirm(false);
  };

  const handleSaveEdit = async () => {
    const parsedShares = parseFloat(editShares);
    const parsedPurchasePrice = parseFloat(editPurchasePrice);
    const nextShares = isCashHolding ? 1 : parsedShares;
    if (
      !editName.trim() || !editTicker.trim() || !editDisplayCurrency.trim() || !editExchange.trim() ||
      Number.isNaN(nextShares) || Number.isNaN(parsedPurchasePrice) || nextShares <= 0 || parsedPurchasePrice < 0
    ) return;
    await updateHolding(holding.id, {
      name: editName.trim(),
      ticker: editTicker.trim().toUpperCase(),
      isin: editIsin.trim(),
      assetType: editAssetType,
      shares: nextShares,
      purchasePrice: parsedPurchasePrice,
      displayCurrency: editDisplayCurrency.trim().toUpperCase(),
      exchange: editExchange.trim().toUpperCase(),
      ...(editAssetType === "stock" || editAssetType === "etf" ? { tags: editTags } : {}),
    });
    setIsEditing(false);
  };

  const handleSetAsEtf = async () => {
    if (assetTypeSaving) return;
    setAssetTypeSaving(true);
    try {
      await updateHolding(holding.id, { assetType: "etf" });
    } finally {
      setAssetTypeSaving(false);
    }
  };

  const handleSetAsFund = async () => {
    if (assetTypeSaving) return;
    setAssetTypeSaving(true);
    try {
      await updateHolding(holding.id, { assetType: "fund" });
    } finally {
      setAssetTypeSaving(false);
    }
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
    await fetch("/api/transactions", {
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
        date: todayLocal(),
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
    refreshHoldings();
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
    } catch { /* non-critical */ } finally {
      setReportSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={holding.name}
        className={`relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto transition-transform duration-200 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{holding.name}</h2>
              <AlertBadge ticker={holding.ticker} />
              {isRefreshing && (
                <svg className="w-4 h-4 animate-spin text-gray-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{holding.ticker}</span>
              {holding.exchange && (
                <>
                  <span className="text-gray-300 dark:text-slate-600">·</span>
                  <span>{holding.exchange}</span>
                </>
              )}
              {holding.assetType && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                  {holding.assetType.toUpperCase()}
                </span>
              )}
              {marketStatus && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  marketStatus.isOpen
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-gray-400 dark:bg-slate-500"}`} />
                  {marketStatus.isOpen ? t("marketOpen") : t("marketClosed")}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refreshSingleQuote(holding.ticker)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 transition-colors disabled:opacity-40"
              title="Refresh"
              aria-label="Refresh quote"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 transition-colors"
              aria-label={t("close")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {suggestFundFix && !isEditing && (
          <div
            className="px-5 py-3 border-b border-teal-200/80 dark:border-teal-500/30 bg-teal-50/90 dark:bg-teal-500/10"
            role="region"
            aria-label={t("assetTypeSuggestFund")}
          >
            <p className="text-sm text-teal-950 dark:text-teal-100/95 leading-snug">{t("assetTypeSuggestFund")}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={handleSetAsFund}
                disabled={assetTypeSaving}
                className="btn-primary text-sm px-3 py-1.5 disabled:opacity-60"
              >
                {assetTypeSaving ? "…" : t("setAssetTypeFund")}
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                {t("changeAssetType")}
              </button>
            </div>
          </div>
        )}

        {suggestEtfFix && !suggestFundFix && !isEditing && (
          <div
            className="px-5 py-3 border-b border-amber-200/80 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-500/10"
            role="region"
            aria-label={t("assetTypeSuggestEtf")}
          >
            <p className="text-sm text-amber-950 dark:text-amber-100/95 leading-snug">{t("assetTypeSuggestEtf")}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={handleSetAsEtf}
                disabled={assetTypeSaving}
                className="btn-primary text-sm px-3 py-1.5 disabled:opacity-60"
              >
                {assetTypeSaving ? "…" : t("setAssetTypeEtf")}
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                {t("changeAssetType")}
              </button>
            </div>
          </div>
        )}

        {/* Price hero */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalValueBase, baseCurrency)}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {hasQuote ? formatCurrency(currentPriceInDisplay, cur) : formatCurrency(holding.purchasePrice, cur)} × {holding.shares} {t("shares")}
              </p>
            </div>
            <div className="flex items-end gap-3">
              {hasQuote && (
                <div className="text-right">
                  <p className={`text-sm font-semibold ${dayColor}`}>
                    {formatPercent(dayChangePercent)}
                  </p>
                </div>
              )}
              {!isCashHolding && !isEditing && (
                <button
                  onClick={() => setShowAlertForm((v) => !v)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    hasAlert
                      ? "text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      : showAlertForm
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                        : "text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300"
                  }`}
                  title={hasAlert ? t("alertActive") : t("setAlert")}
                  aria-label={hasAlert ? t("alertActive") : t("setAlert")}
                >
                  <svg className="w-5 h-5" fill={hasAlert ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Inline alert form */}
          {showAlertForm && !isCashHolding && !isEditing && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <AlertForm
                ticker={holding.ticker}
                name={holding.name}
                exchange={holding.exchange}
                source="stock-drawer"
                quote={quote}
                compact
                onCreated={() => setShowAlertForm(false)}
                onCancel={() => setShowAlertForm(false)}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl px-3.5 py-3 ${gainBg}`}>
              <p className="text-xs text-gray-500 dark:text-slate-400">{formatPercent(gainLossPercent)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-3">
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("avgCostBasis")}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                {formatCurrency(holding.purchasePrice, cur)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                {t("totalCost")}: {formatCurrency(totalCost, cur)}
              </p>
            </div>
            {hasQuote && display52High > 0 && (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-3">
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("week52High")}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatCurrency(display52High, cur)}
                </p>
              </div>
            )}
            {hasQuote && display52Low > 0 && (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-3">
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("week52Low")}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatCurrency(display52Low, cur)}
                </p>
              </div>
            )}
            {hasQuote && quote?.marketCap && quote.marketCap > 0 && (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-3">
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("marketCap")}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatCompactNumber(quote.marketCap)}
                </p>
              </div>
            )}
          </div>

          {/* Chart */}
          {!isCashHolding && (
            <StockChart
              ticker={holding.ticker}
              exchange={holding.exchange}
              isin={holding.isin}
              purchasePrice={holding.purchasePrice}
              displayCurrency={holding.displayCurrency}
            />
          )}

          {/* Company Overview */}
          {canAccessPremium && overviewLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500" />
              {t("loadingOverview")}
            </div>
          )}
          {canAccessPremium && overview && <OverviewSection overview={overview} />}

          {/* Trade panel */}
          {!isEditing && !isCashHolding && (
            <TradePanel
              tradeAction={tradeAction} setTradeAction={setTradeAction}
              tradeQuantity={tradeQuantity} setTradeQuantity={setTradeQuantity}
              tradePrice={tradePrice} setTradePrice={setTradePrice}
              tradeError={tradeError}
              onApply={handleApplyTrade}
            />
          )}

          {/* Transaction list + edit (stocks and crypto) */}
          {!isEditing && !isCashHolding && (
            <div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
              <TransactionHistory
                holdingId={holding.id}
                ticker={holding.ticker}
                exchange={holding.exchange}
                assetType={holding.assetType}
                currency={holding.displayCurrency}
                name={holding.name}
              />
            </div>
          )}

          {/* Edit form */}
          {isEditing && (
            <>
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
                exchangeExtraCodes={exchangeExtraCodes}
              />
              {!isCashHolding && (editAssetType === "stock" || editAssetType === "etf") && (
                <div className="mb-4">
                  <HoldingTagsField
                    tags={editTags}
                    onChange={setEditTags}
                    holdings={holdings}
                    excludeHoldingId={holding.id}
                    label={t("holdingTagsLabel")}
                    hint={t("holdingTagsHint")}
                  />
                </div>
              )}
            </>
          )}

          {/* Last updated */}
          {lastFetchedAt && (
            <p className="text-[10px] text-gray-400 dark:text-slate-600">
              {t("lastUpdated")}: {(() => { const _d = new Date(lastFetchedAt); return `${String(_d.getHours()).padStart(2, "0")}:${String(_d.getMinutes()).padStart(2, "0")}`; })()}
            </p>
          )}

          {/* Missing price report */}
          {!hasQuote && !isCashHolding && (
            <button
              onClick={handleReportMissingPrice}
              disabled={reportSent || reportSending}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
            >
              {reportSent ? t("reportMissingPriceSent") : reportSending ? "..." : t("reportMissingPrice")}
            </button>
          )}
        </div>

        {/* Bottom actions */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={holdingDetailHref(holding)}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {t("viewDetails")}
            </Link>
            {canAccessPremium && holding.assetType !== "crypto" && (
              <Link
                href={`/analisis/${encodeURIComponent(holding.ticker)}?exchange=${encodeURIComponent(holding.exchange)}&tab=intelligence`}
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {t("viewIntelligence")}
                <TierFeatureBadge requiredPlan="pro" size="xs" />
              </Link>
            )}
            <HoldingResearchLinks holding={holding} className="text-sm" />
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} className="btn-primary text-sm px-3 py-1.5">
                  {t("saveChanges")}
                </button>
                <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm px-3 py-1.5">
                  {t("cancel")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEdit}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors px-2 py-1.5"
                >
                  {t("editValues")}
                </button>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleDelete} className="btn-danger text-sm px-3 py-1.5">
                      {t("confirm")}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-sm px-3 py-1.5">
                      {t("cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors px-2 py-1.5"
                  >
                    {t("removeStock")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
