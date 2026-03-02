"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n";
import type { SearchResult } from "@/lib/types";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddStockModal({ isOpen, onClose }: AddStockModalProps) {
  const { addHolding } = usePortfolio();
  const { provider, getApiHeaders, trackAvCalls } = useSettings();
  const { t } = useI18n();
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
      setStockName("");
      setTicker("");
      setShares("");
      setPrice("");
      setCurrency("USD");
      setExchange("");
    }
  }, [isOpen]);

  const searchStocks = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q, provider });
      const headers = getApiHeaders();
      const res = await fetch(`/api/search?${params}`, { headers });
      trackAvCalls(res);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [provider, getApiHeaders, trackAvCalls]);

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
    setResults([]);
  };

  const handleSubmit = () => {
    if (!stockName.trim() || !ticker.trim() || !exchange.trim() || !shares || !price) return;

    addHolding({
      name: stockName.trim(),
      ticker: ticker.trim().toUpperCase(),
      isin: "",
      shares: parseFloat(shares),
      purchasePrice: parseFloat(price),
      displayCurrency: currency,
      exchange: exchange.trim().toUpperCase(),
      valueInEUR: 0,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-5">{t("addStock")}</h2>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-1.5">{t("search")}</label>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full"
            />
            {searching && (
              <div className="absolute right-3 top-9">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              </div>
            )}
            {results.length > 0 && !selected && (
              <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-white">{r.symbol}</span>
                      <span className="text-slate-400 text-sm ml-2">{r.shortname}</span>
                    </div>
                    <span className="text-xs text-slate-500">{r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(selected || stockName || ticker) && (
            <div className="bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700">
              <span className="text-blue-400 font-medium">{ticker || t("ticker")}</span>
              <span className="text-slate-300 text-sm ml-2">{stockName || t("name")}</span>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">{t("name")}</label>
            <input
              type="text"
              value={stockName}
              onChange={(e) => setStockName(e.target.value)}
              placeholder={t("name")}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">{t("ticker")}</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder={t("ticker")}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">{t("editExchange")}</label>
            <input
              type="text"
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              placeholder={t("editExchange")}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">{t("shares")}</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder={t("enterShares")}
              min="0"
              step="any"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">{t("purchasePrice")}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("enterPrice")}
              min="0"
              step="any"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">{t("currency")}</label>
            <select
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
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!stockName.trim() || !ticker.trim() || !exchange.trim() || !shares || !price}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("addToPortfolio")}
          </button>
        </div>
      </div>
    </div>
  );
}
