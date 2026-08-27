function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function asIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = value > 1e12 ? new Date(value) : new Date(value * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Yahoo fundProfile + defaultKeyStatistics extras. Omit when the provider has nothing. */
export function mapYahooEtfProfileExtras(
  fundProfile: unknown,
  defaultKeyStatistics?: unknown,
): {
  expenseRatio: number | null;
  inceptionDate: string | null;
  totalAssets: number | null;
} {
  const fp = rec(fundProfile);
  const fees = rec(fp?.feesExpensesInvestment);
  const stats = rec(defaultKeyStatistics);

  const expenseRatio =
    asFiniteNumber(fees?.annualReportExpenseRatio) ??
    asFiniteNumber(fees?.netExpRatio) ??
    asFiniteNumber(fees?.grossExpRatio) ??
    asFiniteNumber(stats?.annualReportExpenseRatio);

  const totalAssets =
    asFiniteNumber(stats?.totalAssets) ?? asFiniteNumber(fees?.totalNetAssets);

  const inceptionDate =
    asIsoDate(stats?.fundInceptionDate) ?? asIsoDate(fp?.inceptionDate);

  return {
    expenseRatio,
    inceptionDate,
    totalAssets,
  };
}
