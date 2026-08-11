"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";

/**
 * Shows the active portfolio name. Multi-portfolio create / All / switcher
 * were removed — each account has a single portfolio.
 */
export default function GlobalPortfolioSelector() {
  const { portfolios, activePortfolioId } = usePortfolio();
  const { t } = useI18n();

  if (portfolios.length === 0) return null;

  const active =
    (activePortfolioId ? portfolios.find((p) => p.id === activePortfolioId) : null) ??
    portfolios.find((p) => p.isDefault) ??
    portfolios[0];

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 max-w-[200px]"
      title={active.name}
    >
      <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
      <span className="truncate">{active.name || t("portfolio")}</span>
      <span className="shrink-0 text-[9px] font-bold tracking-wide px-1 py-px rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        {active.currency ?? "EUR"}
      </span>
    </div>
  );
}
