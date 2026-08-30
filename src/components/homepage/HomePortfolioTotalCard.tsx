"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { isPortfolioPricingPending } from "@/lib/portfolio-pricing-pending";
import DayMoveAsOf from "@/components/DayMoveAsOf";
import type { Holding } from "@/lib/types";

interface Props {
  totalValue: number;
  investedValue?: number;
  cashValue?: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  costBasis: number;
  totalReturnPct: number;
  holdingsCount: number;
  holdings?: Holding[];
  onAdvanced: () => void;
}

export default function HomePortfolioTotalCard({
  totalValue,
  investedValue,
  cashValue,
  dayGainLoss,
  dayGainLossPercent,
  costBasis,
  totalReturnPct,
  holdingsCount,
  holdings: holdingsProp,
  onAdvanced,
}: Props) {
  const {
    activePortfolioCurrency,
    holdings: ctxHoldings,
    quotes,
    exchangeRates,
    refreshingTickers,
    isRefreshing,
  } = usePortfolio();
  const { stealthMode } = useStealthMode();
  const { t } = useI18n();

  const holdings = holdingsProp ?? ctxHoldings;
  const invested = investedValue ?? totalValue;
  const liquid = cashValue ?? 0;
  const showSplit = investedValue != null;
  const isPositiveDay = dayGainLoss >= 0;
  const isFlatDay = Math.abs(dayGainLoss) < 0.005 && Math.abs(dayGainLossPercent) < 0.005;
  const isPositiveReturn = totalReturnPct >= 0;

  const investedEmpty = showSplit && invested <= 0;
  const totalsEmpty = totalValue <= 0 && costBasis <= 0;
  const isCalculatingValue =
    (investedEmpty || totalsEmpty) &&
    isPortfolioPricingPending({
      holdings,
      quotes,
      exchangeRates,
      baseCurrency: activePortfolioCurrency,
      refreshingTickers,
      isRefreshing,
    });

  const dayChangeColor = isFlatDay
    ? "text-[color:var(--muted)]"
    : isPositiveDay
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";
  const dayArrow = isFlatDay ? "•" : isPositiveDay ? "▲" : "▼";

  const returnColor = isPositiveReturn
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-500 dark:text-red-400";

  const moneyOrCalculating = (value: number) =>
    stealthMode
      ? "•••••"
      : isCalculatingValue
        ? t("calculatingPortfolioValue")
        : formatCurrency(value, activePortfolioCurrency);

  return (
    <section
      className="card relative overflow-hidden rounded-[var(--radius-card)] shadow-[0_16px_32px_rgba(1,6,16,0.18)]"
      aria-labelledby="home-portfolio-total-label"
      aria-busy={isCalculatingValue || undefined}
    >
      <div
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
          isFlatDay || isCalculatingValue
            ? "bg-[color:var(--muted)]"
            : isPositiveDay
              ? "bg-emerald-500"
              : "bg-red-500"
        }`}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-5 sm:px-6">
        <div className="min-w-0">
          <div
            id="home-portfolio-total-label"
            className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]"
          >
            {t("homeV2PortfolioTotal")} · {activePortfolioCurrency}
          </div>
          <h2
            className={`text-[34px] font-semibold leading-none tracking-tight tabular-nums sm:text-[40px] ${
              isCalculatingValue
                ? "text-[color:var(--muted)]"
                : "text-[color:var(--foreground)]"
            }`}
          >
            {moneyOrCalculating(totalValue)}
          </h2>
          {!isCalculatingValue && (
            <div
              className={`mt-3 inline-flex flex-wrap items-baseline gap-2 text-sm font-medium tabular-nums ${dayChangeColor}`}
            >
              <span className="text-[11px] leading-none" aria-hidden="true">
                {dayArrow}
              </span>
              <span>
                {stealthMode
                  ? "•••"
                  : `${isPositiveDay && !isFlatDay ? "+" : ""}${formatCurrency(dayGainLoss, activePortfolioCurrency)}`}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isFlatDay
                    ? "bg-[color:var(--surface-soft)]"
                    : isPositiveDay
                      ? "bg-emerald-500/10"
                      : "bg-red-500/10"
                }`}
              >
                {stealthMode
                  ? ""
                  : `${formatPercent(dayGainLossPercent)}`}
              </span>
              <span className="font-normal text-[color:var(--muted)]">
                <DayMoveAsOf />
              </span>
            </div>
          )}
          {isCalculatingValue && (
            <p className="mt-3 text-xs text-[color:var(--muted)]">
              {t("calculatingPortfolioValueHint")}
            </p>
          )}
          {showSplit && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
                  {t("homeV2Invested")}
                </dt>
                <dd
                  data-testid="home-invested-value"
                  className={`mt-0.5 text-sm font-semibold tabular-nums ${
                    isCalculatingValue
                      ? "text-[color:var(--muted)]"
                      : "text-[color:var(--foreground)]"
                  }`}
                >
                  {moneyOrCalculating(invested)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
                  {t("homeV2LiquidCash")}
                </dt>
                <dd
                  data-testid="home-liquid-cash"
                  className="mt-0.5 text-sm font-semibold tabular-nums text-[color:var(--foreground)]"
                >
                  {stealthMode ? "•••••" : formatCurrency(liquid, activePortfolioCurrency)}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvanced}
          aria-expanded={false}
          className="inline-flex min-h-11 items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--surface-highlight)]"
        >
          {t("homeV2AdvancedCta")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-[color:var(--border)] px-5 py-4 sm:px-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
            {t("totalCost")}
          </div>
          <div
            data-testid="home-total-cost"
            className={`mt-0.5 text-sm font-medium tabular-nums ${
              isCalculatingValue
                ? "text-[color:var(--muted)]"
                : "text-[color:var(--foreground)]"
            }`}
          >
            {moneyOrCalculating(costBasis)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
            {t("homeV2TotalReturn")}
          </div>
          <div
            className={`mt-0.5 text-sm font-medium tabular-nums ${
              isCalculatingValue ? "text-[color:var(--muted)]" : returnColor
            }`}
          >
            {stealthMode
              ? "•••••"
              : isCalculatingValue
                ? t("calculatingPortfolioValue")
                : `${formatPercent(totalReturnPct)}`}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
            {t("holdings")}
          </div>
          <div className="mt-0.5 text-sm font-medium tabular-nums text-[color:var(--foreground)]">
            {holdingsCount}
          </div>
        </div>
      </div>
    </section>
  );
}
