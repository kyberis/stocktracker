"use client";

import { useState, useMemo, Fragment } from "react";
import dynamic from "next/dynamic";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { formatCurrency, formatPercent, formatStealthCurrency, convertToEUR, convertCurrency } from "@/lib/utils";
import type { Holding, QuoteData, ExchangeRates } from "@/lib/types";
import { isPaidPlan, planOf } from "@/lib/plan-rank";

const AddCryptoModal = dynamic(() => import("./AddCryptoModal"), { ssr: false });
const ProCompareCard = dynamic(() => import("./ProCompareCard"), { ssr: false });
const TransactionHistory = dynamic(() => import("./TransactionHistory"), { ssr: false });

const COIN_ICONS: Record<string, { bg: string; label: string }> = {
  BTC: { bg: "bg-[#f7931a]", label: "₿" },
  ETH: { bg: "bg-[#627eea]", label: "Ξ" },
  SOL: { bg: "bg-[#9945ff]", label: "◎" },
  ADA: { bg: "bg-[#0033ad]", label: "₳" },
  XRP: { bg: "bg-[#23292f]", label: "✕" },
  DOT: { bg: "bg-[#e6007a]", label: "●" },
  AVAX: { bg: "bg-[#e84142]", label: "▲" },
  LINK: { bg: "bg-[#2a5ada]", label: "⬡" },
  DOGE: { bg: "bg-[#c2a633]", label: "Ð" },
  MATIC: { bg: "bg-[#8247e5]", label: "⬡" },
};

function getCoinIcon(ticker: string) {
  const base = ticker.split("-")[0]?.toUpperCase();
  return base && base in COIN_ICONS ? COIN_ICONS[base] : null;
}

function computeCryptoRow(h: Holding, quotes: Record<string, QuoteData>, exchangeRates: ExchangeRates) {
  const quote = quotes[h.ticker];
  const price = quote?.regularMarketPrice ?? 0;
  const change = quote?.regularMarketChange ?? 0;
  const changePct = quote?.regularMarketChangePercent ?? 0;
  const marketCap = quote?.marketCap ?? 0;
  const currency = quote?.currency ?? h.displayCurrency;

  const valueInCurrency = h.shares * price;
  const costInCurrency = h.shares * h.purchasePrice;
  const valueEUR = convertToEUR(valueInCurrency, currency, exchangeRates);
  const costEUR = convertToEUR(costInCurrency, h.displayCurrency, exchangeRates);
  const gainLossEUR = valueEUR - costEUR;
  const gainLossPct = costEUR > 0 ? ((valueEUR - costEUR) / costEUR) * 100 : 0;

  return { quote, price, change, changePct, marketCap, currency, valueEUR, costEUR, gainLossEUR, gainLossPct };
}

interface Props {
  holdings: Holding[];
}

