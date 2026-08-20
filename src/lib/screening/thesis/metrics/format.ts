import type { Metric, MetricUnit } from "./types";
export type { MetricUnit };

export type MetricLocale = "en" | "es";

const UNRELIABLE: Record<MetricLocale, string> = {
  en: "n/a — unreliable figure",
  es: "n/d — dato no fiable",
};

const NA: Record<MetricLocale, string> = {
  en: "n/a",
  es: "n/d",
};

export function metricLocaleFromTag(tag: string | undefined): MetricLocale {
  return (tag || "en").toLowerCase().startsWith("es") ? "es" : "en";
}

function decimal(value: number, digits: number, locale: MetricLocale): string {
  const abs = Math.abs(value);
  const rounded =
    Math.round(abs * 10 ** digits) / 10 ** digits;
  const [whole, frac = ""] = rounded.toFixed(digits).split(".");
  const sep = locale === "es" ? "," : ".";
  const body = digits > 0 ? `${whole}${sep}${frac}` : whole;
  return value < 0 ? `−${body}` : body;
}

/**
 * Single unit formatter. No thesis number may skip this.
 * Never emits the token "pct".
 */
export function formatMetricValue(
  value: number | null,
  unit: MetricUnit,
  locale: MetricLocale,
): string {
  if (value == null || !Number.isFinite(value)) return NA[locale];
  switch (unit) {
    case "x":
      return `${decimal(value, 1, locale)}x`;
    case "pct":
      return locale === "es"
        ? `${decimal(value, 1, locale)} %`
        : `${decimal(value, 1, locale)}%`;
    case "pp":
      return `${decimal(value, 1, locale)} pp`;
    case "usd":
      return locale === "es"
        ? `${decimal(value, 2, locale)} $`
        : `$${decimal(value, 2, locale)}`;
    case "count":
      return decimal(value, 0, locale);
    case "years":
      return locale === "es"
        ? `${decimal(value, 0, locale)} años`
        : `${decimal(value, 0, locale)} years`;
    default:
      return NA[locale];
  }
}

/** Published display: errors render as n/d, never the raw value. Period label always joins. */
export function formatMetric(metric: Metric, locale: MetricLocale): string {
  if (metric.status === "error") return UNRELIABLE[locale];
  const num = formatMetricValue(metric.value, metric.unit, locale);
  const label = metric.period.label.trim();
  return label ? `${num} (${label})` : num;
}

export function formatMetricUnreliable(locale: MetricLocale): string {
  return UNRELIABLE[locale];
}
