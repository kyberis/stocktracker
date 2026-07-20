/** Locale-aware formatters for company analysis display. */

export function analysisLocale(language: string): string {
  if (language === "es") return "es-ES";
  if (language === "pt") return "pt-PT";
  if (language === "fr") return "fr-FR";
  if (language === "de") return "de-DE";
  return language || "en-US";
}

export function formatAnalysisNumber(
  value: number | null | undefined,
  language: string,
  opts?: { digits?: number; style?: "decimal" | "percent" },
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const digits = opts?.digits ?? 2;
  if (opts?.style === "percent") {
    return new Intl.NumberFormat(analysisLocale(language), {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }
  return new Intl.NumberFormat(analysisLocale(language), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatAnalysisCompact(
  value: number | null | undefined,
  language: string,
  currency = "USD",
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const loc = analysisLocale(language);
  if (abs >= 1_000_000_000_000) {
    return `${sign}${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(abs / 1_000_000_000_000)} T ${currency}`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(abs / 1_000_000_000)} B ${currency}`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(abs / 1_000_000)} M ${currency}`;
  }
  return `${sign}${new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)} ${currency}`;
}

export function formatAnalysisDate(
  iso: string | null | undefined,
  language: string,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // Already a short label like fiscal date ending
    return iso;
  }
  return new Intl.DateTimeFormat(analysisLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatAnalysisDateTime(
  iso: string | null | undefined,
  language: string,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(analysisLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
