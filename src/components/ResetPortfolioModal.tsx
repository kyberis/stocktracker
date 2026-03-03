"use client";

import { useState } from "react";
import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";

interface ResetPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResetPortfolioModal({ isOpen, onClose }: ResetPortfolioModalProps) {
  const { t } = useI18n();
  const { refreshQuotes } = usePortfolio();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async (mode: "empty" | "seed") => {
    setLoading(true);
    try {
      const res = await fetch("/api/reset-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setDone(true);
        await refreshQuotes();
        setTimeout(() => {
          setDone(false);
          onClose();
          window.location.reload();
        }, 1500);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("resetPortfolio")}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("resetPortfolioDesc")}</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <button
                onClick={() => handleReset("empty")}
                disabled={loading}
                className="w-full btn-danger text-sm py-2.5 disabled:opacity-50"
              >
                {t("resetPortfolioEmpty")}
              </button>
              <button
                onClick={() => handleReset("seed")}
                disabled={loading}
                className="w-full btn-secondary text-sm py-2.5 disabled:opacity-50"
              >
                {t("resetPortfolioSeed")}
              </button>
            </div>

            <button onClick={onClose} className="w-full btn-secondary text-sm">
              {t("cancel")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
