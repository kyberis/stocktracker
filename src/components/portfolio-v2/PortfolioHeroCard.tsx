"use client";

import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { AssetFilter } from "@/components/dashboard-v2/AssetTypeFilter";
import type { Holding } from "@/lib/types";
import PortfolioPerformanceMatrix from "./PortfolioPerformanceMatrix";
import PortfolioQuoteFreshness from "@/components/PortfolioQuoteFreshness";
import DayMoveAsOf from "@/components/DayMoveAsOf";

interface Props {
  holdings: Holding[];
  assetFilter: AssetFilter;
  refreshKey?: number;
  onRecalculate?: () => void;
  recalculating?: boolean;
  onOpenAi?: () => void;
  totalValue?: number;
  investedValue?: number;
  cashValue?: number;
  onUpdateCash?: () => void;
  dayGainLoss?: number;
  dayGainLossPercent?: number;
  dayChangePctByType?: Partial<Record<AssetFilter, number>>;
  breakdownSlot?: React.ReactNode;
  /** Optional control rendered in the header (e.g. Home "Summary" toggle) */
  headerAction?: React.ReactNode;
  /** When true, hide the footer link to /portfolio chart (e.g. already on /portfolio) */
  hideViewChartLink?: boolean;
  cashEntries?: import("@/lib/types").CashEntry[];
  /**
   * When false, skip O(N) per-ticker `/api/historical` for the aggregated
   * "all portfolios" view (Home Advanced). Default true for AID / portfolio pages.
   */
  allowPerTickerHistorical?: boolean;
}

