"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import type { PriceAlert, QuoteData, SearchResult, AlertCondition } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";

export default function PriceAlerts() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { provider, getApiHeaders, trackAvCalls } = useSettings();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [limit, setLimit] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [condition, setCondition] = useState<AlertCondition>("below");
  const [threshold, setThreshold] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/alerts");
    if (res.ok) {
      const data = await res.json();
      setAlerts(data.alerts);
      setActiveCount(data.activeCount);
      setLimit(data.limit);
      setIsPro(data.isPro);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const tickers = [...new Set(alerts.map((a) => a.ticker))].join(",");
    const headers = getApiHeaders();
    fetch(`/api/quote?symbols=${tickers}&provider=${provider}`, { headers })
      .then((r) => {
        trackAvCalls(r);
        return r.ok ? r.json() : {};
      })
      .then(setQuotes);
  }, [alerts, provider, getApiHeaders, trackAvCalls]);

  const searchStocks = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&provider=${provider}`,
          { headers: getApiHeaders() }
        );
        trackAvCalls(res);
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
      }
    },
    [provider, getApiHeaders, trackAvCalls]
  );

  let searchTimeout: ReturnType<typeof setTimeout>;
  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchStocks(val), 300);
  };

  const handleSelectStock = (r: SearchResult) => {
    setSelectedStock(r);
    setQuery("");
    setResults([]);
    setThreshold("");
    setFormError("");
  };

  const handleCreateAlert = async () => {
    if (!selectedStock) return;
    const num = parseFloat(threshold);
    if (isNaN(num) || num <= 0) {
      setFormError(t("alertThresholdInvalid"));
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      const quote = quotes[selectedStock.symbol];
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selectedStock.symbol,
          name: selectedStock.shortname,
          condition,
          threshold: num,
          currency: quote?.currency || "USD",
        }),
      });
      if (res.ok) {
        setSelectedStock(null);
        setThreshold("");
        fetchAlerts();
      } else {
        const data = await res.json().catch(() => null);
        if (data?.reason === "alert_limit_reached") {
          setLimitReached(true);
        } else {
          setFormError(data?.error || "Failed to create alert.");
        }
      }
    } catch {
      setFormError("Network error.");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setActiveCount((c) => Math.max(0, c - 1));
    setLimitReached(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    const res = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    if (res.ok) {
      fetchAlerts();
    } else {
      const data = await res.json().catch(() => null);
      if (data?.reason === "alert_limit_reached") {
        setLimitReached(true);
      }
    }
  };

  const canCreate = isPro || (limit !== null && activeCount < limit);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("priceAlerts")}
          </h3>
          {limit !== null && (
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {activeCount}/{limit} {t("alertsUsed")}
            </span>
          )}
          {isPro && (
            <span className="text-xs text-emerald-500">
              {t("proBadge")} — {t("alertsUnlimited")}
            </span>
          )}
        </div>

        {/* Create alert form */}
        {canCreate && !selectedStock && (
          <div className="relative mb-4">
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={t("alertSearchPlaceholder")}
              className="w-full text-sm"
            />
            {searching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
              </div>
            )}
            {results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelectStock(r)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {r.symbol}
                      </span>
                      <span className="text-gray-500 dark:text-slate-400 ml-2">
                        {r.shortname}
                      </span>
                    </div>
                    <span className="text-emerald-500 text-[10px]">
                      + {t("alertCreate")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedStock && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedStock.shortname}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  {selectedStock.symbol} · {selectedStock.exchange}
                </p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AlertCondition)}
                className="text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5"
              >
                <option value="below">{t("alertBelow")}</option>
                <option value="above">{t("alertAbove")}</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={t("alertThresholdPlaceholder")}
                className="flex-1 text-sm"
              />
              <button
                onClick={handleCreateAlert}
                disabled={creating || !threshold}
                className="btn-primary text-xs whitespace-nowrap disabled:opacity-40"
              >
                {creating ? t("loading") : t("alertCreate")}
              </button>
            </div>

            {formError && (
              <p className="text-xs text-red-500">{formError}</p>
            )}
          </div>
        )}

        {/* Limit reached paywall */}
        {(limitReached || (!canCreate && !isPro)) && (
          <div className="mb-4">
            <ProCompareCard
              surface="alerts_limit"
              reason="upgrade_required"
            />
          </div>
        )}

        {/* Alerts list */}
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">
            {t("noAlerts")}
          </p>
        ) : (
          <div className="space-y-1">
            {alerts.map((alert) => {
              const q = quotes[alert.ticker];
              const conditionMet =
                q &&
                ((alert.condition === "above" &&
                  q.regularMarketPrice >= alert.threshold) ||
                  (alert.condition === "below" &&
                    q.regularMarketPrice <= alert.threshold));

              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    alert.triggered
                      ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                      : "bg-gray-50 dark:bg-slate-700/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        alert.triggered
                          ? "bg-amber-100 dark:bg-amber-500/20"
                          : alert.active
                            ? "bg-emerald-100 dark:bg-emerald-500/20"
                            : "bg-gray-200 dark:bg-slate-600"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 ${
                          alert.triggered
                            ? "text-amber-600 dark:text-amber-400"
                            : alert.active
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-400 dark:text-slate-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {alert.name || alert.ticker}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        {alert.condition === "above"
                          ? t("alertAbove")
                          : t("alertBelow")}{" "}
                        {alert.currency} {alert.threshold.toFixed(2)}
                        {alert.triggered && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">
                            — {t("alertTriggered")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {q && (
                      <div className="text-right">
                        <p
                          className={`text-xs font-mono font-medium ${
                            conditionMet
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {formatCurrency(q.regularMarketPrice, q.currency)}
                        </p>
                      </div>
                    )}

                    {!alert.triggered && (
                      <button
                        onClick={() =>
                          handleToggle(alert.id, !alert.active)
                        }
                        title={
                          alert.active
                            ? t("alertPause")
                            : t("alertResume")
                        }
                        className={`p-1 rounded ${
                          alert.active
                            ? "text-emerald-500 hover:text-emerald-700"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          {alert.active ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          )}
                        </svg>
                      </button>
                    )}

                    {alert.triggered && (
                      <button
                        onClick={() => handleToggle(alert.id, true)}
                        title={t("alertReactivate")}
                        className="text-amber-500 hover:text-amber-700 p-1 rounded"
                      >
                        <svg
                          className="w-4 h-4"
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
                    )}

                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Email alerts hint for Pro */}
        {isPro && user?.emailVerified && (
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-3">
            {t("alertEmailEnabled")}
          </p>
        )}
        {isPro && user?.email && !user?.emailVerified && (
          <p className="text-[10px] text-amber-500 mt-3">
            {t("alertEmailVerifyHint")}
          </p>
        )}
      </div>
    </div>
  );
}
