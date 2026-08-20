import { coverageBand } from "./catalog";
import type { CoverageBand } from "./catalog";
import type { MetricLocale as Locale } from "./format";
import type { Metric } from "./types";

export type { CoverageBand };

const COVERAGE_ADJ: Record<Locale, Record<CoverageBand, string>> = {
  en: {
    critical: "critical",
    tight: "tight",
    reasonable: "reasonable",
    ample: "comfortable",
  },
  es: {
    critical: "crítica",
    tight: "ajustada",
    reasonable: "razonable",
    ample: "holgada",
  },
};

const UNAVAILABLE: Record<Locale, string> = {
  en: "not available",
  es: "no disponible",
};

/**
 * Adjectives come from bands, never from the model.
 * Returns null when the metric must not be adjectivized (null / error).
 */
export function adjectiveFor(
  metric: Metric,
  locale: Locale,
): string | null {
  if (metric.status === "error" || metric.value == null) return null;
  if (metric.id === "interestCoverage") {
    return COVERAGE_ADJ[locale][coverageBand(metric.value)];
  }
  return null;
}

export function coverageUnavailable(locale: Locale): string {
  return UNAVAILABLE[locale];
}

/** True when copy must describe a buyback, not "the share count has not risen". */
export function mustDescribeBuyback(shareCountCagrPct: number | null): boolean {
  return shareCountCagrPct != null && shareCountCagrPct < -2;
}

/** True when FCF/NI must say "generates", not "covers". */
export function mustDescribeFcfGenerates(fcfToNi: number | null): boolean {
  return fcfToNi != null && fcfToNi > 1.2;
}

export function compoundedChangePct(cagrPct: number, years: number): number {
  if (years <= 0) return 0;
  return (Math.pow(1 + cagrPct / 100, years) - 1) * 100;
}

export function cagrSpanYears(label: string): number | null {
  const m = /FY(\d{4})\s*→\s*FY(\d{4})/.exec(label);
  if (!m) return null;
  const span = Number(m[2]) - Number(m[1]);
  return span >= 1 ? span : null;
}
