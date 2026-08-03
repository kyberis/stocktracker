"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/utils";
import { parseLocaleNumber } from "@/lib/portfolio/locale-number";
import { useAlerts } from "@/lib/hooks/use-api";
import type { QuoteData, SearchResult, AlertCondition, AlertType, PercentBasis } from "@/lib/types";
import ProCompareCard from "@/components/ProCompareCard";

function AlertVerifyHint({ t }: { t: (key: string) => string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    if (sending || sent) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      if (res.ok) setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <p className="text-[10px] text-amber-500">
        {t("alertEmailVerifyHint")}
      </p>
      <button
        onClick={handleResend}
        disabled={sending || sent}
        className="text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 disabled:opacity-50 disabled:no-underline whitespace-nowrap"
      >
        {sent ? t("verificationEmailSent") : sending ? t("loading") : t("sendVerificationEmail")}
      </button>
    </div>
  );
}

function AlertDescription({ alert, t }: { alert: { alertType: AlertType; condition: AlertCondition; threshold: number; currency: string; percentBasis: PercentBasis | ""; percentValue: number; isPortfolioWide: boolean; triggered: boolean }; t: (k: string) => string }) {
  if (alert.alertType === "percent_change") {
    const basis = alert.percentBasis === "daily" ? t("alertBasisDaily") : t("alertBasisPurchase");
    return (
      <span>
        {alert.isPortfolioWide ? t("alertPortfolioWide") : ""} ±{alert.percentValue}% ({basis})
        {alert.triggered && (
          <span className="ml-1 text-amber-600 dark:text-amber-400">— {t("alertTriggered")}</span>
        )}
      </span>
    );
  }
  return (
    <span>
      {alert.condition === "above" ? t("alertAbove") : t("alertBelow")}{" "}
      {alert.currency} {alert.threshold.toFixed(2)}
      {alert.triggered && (
        <span className="ml-1 text-amber-600 dark:text-amber-400">— {t("alertTriggered")}</span>
      )}
    </span>
  );
}

