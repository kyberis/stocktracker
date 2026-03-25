"use client";

import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface Props {
  totalValue: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  totalGainLossPercent: number;
  currency: string;
}

export default function PortfolioHeader({
  totalValue,
  dayGainLoss,
  dayGainLossPercent,
  totalGainLossPercent,
  currency,
}: Props) {
  const { t } = useI18n();
  const { stealthMode } = useStealthMode();

  const isPositiveDay = dayGainLoss >= 0;
  const isPositiveTotal = totalGainLossPercent >= 0;

  return (
    <div className="pb-4">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1.5">
        {t("portfolioValue")}
      </p>
      <div className="flex items-baseline gap-4 flex-wrap">
        <h1 className="text-[36px] font-extrabold tracking-tight leading-none text-gray-900 dark:text-white tabular-nums">
          {stealthMode ? "•••••" : formatCurrency(totalValue, currency)}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg ${
              isPositiveDay
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-500 dark:text-red-400"
            }`}
          >
            {stealthMode
              ? "•••"
              : `${isPositiveDay ? "+" : ""}${formatCurrency(dayGainLoss, currency)} (${formatPercent(dayGainLossPercent)})`}
          </span>
          <span className="text-[13px] text-gray-500 dark:text-slate-400">
            <span
              className={`font-semibold ${
                isPositiveTotal
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {stealthMode ? "•••" : formatPercent(totalGainLossPercent)}
            </span>{" "}
            {t("totalGainLabel")}
          </span>
        </div>
      </div>
    </div>
  );
}
