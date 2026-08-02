"use client";

import { useI18n } from "@/lib/i18n";

/** Classic empty portfolio CTA — shared by Dashboard and Home v2. */
export default function EmptyPortfolio({ onAddStock }: { onAddStock: () => void }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("emptyStateTitle")}</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">{t("emptyStateSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/import"
          className="group card p-5 flex flex-col items-center text-center hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("emptyStateImport")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateImportDesc")}</p>
        </a>

        <button
          type="button"
          onClick={onAddStock}
          className="group card p-5 flex flex-col items-center text-center hover:border-violet-400 dark:hover:border-violet-500/40 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 mb-3 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t("addStock")}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("emptyStateAddDesc")}</p>
        </button>
      </div>
    </div>
  );
}