export default function PortfolioHeroCard({
  holdings,
  assetFilter,
  refreshKey,
  onRecalculate,
  recalculating,
  onOpenAi,
  totalValue,
  investedValue,
  cashValue,
  onUpdateCash,
  dayGainLoss,
  dayGainLossPercent,
  dayChangePctByType,
  breakdownSlot,
  headerAction,
  hideViewChartLink = false,
  cashEntries = [],
  allowPerTickerHistorical = true,
}: Props) {
  const { activePortfolioCurrency, quotes, refreshingTickers, isRefreshing } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const { t } = useI18n();

  const headlineValue = investedValue != null ? investedValue : totalValue;
  const hasInvestedSplit = investedValue != null;
  const hasCash = cashValue != null && cashValue > 0;
  const netWorthValue =
    hasInvestedSplit && cashValue != null ? (headlineValue ?? 0) + cashValue : totalValue;
  const investedEmpty = hasInvestedSplit && (headlineValue ?? 0) <= 0;
  const awaitingQuotes =
    holdings.length > 0 &&
    holdings.some(
      (h) => refreshingTickers.has(h.ticker) || !quotes[h.ticker]?.regularMarketPrice,
    );
  // First stock (or any holdings) with no priced quotes yet — show calculating, not €0.
  const isCalculatingValue =
    investedEmpty &&
    awaitingQuotes &&
    (refreshingTickers.size > 0 || isRefreshing || holdings.some((h) => !quotes[h.ticker]));

  const dayDelta = dayGainLoss ?? 0;
  const dayPct = dayGainLossPercent ?? 0;
  const isPositiveDay = dayDelta >= 0;
  const isFlatDay = Math.abs(dayDelta) < 0.005 && Math.abs(dayPct) < 0.005;

  const dayChangeColor = isFlatDay
    ? "text-[color:var(--muted)]"
    : isPositiveDay
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";
  const dayArrow = isFlatDay ? "•" : isPositiveDay ? "▲" : "▼";

  const hasHeader = headlineValue != null || hasCash;

  return (
    <div className="card relative overflow-hidden rounded-[var(--radius-card)] shadow-[0_16px_32px_rgba(1,6,16,0.28)]">
      {hasHeader && (
        <div className="px-5 pt-5 pb-3">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {t("investedAssets")}
            </div>
            {headerAction}
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2
              className={`text-[34px] font-semibold leading-none tracking-tight tabular-nums ${
                isCalculatingValue || investedEmpty
                  ? "text-[color:var(--muted)]"
                  : "text-[color:var(--foreground)]"
              }`}
              aria-busy={isCalculatingValue || undefined}
            >
              {stealthMode
                ? "•••••"
                : isCalculatingValue
                  ? t("calculatingPortfolioValue")
                  : formatCurrency(headlineValue ?? 0, activePortfolioCurrency)}
            </h2>
            {!investedEmpty && !isCalculatingValue && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${dayChangeColor}`}>
                <span className="text-[10px] leading-none" aria-hidden="true">
                  {dayArrow}
                </span>
                {stealthMode
                  ? "•••"
                  : `${isPositiveDay && !isFlatDay ? "+" : ""}${formatCurrency(dayDelta, activePortfolioCurrency)}`}
                <span>
                  {stealthMode
                    ? ""
                    : `${formatPercent(dayPct)}`}
                </span>
                <span className="ml-0.5 font-normal text-[color:var(--muted)]">
                  <DayMoveAsOf />
                </span>
              </span>
            )}
            {isCalculatingValue && (
              <span className="text-xs text-[color:var(--muted)]">{t("calculatingPortfolioValueHint")}</span>
            )}
            {investedEmpty && !isCalculatingValue && (
              <span className="text-xs text-[color:var(--muted)]">{t("noGainsYetInvestedEmpty")}</span>
            )}
          </div>
          {hasCash && (
            <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
              <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-highlight)] text-[color:var(--foreground)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M9 13h6"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] leading-tight text-[color:var(--muted)]">
                  {t("cashAvailableForInvestment")}
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
                    {stealthMode ? "•••" : formatCurrency(cashValue!, activePortfolioCurrency)}
                  </span>
                  {netWorthValue != null && (
                    <span
                      className="cursor-help border-b border-dashed border-[color:var(--border)] text-[11px] text-[color:var(--muted)]"
                      title={`${t("netWorthInline")}: ${formatCurrency(netWorthValue, activePortfolioCurrency)}`}
                    >
                      {t("netWorthInline")}{" "}
                      {stealthMode ? "•••" : formatCurrency(netWorthValue, activePortfolioCurrency)}
                    </span>
                  )}
                </div>
              </div>
              {onUpdateCash && (
                <button
                  type="button"
                  onClick={onUpdateCash}
                  aria-label={t("updateCashCtaAria")}
                  title={t("updateCashCtaAria")}
                  className="inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-highlight)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-soft)]"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                    />
                  </svg>
                  {t("updateCashCta")}
                </button>
              )}
            </div>
          )}
          {breakdownSlot && <div className="mt-3">{breakdownSlot}</div>}
        </div>
      )}

      <PortfolioQuoteFreshness className="px-5 pb-2" />

      <PortfolioPerformanceMatrix
        holdings={holdings}
        cashEntries={cashEntries}
        refreshKey={refreshKey}
        activeFilter={assetFilter}
        dayChangePctByType={dayChangePctByType}
        allowPerTickerHistorical={allowPerTickerHistorical}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[color:var(--border)] px-5 py-3 text-[11px] text-[color:var(--muted)]">
        <div className="flex items-center gap-3">
          {!hideViewChartLink && (
            <Link
              href="/portfolio?view=chart#chart"
              className="inline-flex items-center gap-1 font-semibold text-blue-400 transition-colors hover:text-blue-300"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 5-7" />
              </svg>
              {t("viewEvolutionChart")}
            </Link>
          )}
          {onRecalculate && (
            <button
              type="button"
              onClick={onRecalculate}
              disabled={recalculating}
              className="inline-flex items-center gap-1 font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={recalculating ? "animate-spin" : ""}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0115.36-6.36L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
              </svg>
              {recalculating ? "Recalculating…" : "Recalculate"}
            </button>
          )}
          {onOpenAi && (
            <button
              type="button"
              onClick={onOpenAi}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-blue-400/18 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-300 transition-colors hover:border-blue-400/34"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
              Ask AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
