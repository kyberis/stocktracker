"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ResetPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResetPortfolioModal({ isOpen, onClose }: ResetPortfolioModalProps) {
  const { t } = useI18n();
  const { refreshHoldings, activePortfolioId, portfolios } = usePortfolio();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const activeName =
    portfolios.find((p) => p.id === activePortfolioId)?.name?.trim() ||
    t("resetPortfolioDefaultName");

  const nameMatches =
    confirmName.trim().length > 0 &&
    confirmName.trim().toLowerCase() === activeName.toLowerCase();

  const handleReset = async () => {
    if (!nameMatches) return;
    setLoading(true);
    setError(null);
    try {
      const qp = activePortfolioId ? `?portfolioId=${encodeURIComponent(activePortfolioId)}` : "";
      const res = await fetch(`/api/reset-portfolio${qp}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "empty" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Reset failed. Please try again.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => {
        refreshHoldings();
        onClose();
      }, 1200);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const focusTrapRef = useFocusTrap(isOpen, loading ? undefined : onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="reset-modal-title" className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
        {done ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t("resetPortfolioSuccess")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 id="reset-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">{t("resetPortfolio")}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("resetPortfolioDesc")}</p>
              </div>
            </div>

            <label className="block text-xs text-gray-600 dark:text-slate-300 mb-1.5">
              {t("resetPortfolioTypeName").replace("{name}", activeName)}
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              className="w-full mb-4 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={activeName}
            />

            <div className="space-y-2 mb-5">
              <button
                onClick={() => handleReset()}
                disabled={loading || !nameMatches}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t("resetPortfolioWorking") : t("resetPortfolioConfirm")}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                {t("cancel")}
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
