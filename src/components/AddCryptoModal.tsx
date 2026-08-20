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
import { currencyFromCryptoTicker } from "@/lib/db/helpers";

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
    const pairCcy = currencyFromCryptoTicker(tickerNorm) || "USD";

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
          currency: pairCcy,
          displayCurrency: pairCcy,
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
  const pairCcyLabel = currencyFromCryptoTicker(ticker.trim().toUpperCase().replace(/\s+/g, "-")) || "USD";

  if (!isOpen) return null;

  // Mobile: full-viewport page (not a floating card) so submit stays above browser chrome.
  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm max-sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="addcrypto-modal-title"
        className="relative flex h-[100dvh] w-full flex-col bg-white dark:bg-slate-800 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:mx-4 sm:rounded-2xl sm:border sm:border-gray-200 sm:dark:border-slate-700 sm:shadow-xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] dark:border-slate-700 sm:px-6 sm:pb-4 sm:pt-6">
          <h2 id="addcrypto-modal-title" className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            {t("addCrypto")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label={t("close")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {holdingsAtLimit ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">{t("holdingsLimitReached")}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                {t("holdingsUsage").replace("{used}", String(holdings.length)).replace("{limit}", String(holdingsLimit))}
              </p>
            </div>
            <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" compact />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6 sm:py-4">
              <div className="space-y-4">
                {holdingsLimit < Infinity && (
                  <p className="text-right text-xs tabular-nums text-gray-400 dark:text-slate-500">
                    {t("holdingsUsage").replace("{used}", String(holdings.length)).replace("{limit}", String(holdingsLimit))}
                  </p>
                )}

                <div className="relative">
                  <label htmlFor="addcrypto-search" className="mb-1.5 block text-sm text-gray-500 dark:text-slate-400">
                    {t("search")}
                  </label>
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
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-amber-500" />
                    </div>
                  )}
                  {results.length > 0 && !selected && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
                      {results.map((r) => {
                        const rk = getCoinKey(r.symbol);
                        const ri = rk ? COIN_ICONS[rk] : undefined;
                        return (
                          <button
                            key={r.symbol}
                            type="button"
                            onClick={() => handleSelect(r)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            {ri ? (
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ri.bg}`}>
                                {ri.label}
                              </span>
                            ) : (
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-500 text-xs font-bold text-white">
                                ?
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900 dark:text-white">{r.symbol}</span>
                              <span className="ml-2 truncate text-sm text-gray-500 dark:text-slate-400">{r.shortname}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {(selected || coinName || ticker) && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                    {icon ? (
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${icon.bg}`}>
                        {icon.label}
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-500 text-xs font-bold text-white">
                        ?
                      </span>
                    )}
                    <span className="font-medium text-amber-700 dark:text-amber-300">{ticker || t("ticker")}</span>
                    <span className="text-sm text-gray-600 dark:text-slate-400">{coinName || t("name")}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="addcrypto-name" className="mb-1.5 block text-sm text-gray-500 dark:text-slate-400">
                    {t("name")}
                  </label>
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
                  <label htmlFor="addcrypto-ticker" className="mb-1.5 block text-sm text-gray-500 dark:text-slate-400">
                    {t("ticker")}
                  </label>
                  <input
                    id="addcrypto-ticker"
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="BTC-USD / SOL-EUR"
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="addcrypto-date" className="mb-1.5 block text-sm text-gray-500 dark:text-slate-400">
                    {t("transactionDate")}
                  </label>
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
                  <label htmlFor="addcrypto-quantity" className="mb-1.5 block text-sm text-gray-500 dark:text-slate-400">
                    {t("cryptoQuantity")}
                  </label>
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
                  <label htmlFor="addcrypto-price" className="mb-1.5 block text-sm text-gray-500 dark:text-slate-400">
                    {t("purchasePrice")} ({pairCcyLabel})
                  </label>
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

                <p className="text-xs text-gray-400 dark:text-slate-500">{t("cryptoDisclaimer")}</p>
              </div>
            </div>

            <div
              className="flex flex-shrink-0 gap-3 border-t border-gray-100 px-5 pt-3 dark:border-slate-700 sm:px-6 sm:py-4"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <button type="button" onClick={onClose} className="btn-secondary min-h-11 flex-1 sm:flex-none">
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!coinName.trim() || !ticker.trim() || !quantity || !price || submitting}
                className="btn-primary min-h-11 flex-1 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:flex-none"
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
