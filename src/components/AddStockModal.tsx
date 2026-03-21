"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTrack } from "@/lib/use-track";
import { getHoldingsLimit } from "@/lib/subscription";
import ProCompareCard from "@/components/ProCompareCard";
import type { SearchResult } from "@/lib/types";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddStockModal({ isOpen, onClose }: AddStockModalProps) {
  const { addHolding, holdings } = usePortfolio();
  const { user } = useAuth();
  const { getApiHeaders } = useSettings();
  const { t } = useI18n();
  const holdingsLimit = getHoldingsLimit(user?.plan ?? "free");
  const holdingsAtLimit = holdingsLimit !== Infinity && holdings.length >= holdingsLimit;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [stockName, setStockName] = useState("");
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [exchange, setExchange] = useState("");
  const [assetType, setAssetType] = useState<"stock" | "etf" | "">("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const track = useTrack();
  const openedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!openedRef.current) {
        openedRef.current = true;
        track("add_stock_modal_opened");
      }
      if (inputRef.current) inputRef.current.focus();
    } else {
      openedRef.current = false;
      setQuery("");
      setResults([]);
      setSelected(null);
      setStockName("");
      setTicker("");
      setShares("");
      setPrice("");
      setCurrency("USD");
      setExchange("");
      setAssetType("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen]);

  const searchStocks = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      const headers = getApiHeaders();
      const res = await fetch(`/api/search?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
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
    searchTimeout.current = setTimeout(() => searchStocks(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setSelected(result);
    setQuery(result.symbol);
    setStockName(result.shortname);
    setTicker(result.symbol);
    setExchange(result.exchange);
    setAssetType(result.quoteType === "ETF" ? "etf" : "stock");
    setResults([]);
  };

  const handleSubmit = () => {
    if (!stockName.trim() || !ticker.trim() || !exchange.trim() || !shares || !price || !assetType) return;
    if (parseFloat(shares) <= 0) return;

    track("stock_added");
    addHolding({
      name: stockName.trim(),
      ticker: ticker.trim().toUpperCase(),
      isin: "",
      assetType: assetType as "stock" | "etf",
      shares: parseFloat(shares),
      purchasePrice: parseFloat(price),
      purchaseDate,
      displayCurrency: currency,
      exchange: exchange.trim().toUpperCase(),
      valueInEUR: 0,
    });

    onClose();
  };

  const focusTrapRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="addstock-modal-title"
        className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 w-full max-h-[100dvh] sm:max-h-[90vh] sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col"
      >
        <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 id="addstock-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">{t("addStock")}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" aria-label="Close">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {holdingsAtLimit ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {t("holdingsLimitReached")}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                {t("holdingsUsage").replace("{used}", String(holdings.length)).replace("{limit}", String(holdingsLimit))}
              </p>
            </div>
            <ProCompareCard surface="holdings_limit" reason="holdings_limit_reached" compact />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6 sm:py-4">
              <div className="space-y-3">
                {holdingsLimit < Infinity && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 text-right tabular-nums">
                    {t("holdingsUsage").replace("{used}", String(holdings.length)).replace("{limit}", String(holdingsLimit))}
                  </p>
                )}

                {/* Search */}
                <div className="relative">
                  <label htmlFor="addstock-search" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("search")}</label>
                  <input
                    id="addstock-search"
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full"
                  />
                  {searching && (
                    <div className="absolute right-3 top-8">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                    </div>
                  )}
                  {results.length > 0 && !selected && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {results.map((r) => (
                        <button
                          key={r.symbol}
                          onClick={() => handleSelect(r)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{r.symbol}</span>
                            <span className="text-gray-500 dark:text-slate-400 text-sm ml-2">{r.shortname}</span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-slate-500">{r.exchange}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {(selected || stockName || ticker) && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-1.5 border border-emerald-200 dark:border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">{ticker || t("ticker")}</span>
                    <span className="text-gray-600 dark:text-slate-400 text-xs ml-2">{stockName || t("name")}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="addstock-name" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("name")}</label>
                  <input
                    id="addstock-name"
                    type="text"
                    value={stockName}
                    onChange={(e) => setStockName(e.target.value)}
                    placeholder={t("name")}
                    className="w-full"
                  />
                </div>

                {/* Ticker + Exchange row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="addstock-ticker" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("ticker")}</label>
                    <input
                      id="addstock-ticker"
                      type="text"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      placeholder={t("ticker")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="addstock-exchange" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("editExchange")}</label>
                    <input
                      id="addstock-exchange"
                      type="text"
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value)}
                      placeholder={t("editExchange")}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="addstock-assettype" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("assetType")}</label>
                  <select
                    id="addstock-assettype"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as "stock" | "etf" | "")}
                    className="w-full"
                  >
                    <option value="" disabled>{t("selectAssetType")}</option>
                    <option value="stock">{t("stockType")}</option>
                    <option value="etf">{t("etfType")}</option>
                  </select>
                </div>

                {/* Shares + Price row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="addstock-shares" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("shares")}</label>
                    <input
                      id="addstock-shares"
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      placeholder={t("enterShares")}
                      min="0.0001"
                      step="any"
                      className="w-full"
                    />
                    {shares && parseFloat(shares) <= 0 && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{t("sharesMustBePositive")}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="addstock-price" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("purchasePrice")}</label>
                    <input
                      id="addstock-price"
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

                {/* Currency + Date row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="addstock-currency" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("currency")}</label>
                    <select
                      id="addstock-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full"
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
                  <div>
                    <label htmlFor="addstock-date" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t("purchaseDate")}</label>
                    <input
                      id="addstock-date"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
              <button onClick={onClose} className="btn-secondary flex-1 sm:flex-none">
                {t("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!stockName.trim() || !ticker.trim() || !exchange.trim() || !shares || parseFloat(shares) <= 0 || !price || !assetType}
                className="btn-primary flex-1 sm:flex-none sm:ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("addToPortfolio")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