export default function CryptoPortfolioTab({ holdings: allHoldings }: Props) {
  const { quotes, exchangeRates, activePortfolioCurrency } = usePortfolio();
  const baseCurrency = activePortfolioCurrency;
  const { user } = useAuth();
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "value" | "change" | "gainLoss">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isPro = isPaidPlan(planOf(user));
  const cryptoHoldings = useMemo(
    () => allHoldings.filter((h) => h.assetType === "crypto"),
    [allHoldings]
  );

  const rows = useMemo(() => {
    const mapped = cryptoHoldings.map((h) => ({
      holding: h,
      ...computeCryptoRow(h, quotes, exchangeRates),
    }));

    mapped.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.holding.name.localeCompare(b.holding.name); break;
        case "value": cmp = a.valueEUR - b.valueEUR; break;
        case "change": cmp = a.changePct - b.changePct; break;
        case "gainLoss": cmp = a.gainLossEUR - b.gainLossEUR; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return mapped;
  }, [cryptoHoldings, quotes, exchangeRates, sortKey, sortDir]);

  const totalValueEUR = rows.reduce((s, r) => s + r.valueEUR, 0);
  const totalCostEUR = rows.reduce((s, r) => s + r.costEUR, 0);
  const totalGainLossEUR = totalValueEUR - totalCostEUR;
  const totalGainLossPct = totalCostEUR > 0 ? ((totalValueEUR - totalCostEUR) / totalCostEUR) * 100 : 0;
  const totalValueBase = convertCurrency(totalValueEUR, "EUR", baseCurrency, exchangeRates);
  const totalGainLossBase = convertCurrency(totalGainLossEUR, "EUR", baseCurrency, exchangeRates);

  const allHoldingsValueEUR = useMemo(() => {
    let total = 0;
    allHoldings.forEach((h) => {
      const q = quotes[h.ticker];
      if (q && q.regularMarketPrice > 0) {
        const v = h.shares * q.regularMarketPrice;
        total += convertToEUR(v, q.currency ?? h.displayCurrency, exchangeRates);
      } else {
        total += convertToEUR(h.shares * h.purchasePrice, h.displayCurrency, exchangeRates);
      }
    });
    return total;
  }, [allHoldings, quotes, exchangeRates]);

  const cryptoPercent = allHoldingsValueEUR > 0 ? (totalValueEUR / allHoldingsValueEUR) * 100 : 0;

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: typeof sortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "desc" ? " ↓" : " ↑";
  };

  const COL_COUNT = 7;

  if (cryptoHoldings.length === 0) {
    return (
      <div className="card px-6 py-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <span className="text-3xl">₿</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("cryptoEmptyState")}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">{t("cryptoEmptyDesc")}</p>
        <button onClick={() => setShowAddModal(true)} className="btn-primary mt-2">
          {t("addCrypto")}
        </button>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">{t("cryptoDisclaimer")}</p>
        {showAddModal && <AddCryptoModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoTotalValue")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatStealthCurrency(totalValueBase, baseCurrency, stealthMode)}
          </p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoTotalGainLoss")}</p>
          <p className={`text-lg font-bold ${totalGainLossEUR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatStealthCurrency(totalGainLossBase, baseCurrency, stealthMode)}
            <span className="text-sm font-medium ml-1">({formatPercent(totalGainLossPct)})</span>
          </p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoPortfolioShare")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPercent(cryptoPercent)}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t("cryptoHoldingsCount")}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{cryptoHoldings.length}</p>
        </div>
      </div>

      {/* Crypto table */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t("cryptoHoldings")}</h3>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm px-3 py-1.5">
            + {t("addCrypto")}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
              <th className="px-5 py-2.5 font-medium cursor-pointer hover:text-gray-700 dark:hover:text-slate-200" onClick={() => handleSort("name")}>
                {t("name")}{sortIcon("name")}
              </th>
              <th className="px-3 py-2.5 font-medium text-right">{t("cryptoQuantity")}</th>
              <th className="px-3 py-2.5 font-medium text-right">{t("cryptoPrice")}</th>
              <th className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-gray-700 dark:hover:text-slate-200" onClick={() => handleSort("change")}>
                {t("crypto24hChange")}{sortIcon("change")}
              </th>
              <th className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-gray-700 dark:hover:text-slate-200" onClick={() => handleSort("value")}>
                {t("cryptoValue")}{sortIcon("value")}
              </th>
              <th className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-gray-700 dark:hover:text-slate-200" onClick={() => handleSort("gainLoss")}>
                {t("gainLoss")}{sortIcon("gainLoss")}
              </th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const icon = getCoinIcon(row.holding.ticker);
              const isExpanded = expandedId === row.holding.id;
              return (
                <Fragment key={row.holding.id}>
                  <tr
                    className={`border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isExpanded ? "bg-gray-50 dark:bg-slate-700/30" : ""}`}
                    onClick={() => setExpandedId(isExpanded ? null : row.holding.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {icon ? (
                          <span className={`w-7 h-7 rounded-full ${icon.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{icon.label}</span>
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs font-bold shrink-0">?</span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{row.holding.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{row.holding.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-slate-300 font-mono">
                      {stealthMode ? "***" : row.holding.shares.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-slate-300">
                      {row.price > 0 ? formatCurrency(row.price, row.currency) : "—"}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium ${row.changePct > 0 ? "text-emerald-600 dark:text-emerald-400" : row.changePct < 0 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-slate-500"}`}>
                      {row.changePct > 0 ? "+" : ""}{row.changePct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatStealthCurrency(convertCurrency(row.valueEUR, "EUR", baseCurrency, exchangeRates), baseCurrency, stealthMode)}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium ${row.gainLossEUR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {formatStealthCurrency(convertCurrency(row.gainLossEUR, "EUR", baseCurrency, exchangeRates), baseCurrency, stealthMode)}
                      <span className="text-xs ml-1 opacity-75">({formatPercent(row.gainLossPct)})</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <svg className={`w-4 h-4 text-gray-400 transition-transform inline-block ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={COL_COUNT} className="p-0">
                        <div className="px-4 py-3 bg-gray-50/50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-700">
                          <TransactionHistory holdingId={row.holding.id} ticker={row.holding.ticker} exchange={row.holding.exchange} assetType={row.holding.assetType} currency={row.holding.displayCurrency} name={row.holding.name} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 px-1">{t("cryptoDisclaimer")}</p>

      {showAddModal && <AddCryptoModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
