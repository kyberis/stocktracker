"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAlerts } from "@/lib/hooks/use-api";
import { usePortfolio } from "@/lib/portfolio-context";
import type { AlertCondition, AlertType, PercentBasis, QuoteData } from "@/lib/types";

interface AlertFormProps {
  ticker: string;
  name: string;
  exchange?: string;
  source: string;
  quote?: QuoteData;
  presetAlertType?: AlertType;
  portfolioWideOnly?: boolean;
  onCreated?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export default function AlertForm({
  ticker,
  name,
  exchange,
  source,
  quote,
  presetAlertType,
  portfolioWideOnly = false,
  onCreated,
  onCancel,
  compact = false,
}: AlertFormProps) {
  const { t } = useI18n();
  const { mutate: mutateAlerts } = useAlerts();
  const { refreshAlertedTickers } = usePortfolio();

  const [alertType, setAlertType] = useState<AlertType>(presetAlertType ?? "threshold");
  const [condition, setCondition] = useState<AlertCondition>("below");
  const [threshold, setThreshold] = useState("");
  const [percentBasis, setPercentBasis] = useState<PercentBasis>("daily");
  const [percentValue, setPercentValue] = useState(portfolioWideOnly ? "5" : "");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreate = useCallback(async () => {
    if (alertType === "threshold") {
      const num = parseFloat(threshold);
      if (isNaN(num) || num <= 0) {
        setFormError(t("alertThresholdInvalid"));
        return;
      }
      setCreating(true);
      setFormError("");
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            name,
            condition,
            threshold: num,
            currency: quote?.currency || "USD",
            alertType: "threshold",
            source,
          }),
        });
        if (res.ok) {
          mutateAlerts();
          refreshAlertedTickers();
          onCreated?.();
        } else {
          const data = await res.json().catch(() => null);
          setFormError(data?.error || "Failed to create alert.");
        }
      } catch {
        setFormError("Network error.");
      }
      setCreating(false);
    } else {
      const pct = parseFloat(percentValue);
      if (isNaN(pct) || pct <= 0) {
        setFormError(t("alertPercentInvalid"));
        return;
      }
      setCreating(true);
      setFormError("");
      try {
        const isWide = portfolioWideOnly;
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: isWide ? "" : ticker,
            name: isWide ? "" : name,
            condition: "above",
            alertType: "percent_change",
            percentBasis,
            percentValue: pct,
            isPortfolioWide: isWide,
            source,
          }),
        });
        if (res.ok) {
          mutateAlerts();
          refreshAlertedTickers();
          onCreated?.();
        } else {
          const data = await res.json().catch(() => null);
          setFormError(data?.error || "Failed to create alert.");
        }
      } catch {
        setFormError("Network error.");
      }
      setCreating(false);
    }
  }, [alertType, threshold, percentValue, condition, percentBasis, ticker, name, quote, source, portfolioWideOnly, t, mutateAlerts, refreshAlertedTickers, onCreated]);

  const cardClass = compact
    ? "space-y-2"
    : "p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl space-y-3";

  return (
    <div className={cardClass}>
      {/* Alert type tabs */}
      {!presetAlertType && !portfolioWideOnly && (
        <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
          <button
            onClick={() => setAlertType("threshold")}
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
      )}

      {/* Percentage basis selector */}
      {alertType === "percent_change" && !portfolioWideOnly && (
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
      )}

      {/* Stock info header (non-compact) */}
      {!compact && !portfolioWideOnly && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">
              {ticker}{exchange ? ` · ${exchange}` : ""}
            </p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Cancel">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Threshold form */}
      {alertType === "threshold" && (
        <div className="flex items-center gap-2">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as AlertCondition)}
            aria-label={`${t("alertBelow")} / ${t("alertAbove")}`}
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
            aria-label={t("alertThresholdPlaceholder")}
            className="flex-1 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !threshold}
            className="btn-primary text-xs whitespace-nowrap disabled:opacity-40"
          >
            {creating ? t("loading") : t("alertCreate")}
          </button>
        </div>
      )}

      {/* Percentage form */}
      {alertType === "percent_change" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-slate-400">±</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={percentValue}
            onChange={(e) => setPercentValue(e.target.value)}
            placeholder={t("alertPercentPlaceholder")}
            aria-label={t("alertPercentPlaceholder")}
            className="flex-1 text-sm"
          />
          <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
          <button
            onClick={handleCreate}
            disabled={creating || !percentValue}
            className="btn-primary text-xs whitespace-nowrap disabled:opacity-40"
          >
            {creating ? t("loading") : t("alertCreate")}
          </button>
        </div>
      )}

      {formError && <p className="text-xs text-red-500">{formError}</p>}
    </div>
  );
}