export default function PriceAlerts() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { getApiHeaders } = useSettings();
  const { data, mutate } = useAlerts();

  const alerts = data?.alerts ?? [];
  const activeCount = data?.activeCount ?? 0;
  const limit = data?.limit ?? null;
  const isPro = data?.isPro ?? false;

  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});

  const [alertType, setAlertType] = useState<AlertType>("threshold");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [condition, setCondition] = useState<AlertCondition>("below");
  const [threshold, setThreshold] = useState("");
  const [percentBasis, setPercentBasis] = useState<PercentBasis>("daily");
  const [percentValue, setPercentValue] = useState("");
  const [isPortfolioWide, setIsPortfolioWide] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (alerts.length === 0) return;
    const tickers = [...new Set(alerts.filter((a) => a.ticker !== "__PORTFOLIO__").map((a) => a.ticker))].join(",");
    if (!tickers) return;
    const headers = getApiHeaders();
    fetch(`/api/quote?symbols=${tickers}`, { headers })
      .then((r) => r.ok ? r.json() : {})
      .then(setQuotes);
  }, [alerts, getApiHeaders]);

  const searchStocks = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}`,
          { headers: getApiHeaders() }
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
      }
    },
    [getApiHeaders]
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
    setPercentValue("");
    setFormError("");
  };

  const handleCreateAlert = async () => {
    if (alertType === "threshold") {
      if (!selectedStock) return;
      const num = parseLocaleNumber(threshold);
      if (num == null || num <= 0) {
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
            alertType: "threshold",
          }),
        });
        if (res.ok) {
          setSelectedStock(null);
          setThreshold("");
          mutate();
        } else {
          const data = await res.json().catch(() => null);
          if (data?.reason === "alert_limit_reached") setLimitReached(true);
          else setFormError(data?.error || "Failed to create alert.");
        }
      } catch { setFormError("Network error."); }
      setCreating(false);
    } else {
      const pct = parseLocaleNumber(percentValue);
      if (pct == null || pct <= 0) {
        setFormError(t("alertPercentInvalid"));
        return;
      }
      if (!isPortfolioWide && !selectedStock) {
        setFormError(t("alertSearchPlaceholder"));
        return;
      }
      setCreating(true);
      setFormError("");
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: isPortfolioWide ? "" : selectedStock!.symbol,
            name: isPortfolioWide ? "" : selectedStock!.shortname,
            condition: "above",
            alertType: "percent_change",
            percentBasis,
            percentValue: pct,
            isPortfolioWide,
          }),
        });
        if (res.ok) {
          setSelectedStock(null);
          setPercentValue("");
          setIsPortfolioWide(false);
          mutate();
        } else {
          const data = await res.json().catch(() => null);
          if (data?.reason === "alert_limit_reached") setLimitReached(true);
          else setFormError(data?.error || "Failed to create alert.");
        }
      } catch { setFormError("Network error."); }
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    setLimitReached(false);
    mutate();
  };

  const handleToggle = async (id: string, active: boolean) => {
    const res = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    if (res.ok) {
      mutate();
    } else {
      const data = await res.json().catch(() => null);
      if (data?.reason === "alert_limit_reached") setLimitReached(true);
    }
  };

  const canCreate = isPro || (limit !== null && activeCount < limit);

  const needsStock = alertType === "threshold" || (alertType === "percent_change" && !isPortfolioWide);

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

        {canCreate && (
          <div className="mb-4 space-y-3">
            {/* Alert type tabs */}
            <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => { setAlertType("threshold"); setIsPortfolioWide(false); }}
                className={`flex-1 text-xs py-1.5 font-medium transition-colors ${alertType === "threshold" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"}`}
              >
                {t("alertTypeThreshold")}
              </button>
              <button
                onClick={() => setAlertType("percent_change")}
                className={`flex-1 text-xs py-1.5 font-medium transition-colors ${alertType === "percent_change" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600"}`}
              >
                {t("alertTypePercent")}
              </button>
            </div>

            {/* Percentage-specific options */}
            {alertType === "percent_change" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPercentBasis("daily")}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${percentBasis === "daily" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300"}`}
                  >
                    {t("alertBasisDaily")}
                  </button>
                  <button
                    onClick={() => setPercentBasis("purchase")}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${percentBasis === "purchase" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300"}`}
                  >
                    {t("alertBasisPurchase")}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPortfolioWide}
                    onChange={(e) => { setIsPortfolioWide(e.target.checked); if (e.target.checked) setSelectedStock(null); }}
                    className="rounded border-gray-300 dark:border-slate-500 text-emerald-500 focus:ring-emerald-500"
                  />
                  {t("alertPortfolioWide")}
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">
                    — {t("alertPortfolioWideDesc")}
                  </span>
                </label>
              </div>
            )}

            {/* Stock search */}
            {needsStock && !selectedStock && (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={t("alertSearchPlaceholder")}
                  aria-label={t("alertSearchPlaceholder")}
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
                          <span className="font-medium text-gray-900 dark:text-white">{r.symbol}</span>
                          <span className="text-gray-500 dark:text-slate-400 ml-2">{r.shortname}</span>
                        </div>
                        <span className="text-emerald-500 text-[10px]">+ {t("alertCreate")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Threshold form */}
            {alertType === "threshold" && selectedStock && (
              <div className="p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedStock.shortname}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{selectedStock.symbol} · {selectedStock.exchange}</p>
                  </div>
                  <button onClick={() => setSelectedStock(null)} className="text-gray-400 hover:text-gray-600" aria-label="Clear selection">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select value={condition} onChange={(e) => setCondition(e.target.value as AlertCondition)} aria-label={t("alertBelow") + " / " + t("alertAbove")} className="text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5">
                    <option value="below">{t("alertBelow")}</option>
                    <option value="above">{t("alertAbove")}</option>
                  </select>
                  <input type="number" step="0.01" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={t("alertThresholdPlaceholder")} aria-label={t("alertThresholdPlaceholder")} className="flex-1 text-sm" />
                  <button onClick={handleCreateAlert} disabled={creating || !threshold} className="btn-primary text-xs whitespace-nowrap disabled:opacity-40">
                    {creating ? t("loading") : t("alertCreate")}
                  </button>
                </div>
                {formError && <p className="text-xs text-red-500">{formError}</p>}
              </div>
            )}

            {/* Percentage form */}
            {alertType === "percent_change" && (selectedStock || isPortfolioWide) && (
              <div className="p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl space-y-3">
                {selectedStock && !isPortfolioWide && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedStock.shortname}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{selectedStock.symbol} · {selectedStock.exchange}</p>
                    </div>
                    <button onClick={() => setSelectedStock(null)} className="text-gray-400 hover:text-gray-600" aria-label="Clear selection">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-slate-400">±</span>
                  <input type="number" step="0.1" min="0" value={percentValue} onChange={(e) => setPercentValue(e.target.value)} placeholder={t("alertPercentPlaceholder")} aria-label={t("alertPercentPlaceholder")} className="flex-1 text-sm" />
                  <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
                  <button onClick={handleCreateAlert} disabled={creating || !percentValue} className="btn-primary text-xs whitespace-nowrap disabled:opacity-40">
                    {creating ? t("loading") : t("alertCreate")}
                  </button>
                </div>
                {formError && <p className="text-xs text-red-500">{formError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Limit reached paywall */}
        {(limitReached || (!canCreate && !isPro)) && (
          <div className="mb-4">
            <ProCompareCard surface="alerts_limit" reason="upgrade_required" />
          </div>
        )}

        {/* Alerts list */}
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">{t("noAlerts")}</p>
        ) : (
          <div className="space-y-1">
            {alerts.map((alert) => {
              const q = alert.ticker !== "__PORTFOLIO__" ? quotes[alert.ticker] : undefined;
              const conditionMet = alert.alertType === "threshold" && q &&
                ((alert.condition === "above" && q.regularMarketPrice >= alert.threshold) ||
                 (alert.condition === "below" && q.regularMarketPrice <= alert.threshold));
              const isPending = alert.active && !alert.triggered;
              const isTriggered = alert.triggered;

              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    isTriggered
                      ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                      : conditionMet
                        ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20"
                        : "bg-gray-50 dark:bg-slate-700/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isTriggered ? "bg-amber-100 dark:bg-amber-500/20"
                      : conditionMet ? "bg-orange-100 dark:bg-orange-500/20"
                      : isPending ? "bg-emerald-100 dark:bg-emerald-500/20"
                      : "bg-gray-200 dark:bg-slate-600"
                    }`}>
                      {alert.alertType === "percent_change" ? (
                        <svg className={`w-4 h-4 ${isTriggered ? "text-amber-600 dark:text-amber-400" : conditionMet ? "text-orange-600 dark:text-orange-400" : isPending ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className={`w-4 h-4 ${isTriggered ? "text-amber-600 dark:text-amber-400" : conditionMet ? "text-orange-600 dark:text-orange-400" : isPending ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          {alert.isPortfolioWide ? t("alertPortfolioWide") : (alert.name || alert.ticker)}
                        </p>
                        {isTriggered && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                            {t("alertTriggered")}
                          </span>
                        )}
                        {!isTriggered && conditionMet && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                            {t("alertConditionMet")}
                          </span>
                        )}
                        {isPending && !conditionMet && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                            {t("alertPending")}
                          </span>
                        )}
                        {!alert.active && !isTriggered && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                            {t("alertPaused")}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        <AlertDescription alert={alert} t={t} />
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {q && (
                      <div className="text-right">
                        <p className={`text-xs font-mono font-medium ${conditionMet ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}>
                          {formatCurrency(q.regularMarketPrice, q.currency)}
                        </p>
                      </div>
                    )}

                    {!alert.triggered && (
                      <button
                        onClick={() => handleToggle(alert.id, !alert.active)}
                        title={alert.active ? t("alertPause") : t("alertResume")}
                        aria-label={alert.active ? t("alertPause") : t("alertResume")}
                        className={`p-1 rounded ${alert.active ? "text-emerald-500 hover:text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          {alert.active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                    )}

                    {alert.triggered && (
                      <button onClick={() => handleToggle(alert.id, true)} title={t("alertReactivate")} aria-label={t("alertReactivate")} className="text-amber-500 hover:text-amber-700 p-1 rounded">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}

                    <button onClick={() => handleDelete(alert.id)} className="text-red-400 hover:text-red-600 p-1" aria-label="Delete alert">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
          <AlertVerifyHint t={t} />
        )}
      </div>
    </div>
  );
}
