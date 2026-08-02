"use client";

import { memo, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import {
  formatCurrency,
  formatPercent,
  convertCurrency,
  convertToEUR,
  resolveQuoteCurrency,
  normalizeCurrency,
  hasExchangeRate,
} from "@/lib/utils";
import type { Holding, QuoteData } from "@/lib/types";
import { holdingDetailHref } from "@/lib/asset-detail-href";
import AlertBadge from "@/components/AlertBadge";
import HoldingResearchLinks from "@/components/HoldingResearchLinks";
import { hapticImpact, hapticSelectionChanged } from "@/lib/native-haptics";

const COLLAPSED_COUNT = 7;

type SortField = "returnPct" | "returnAbs" | "size" | "dayChange";
type ReturnDisplayMode = "pct" | "abs";

interface PortfolioCardsProps {
  holdings: Holding[];
}

const HoldingCard = memo(function HoldingCard({ holding, returnMode, onToggleReturn, showDayChange }: { holding: Holding; returnMode: ReturnDisplayMode; onToggleReturn: () => void; showDayChange: boolean }) {
  const router = useRouter();
  const { quotes, exchangeRates, alertedTickers, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;

  const quote: QuoteData | undefined = quotes[holding.ticker];
  const quoteCurrency = quote
    ? resolveQuoteCurrency(holding.displayCurrency, quote.currency)
    : holding.displayCurrency;
  const normalizedQuoteCurrency = normalizeCurrency(quoteCurrency);
  const hasRate = normalizedQuoteCurrency === baseCurrency || hasExchangeRate(normalizedQuoteCurrency, exchangeRates);

  const price = quote?.regularMarketPrice ?? 0;
  const priceInBase = hasRate ? convertCurrency(price, normalizedQuoteCurrency, baseCurrency, exchangeRates) : price;
  const totalValue = priceInBase * holding.shares;
  const costPerShare = holding.purchasePrice;
  const costCurrency = normalizeCurrency(holding.displayCurrency);
  const costHasRate = costCurrency === baseCurrency || hasExchangeRate(costCurrency, exchangeRates);
  const costInBase = costHasRate
    ? convertCurrency(costPerShare, costCurrency, baseCurrency, exchangeRates)
    : costPerShare;
  const totalCost = costInBase * holding.shares;
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const dayChangePct = quote?.regularMarketChangePercent ?? 0;
  const dayChangeAbs = hasRate && quote
    ? convertCurrency(holding.shares * (quote.regularMarketChange ?? 0), normalizedQuoteCurrency, baseCurrency, exchangeRates)
    : 0;
  const isPositive = gainLoss >= 0;
  const dayPositive = dayChangePct >= 0;
  const displayPositive = showDayChange ? dayPositive : isPositive;
  const isAlerted = alertedTickers.has(holding.ticker);
  const isCrypto = holding.assetType === "crypto";
  const typeLabel = isCrypto ? "CRYPTO" : holding.assetType === "etf" ? "ETF" : "";

  const returnText = showDayChange
    ? returnMode === "pct"
      ? `${dayPositive ? "+" : ""}${formatPercent(dayChangePct)}`
      : `${dayPositive ? "+" : ""}${hasRate ? formatCurrency(dayChangeAbs, baseCurrency) : "--"}`
    : returnMode === "pct"
      ? formatPercent(gainLossPercent)
      : `${isPositive ? "+" : ""}${hasRate ? formatCurrency(gainLoss, baseCurrency) : "--"}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { hapticImpact("Light"); router.push(holdingDetailHref(holding)); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          hapticImpact("Light");
          router.push(holdingDetailHref(holding));
        }
      }}
      className="w-full text-left bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-4 active:scale-[0.98] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      data-testid="holding-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-600/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate px-0.5">
              {holding.ticker.split(".")[0].slice(0, 4)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{holding.ticker}</p>
              {isAlerted && <AlertBadge ticker={holding.ticker} />}
              {typeLabel && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                  {typeLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{holding.name || quote?.shortName || holding.ticker}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
            {hasRate ? formatCurrency(totalValue, baseCurrency) : "--"}
          </p>
          <p className={`text-xs font-medium tabular-nums ${displayPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
            {showDayChange
              ? `${dayPositive ? "+" : ""}${hasRate ? formatCurrency(dayChangeAbs, baseCurrency) : "--"}`
              : `${isPositive ? "+" : ""}${hasRate ? formatCurrency(gainLoss, baseCurrency) : "--"}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-700/40 gap-2">
        <div className="flex gap-4 text-xs text-gray-500 dark:text-slate-400 min-w-0">
          <span>{holding.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</span>
          <span>{hasRate ? formatCurrency(priceInBase, baseCurrency) : "--"}/ea</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); hapticSelectionChanged(); onToggleReturn(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                hapticSelectionChanged();
                onToggleReturn();
              }
            }}
            className={`text-xs font-medium tabular-nums cursor-pointer active:opacity-70 ${displayPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
          >
            {returnText}
          </span>
          {showDayChange ? (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums ${isPositive ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"}`}>
              {isPositive ? "+" : ""}{formatPercent(gainLossPercent)}
            </span>
          ) : (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums ${dayPositive ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"}`}>
              {dayPositive ? "▲" : "▼"} {Math.abs(dayChangePct).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <HoldingResearchLinks holding={holding} variant="pills" className="mt-3" />
    </div>
  );
});

export default function PortfolioCards({ holdings }: PortfolioCardsProps) {
  const { t } = useI18n();
  const { quotes, exchangeRates } = usePortfolio();
  const [expanded, setExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>("dayChange");
  const [returnMode, setReturnMode] = useState<ReturnDisplayMode>("pct");

  const toggleReturnMode = () => {
    setReturnMode((m) => (m === "pct" ? "abs" : "pct"));
    hapticSelectionChanged();
  };

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aq = quotes[a.ticker];
      const bq = quotes[b.ticker];
      switch (sortField) {
        case "returnPct": {
          const aGain = aq ? ((aq.regularMarketPrice - a.purchasePrice) / a.purchasePrice) * 100 : 0;
          const bGain = bq ? ((bq.regularMarketPrice - b.purchasePrice) / b.purchasePrice) * 100 : 0;
          return bGain - aGain;
        }
        case "returnAbs": {
          const aGain = aq
            ? convertToEUR(a.shares * (aq.regularMarketPrice - a.purchasePrice), a.displayCurrency, exchangeRates)
            : 0;
          const bGain = bq
            ? convertToEUR(b.shares * (bq.regularMarketPrice - b.purchasePrice), b.displayCurrency, exchangeRates)
            : 0;
          return bGain - aGain;
        }
        case "size": {
          const aVal = aq
            ? convertToEUR(a.shares * aq.regularMarketPrice, a.displayCurrency, exchangeRates)
            : a.valueInEUR;
          const bVal = bq
            ? convertToEUR(b.shares * bq.regularMarketPrice, b.displayCurrency, exchangeRates)
            : b.valueInEUR;
          return bVal - aVal;
        }
        case "dayChange": {
          const aDay = aq?.regularMarketChangePercent ?? 0;
          const bDay = bq?.regularMarketChangePercent ?? 0;
          return bDay - aDay;
        }
        default:
          return 0;
      }
    });
  }, [holdings, quotes, exchangeRates, sortField]);

  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const canExpand = sorted.length > COLLAPSED_COUNT;

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-slate-400">{t("emptyStateTitle")}</p>
      </div>
    );
  }

  const sortOptions: { key: SortField; label: string }[] = [
    { key: "returnPct", label: t("sortReturnPct") },
    { key: "returnAbs", label: t("sortReturnAbs") },
    { key: "dayChange", label: t("sortDayChange") },
    { key: "size", label: t("sortSize") },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <select
          value={sortField}
          onChange={(e) => { hapticSelectionChanged(); setSortField(e.target.value as SortField); }}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          aria-label={t("sortBy")}
        >
          {sortOptions.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 dark:text-slate-500">{sorted.length} {t("holdings").toLowerCase()}</span>
      </div>
      {visible.map((h) => (
        <HoldingCard key={h.id} holding={h} returnMode={returnMode} onToggleReturn={toggleReturnMode} showDayChange={sortField === "dayChange"} />
      ))}
      {canExpand && (
        <button
          onClick={() => { hapticImpact("Light"); setExpanded((v) => !v); }}
          className="w-full py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/60 active:scale-[0.98] transition-transform"
        >
          {expanded ? t("showLess") : `${t("viewAll")} (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
