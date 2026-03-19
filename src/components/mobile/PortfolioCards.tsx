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
import AlertBadge from "@/components/AlertBadge";
import { hapticImpact, hapticSelectionChanged } from "@/lib/native-haptics";

const COLLAPSED_COUNT = 7;

type SortField = "returnPct" | "returnAbs" | "size";
type ReturnDisplayMode = "pct" | "abs";

interface PortfolioCardsProps {
  holdings: Holding[];
}

const HoldingCard = memo(function HoldingCard({ holding, returnMode, onToggleReturn }: { holding: Holding; returnMode: ReturnDisplayMode; onToggleReturn: () => void }) {
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
  const costInBase = hasRate ? convertCurrency(costPerShare, normalizedQuoteCurrency, baseCurrency, exchangeRates) : costPerShare;
  const totalCost = costInBase * holding.shares;
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const dayChange = quote?.regularMarketChangePercent ?? 0;
  const isPositive = gainLoss >= 0;
  const dayPositive = dayChange >= 0;
  const isAlerted = alertedTickers.has(holding.ticker);
  const isCrypto = holding.assetType === "crypto";
  const typeLabel = isCrypto ? "CRYPTO" : holding.assetType === "etf" ? "ETF" : "";

  const returnText = returnMode === "pct"
    ? formatPercent(gainLossPercent)
    : `${isPositive ? "+" : ""}${hasRate ? formatCurrency(gainLoss, baseCurrency) : "--"}`;

  return (
    <button
      onClick={() => { hapticImpact("Light"); router.push(`/stock/${encodeURIComponent(holding.ticker)}`); }}
      className="w-full text-left bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-4 active:scale-[0.98] transition-transform"
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
          <p className={`text-xs font-medium tabular-nums ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
            {isPositive ? "+" : ""}{hasRate ? formatCurrency(gainLoss, baseCurrency) : "--"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-700/40">
        <div className="flex gap-4 text-xs text-gray-500 dark:text-slate-400">
          <span>{holding.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</span>
          <span>{hasRate ? formatCurrency(priceInBase, baseCurrency) : "--"}/ea</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); hapticSelectionChanged(); onToggleReturn(); }}
            className={`text-xs font-medium tabular-nums cursor-pointer active:opacity-70 ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
          >
            {returnText}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums ${dayPositive ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"}`}>
            {dayPositive ? "▲" : "▼"} {Math.abs(dayChange).toFixed(2)}%
          </span>
        </div>
      </div>
    </button>
  );
});

export default function PortfolioCards({ holdings }: PortfolioCardsProps) {
  const { t } = useI18n();
  const { quotes, exchangeRates } = usePortfolio();
  const [expanded, setExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>("returnPct");
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
    { key: "size", label: t("sortSize") },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => { hapticSelectionChanged(); setSortField(opt.key); }}
            className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
              sortField === opt.key
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-transparent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {visible.map((h) => (
        <HoldingCard key={h.id} holding={h} returnMode={returnMode} onToggleReturn={toggleReturnMode} />
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
