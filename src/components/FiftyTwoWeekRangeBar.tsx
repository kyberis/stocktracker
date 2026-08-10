"use client";

import {
  formatRangeDate,
  rangePositionPct,
} from "@/lib/screening/fifty-two-week-range";

export interface FiftyTwoWeekRangeBarLabels {
  low: string;
  high: string;
  rangeTitle: string;
  priceChange: string;
  /** Template with {low}, {high}, {price}, {pct} for screen readers */
  ariaLabel: string;
}

export interface FiftyTwoWeekRangeBarProps {
  low: number;
  high: number;
  price: number;
  currency: string;
  lowDate?: string | null;
  highDate?: string | null;
  /** Typically 1y return % (DEGIRO “Variación en el precio”). */
  variationPct?: number | null;
  locale?: string;
  labels: FiftyTwoWeekRangeBarLabels;
  className?: string;
}

function formatPrice(value: number, currency: string, locale: string): string {
  const formatted = value.toLocaleString(locale || "en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value >= 100 ? 0 : 2,
  });
  const c = (currency || "").toUpperCase();
  if (!c || c === "USD") return formatted;
  if (c === "EUR") return `${formatted} €`;
  if (c === "GBP" || c === "GBX") return `${formatted} £`;
  return `${formatted} ${c}`;
}

function formatVariation(pct: number, locale: string): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString(locale || "en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}

/**
 * DEGIRO-style 52-week (≈12m close) range: low — track with marker — high,
 * optional dates under the ends, and a centered “range / variation” footer.
 */
export default function FiftyTwoWeekRangeBar({
  low,
  high,
  price,
  currency,
  lowDate,
  highDate,
  variationPct,
  locale = "en",
  labels,
  className = "",
}: FiftyTwoWeekRangeBarProps) {
  const pct = rangePositionPct(price, low, high);
  if (pct == null) return null;

  const lowLabel = formatPrice(low, currency, locale);
  const highLabel = formatPrice(high, currency, locale);
  const priceLabel = formatPrice(price, currency, locale);
  const lowDateFmt = formatRangeDate(lowDate, locale);
  const highDateFmt = formatRangeDate(highDate, locale);

  const aria = labels.ariaLabel
    .replace("{low}", lowLabel)
    .replace("{high}", highLabel)
    .replace("{price}", priceLabel)
    .replace("{pct}", `${Math.round(pct)}`);

  const variationTone =
    variationPct == null
      ? "text-[color:var(--muted)]"
      : variationPct > 0
        ? "text-emerald-700 dark:text-emerald-300"
        : variationPct < 0
          ? "text-rose-700 dark:text-rose-300"
          : "text-[color:var(--muted)]";

  return (
    <div
      className={`w-full ${className}`}
      role="img"
      aria-label={aria}
    >
      <div className="flex items-end justify-between gap-3 text-[12px]">
        <div className="min-w-0 text-left">
          <p className="font-semibold tabular-nums text-[color:var(--foreground)]">
            {lowLabel}{" "}
            <span className="font-normal text-[color:var(--muted)]">
              {labels.low}
            </span>
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="font-semibold tabular-nums text-[color:var(--foreground)]">
            {highLabel}{" "}
            <span className="font-normal text-[color:var(--muted)]">
              {labels.high}
            </span>
          </p>
        </div>
      </div>

      <div className="relative mt-2 h-3" aria-hidden="true">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[color:var(--accent)] opacity-80" />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--accent)] bg-[color:var(--surface)] shadow-sm"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="mt-1 flex items-start justify-between gap-3 text-[11px] text-[color:var(--muted)]">
        <span className="tabular-nums">{lowDateFmt ?? "\u00a0"}</span>
        <span className="tabular-nums">{highDateFmt ?? "\u00a0"}</span>
      </div>

      <p className="mt-2 text-center text-[12px] text-[color:var(--muted)]">
        <span className="font-medium text-[color:var(--foreground)]">
          {labels.rangeTitle}
        </span>
        {variationPct != null && Number.isFinite(variationPct) ? (
          <>
            {" / "}
            <span className={`font-semibold tabular-nums ${variationTone}`}>
              {formatVariation(variationPct, locale)}
            </span>{" "}
            {labels.priceChange}
          </>
        ) : null}
      </p>
    </div>
  );
}
