"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ManualAssetType } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ASSET_TYPES: { type: ManualAssetType; icon: string; labelKey: string }[] = [
  { type: "real_estate", icon: "🏠", labelKey: "assetTypeRealEstate" },
  { type: "savings", icon: "🏦", labelKey: "assetTypeSavings" },
  { type: "pension", icon: "🏛️", labelKey: "assetTypePension" },
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAssetType("savings");
      setName("");
      setAmount("");
      setCurrency("EUR");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim() || Number.isNaN(parsed) || parsed < 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await addCashEntry({
        name: name.trim(),
        amountEUR: parsed,
        type: assetType,
        displayCurrency: currency,
        displayAmount: parsed,
        notes: notes.trim(),
        valuationDate: new Date().toISOString().slice(0, 10),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("addManualAsset")}
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-[440px] max-w-[92vw] shadow-xl animate-in fade-in slide-in-from-bottom-2"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
          {t("addManualAsset")}
        </h2>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2 mb-5">
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

        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
            {t("assetName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              assetType === "real_estate" ? "e.g. Apartment — Berlin Mitte"
                : assetType === "pension" ? "e.g. Riester Rente — Allianz"
                  : "e.g. ING Tagesgeld"
            }
            className="w-full"
            autoFocus
          />
        </div>

        {/* Value + Currency */}
        <div className="grid grid-cols-[1fr_100px] gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
              {t("currentValue")}
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

        {/* Notes */}
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button className="btn-secondary text-sm px-4 py-2" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            className="btn-primary text-sm px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!name.trim() || !amount || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "…" : t("addAsset")}
          </button>
        </div>
      </div>
    </div>
  );
}
