"use client";

import { useState, useEffect, useMemo } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatCurrency, todayLocal } from "@/lib/utils";
import {
  annualizedReturnPct,
  maturityDateFor,
  maturityValue,
  valueFixedReturnAt,
} from "@/lib/fixed-return";
import type { ManualAssetType } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ASSET_TYPES: { type: ManualAssetType; icon: string; labelKey: string }[] = [
  { type: "real_estate", icon: "🏠", labelKey: "assetTypeRealEstate" },
  { type: "savings", icon: "🏦", labelKey: "assetTypeSavings" },
  { type: "pension", icon: "🏛️", labelKey: "assetTypePension" },
  { type: "fixed_return", icon: "📉", labelKey: "assetTypeFixedReturn" },
];

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "CAD", "AUD", "PLN", "CZK", "HUF"];

export default function AddManualAssetModal({ isOpen, onClose }: Props) {
  const { addCashEntry } = usePortfolio();
  const { t } = useI18n();
  const trapRef = useFocusTrap(isOpen, onClose);

  const [assetType, setAssetType] = useState<ManualAssetType>("savings");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(todayLocal());
  const [termMonths, setTermMonths] = useState("24");
  const [totalReturnPct, setTotalReturnPct] = useState("25");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAssetType("savings");
      setName("");
      setAmount("");
      setCurrency("EUR");
      setNotes("");
      setStartDate(todayLocal());
      setTermMonths("24");
      setTotalReturnPct("25");
      setError(null);
    }
  }, [isOpen]);

  const isFixed = assetType === "fixed_return";

  const preview = useMemo(() => {
    if (!isFixed) return null;
    const principal = parseFloat(amount);
    const term = parseInt(termMonths, 10);
    const ret = parseFloat(totalReturnPct);
    if (!(principal >= 0) || !Number.isFinite(principal) || !(term > 0) || !Number.isFinite(ret) || ret < 0) {
      return null;
    }
    const params = { principal, startDate, termMonths: term, totalReturnPct: ret };
    const maturity = maturityDateFor(params);
    const matValue = maturityValue(params);
    const current = valueFixedReturnAt(params, todayLocal());
    const annualized = annualizedReturnPct(params);
    return { maturity, matValue, current, annualized };
  }, [isFixed, amount, startDate, termMonths, totalReturnPct]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim() || Number.isNaN(parsed) || parsed < 0) return;

    if (isFixed) {
      const term = parseInt(termMonths, 10);
      const ret = parseFloat(totalReturnPct);
      if (!startDate || !(term > 0) || Number.isNaN(ret) || ret < 0) return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isFixed) {
        const term = parseInt(termMonths, 10);
        const ret = parseFloat(totalReturnPct);
        const accrued = valueFixedReturnAt(
          { principal: parsed, startDate, termMonths: term, totalReturnPct: ret },
          todayLocal(),
        );
        await addCashEntry({
          name: name.trim(),
          amountEUR: accrued,
          type: "fixed_return",
          displayCurrency: currency,
          displayAmount: parsed,
          notes: notes.trim(),
          valuationDate: todayLocal(),
          startDate,
          termMonths: term,
          totalReturnPct: ret,
        });
      } else {
        await addCashEntry({
          name: name.trim(),
          amountEUR: parsed,
          type: assetType,
          displayCurrency: currency,
          displayAmount: parsed,
          notes: notes.trim(),
          valuationDate: todayLocal(),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = (() => {
    if (!name.trim() || !amount || submitting) return false;
    if (!isFixed) return true;
    const term = parseInt(termMonths, 10);
    const ret = parseFloat(totalReturnPct);
    return !!startDate && term > 0 && !Number.isNaN(ret) && ret >= 0;
  })();

  const namePlaceholder =
    assetType === "real_estate" ? "e.g. Apartment — Berlin Mitte"
      : assetType === "pension" ? "e.g. Riester Rente — Allianz"
        : assetType === "fixed_return" ? "e.g. Civislend"
          : "e.g. ING Tagesgeld";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("addManualAsset")}
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-[480px] max-w-[92vw] max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in slide-in-from-bottom-2"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
          {t("addManualAsset")}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {ASSET_TYPES.map(({ type, icon, labelKey }) => (
            <button
              key={type}
              onClick={() => setAssetType(type)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                assetType === type
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs font-semibold">{t(labelKey as Parameters<typeof t>[0])}</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
            {t("assetName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
            className="w-full"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-[1fr_100px] gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
              {isFixed ? t("fixedReturnPrincipal") : t("currentValue")}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
              &nbsp;
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {isFixed && (
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                  {t("fixedReturnStartDate")}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                  {t("fixedReturnTermMonths")}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
                {t("fixedReturnTotalPct")}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={totalReturnPct}
                onChange={(e) => setTotalReturnPct(e.target.value)}
                placeholder="25"
                className="w-full"
              />
            </div>
            {preview && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs space-y-1 text-gray-600 dark:text-slate-300">
                <div className="flex justify-between gap-2">
                  <span>{t("fixedReturnMaturityDate")}</span>
                  <span className="font-semibold tabular-nums">{preview.maturity ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{t("fixedReturnMaturityValue")}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(preview.matValue, currency)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{t("fixedReturnCurrentValue")}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(preview.current, currency)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>{t("fixedReturnAnnualized")}</span>
                  <span className="font-semibold tabular-nums">{preview.annualized.toFixed(2)}%</span>
                </div>
                <p className="pt-1 text-[11px] text-gray-400 dark:text-slate-500">
                  {t("fixedReturnDisclaimer")}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
            {t("assetNotes")}{" "}
            <span className="font-normal text-gray-400 dark:text-slate-500">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("assetNotesPlaceholder")}
            rows={2}
            className="w-full resize-none text-sm"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button className="btn-secondary text-sm px-4 py-2" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            className="btn-primary text-sm px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? "…" : t("addAsset")}
          </button>
        </div>
      </div>
    </div>
  );
}
