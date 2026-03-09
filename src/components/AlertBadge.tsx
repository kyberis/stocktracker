"use client";

import { usePortfolio } from "@/lib/portfolio-context";
import { useI18n } from "@/lib/i18n";

interface AlertBadgeProps {
  ticker: string;
  className?: string;
}

export default function AlertBadge({ ticker, className = "" }: AlertBadgeProps) {
  const { alertedTickers } = usePortfolio();
  const { t } = useI18n();
  const hasAlert = alertedTickers.has(ticker);

  if (!hasAlert) return null;

  return (
    <span
      title={t("alertActiveForTicker")}
      aria-label={t("alertActive")}
      className={`inline-flex items-center flex-shrink-0 ${className}`}
    >
      <svg
        className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </span>
  );
}
