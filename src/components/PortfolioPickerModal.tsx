"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";

interface PortfolioPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (portfolioId: string) => void;
}

export default function PortfolioPickerModal({ isOpen, onClose, onSelect }: PortfolioPickerModalProps) {
  const { portfolios, setActivePortfolio } = usePortfolio();
  const { t } = useI18n();

  if (!isOpen) return null;

  function handlePick(id: string) {
    setActivePortfolio(id);
    onSelect(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden" role="dialog" aria-modal="true" aria-label={t("selectPortfolioFirst")}>
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t("selectPortfolioFirst")}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("selectPortfolioFirstDesc")}</p>
        </div>
        <div className="px-3 pb-3 space-y-1 max-h-[50vh] overflow-y-auto">
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePick(p.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{p.currency ?? "EUR"}{p.isDefault ? ` · ${t("defaultLabel")}` : ""}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700">
          <button onClick={onClose} className="w-full py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
