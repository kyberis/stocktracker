"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSWRConfig } from "swr";
import { usePortfolio } from "@/lib/portfolio-context";
import { todayLocal } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { getHoldingsLimit } from "@/lib/subscription";
import ProCompareCard from "@/components/ProCompareCard";
import type { SearchResult, TransactionType } from "@/lib/types";

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

function getCoinKey(ticker: string): string | undefined {
  const base = ticker.split("-")[0]?.toUpperCase();
  return base && base in COIN_ICONS ? base : undefined;
}

interface AddCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCryptoModal({ isOpen, onClose }: AddCryptoModalProps) {
  const { refreshHoldings, refreshSingleQuote, activePortfolioId, holdings } = usePortfolio();
  const { user } = useAuth();
  const { mutate: globalMutate } = useSWRConfig();
  const { getApiHeaders } = useSettings();
  const { t } = useI18n();
  const holdingsLimit = getHoldingsLimit(user?.plan ?? "free");
  const holdingsAtLimit = holdingsLimit !== Infinity && holdings.length >= holdingsLimit;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [coinName, setCoinName] = useState("");
  const [ticker, setTicker] = useState("");
  const [txDate, setTxDate] = useState(todayLocal);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setCoinName("");
      setTicker("");
      setTxDate(todayLocal());
      setQuantity("");
      setPrice("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const searchCrypto = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q, includeCrypto: "true" });
      const headers = getApiHeaders();
      const res = await fetch(`/api/search?${params}`, { headers });
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setResults(data.filter((r) => r.quoteType === "CRYPTOCURRENCY"));
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [getApiHeaders]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCrypto(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setSelected(result);
    setQuery(result.symbol);
    setCoinName(result.shortname);
    setTicker(result.symbol);
    setResults([]);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!coinName.trim() || !ticker.trim() || !quantity || !price || submitting) return;
    setSubmitting(true);

    const shares = parseFloat(quantity);
    const pricePerShare = parseFloat(price);
    const totalAmount = shares * pricePerShare;
    const tickerNorm = ticker.trim().toUpperCase().replace(/\s+/g, "-");

    try {
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/transactions${qp}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: tickerNorm,
          name: coinName.trim(),
          type: "buy" as TransactionType,
          date: txDate,
          shares,
          pricePerShare,
          totalAmount,
          fees: 0,
          taxes: 0,
          currency: "USD",
          displayCurrency: "USD",
          exchange: "CRYPTO",
          assetType: "crypto",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to add crypto");
      }

      await refreshHoldings();
      refreshSingleQuote(tickerNorm);
      globalMutate((key) => typeof key === "string" && key.startsWith("/api/transactions"));
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  const focusTrapRef = useFocusTrap(isOpen, onClose);
  const coinKey = getCoinKey(ticker);
  const icon = coinKey ? COIN_ICONS[coinKey] : undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="addcrypto-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 id="addcrypto-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t("addCrypto")}</h2>

        {holdingsAtLimit ? (
          <div>
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">{t("holdingsLimitReached")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                {t("holdingsUsage").replace("{used}", String(holdings.length)).replace("{limit}", String(holdingsLimit))}
              </p>
            </div>
            <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" compact />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {holdingsLimit < Infinity && (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-right tabular-nums">
                  {t("holdingsUsage").replace("{used}", String(holdings.length)).replace("{limit}", String(holdingsLimit))}
                </p>
              )}

              <div className="relative">
                <label htmlFor="addcrypto-search" className="block text-sm text-gray-500 dark:text-slate-400 mb-1.5">{t("search")}</label>
                <input
                  id="addcrypto-search"
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={t("cryptoSearchPlaceholder")}
                  className="w-full"
                />
                {searching && (
                  <div className="absolute right-3 top-9">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500" />
                  </div>
                )}
                {results.length > 0 && !selected && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {results.map((r) => {
                      const rk = getCoinKey(r.symbol);
                      const ri = rk ? COIN_ICONS[rk] : undefined;
                      return (
                        <button
                          key={r.symbol}
                          onClick={() => handleSelect(r)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                          {ri ? (
                            <span className={`w-6 h-6 rounded-full ${ri.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{ri.label}</span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs font-bold shrink-0">?</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900 dark:text-white">{r.symbol}</span>
                            <span className="text-gray-500 dark:text-slate-400 text-sm ml-2 truncate">{r.shortname}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {(selected || coinName || ticker) && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-500/20 flex items-center gap-2">
                  {icon ? (
                    <span className={`w-6 h-6 rounded-full ${icon.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{icon.label}</span>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs font-bold shrink-0">?</span>
                  )}
                  <span className="text-amber-700 dark:text-amber-300 font-medium">{ticker || t("ticker")}</span>
                  <span className="text-gray-600 dark:text-slate-400 text-sm">{coinName || t("name")}</span>
                </div>
              )}

              <div>
                <label htmlFor="addcrypto-name" className="block text-sm text-gray-500 dark:text-slate-400 mb-1.5">{t("name")}</label>
                <input
                  id="addcrypto-name"
                  type="text"
                  value={coinName}
                  onChange={(e) => setCoinName(e.target.value)}
                  placeholder={t("name")}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="addcrypto-ticker" className="block text-sm text-gray-500 dark:text-slate-400 mb-1.5">{t("ticker")}</label>
                <input
                  id="addcrypto-ticker"
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="BTC-USD"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="addcrypto-date" className="block text-sm text-gray-500 dark:text-slate-400 mb-1.5">{t("transactionDate")}</label>
                <input
                  id="addcrypto-date"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  max={todayLocal()}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="addcrypto-quantity" className="block text-sm text-gray-500 dark:text-slate-400 mb-1.5">{t("cryptoQuantity")}</label>
                <input
                  id="addcrypto-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={t("cryptoEnterQuantity")}
                  min="0"
                  step="any"
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="addcrypto-price" className="block text-sm text-gray-500 dark:text-slate-400 mb-1.5">{t("purchasePrice")} (USD)</label>
                <input
                  id="addcrypto-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("enterPrice")}
                  min="0"
                  step="any"
                  className="w-full"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">
              {t("cryptoDisclaimer")}
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="btn-secondary">
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!coinName.trim() || !ticker.trim() || !quantity || !price || submitting}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? t("adding") : t("addToPortfolio")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
