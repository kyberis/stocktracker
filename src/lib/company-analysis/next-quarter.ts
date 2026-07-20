/**
 * Next-quarter consensus (analyst estimates) for company analysis.
 * Prefer explicit upcoming earnings rows; never invent guidance.
 */

export interface NextQuarterConsensus {
  nextReportDate: string | null;
  nextQuarterLabel: string | null;
  consensusEps: number | null;
  consensusRevenue: number | null;
  /** Analyst implied YoY growth % when the source provides it. */
  consensusEpsVarPct: number | null;
  consensusRevenueVarPct: number | null;
}

export interface RawEarningsEstimateRow {
  /** Report / announcement date (preferred for "next report"). */
  reportDate?: string | null;
  /** Fiscal period end when known. */
  fiscalPeriodEnd?: string | null;
  epsActual?: number | null;
  epsEstimated?: number | null;
  revenueActual?: number | null;
  revenueEstimated?: number | null;
}

function isUnreported(row: RawEarningsEstimateRow): boolean {
  return (
    (row.epsEstimated != null || row.revenueEstimated != null) &&
    row.epsActual == null &&
    row.revenueActual == null
  );
}

/** Pick the nearest upcoming unreported quarter from provider earnings rows. */
export function pickNextQuarterFromEarningsRows(
  rows: RawEarningsEstimateRow[],
): NextQuarterConsensus | null {
  const upcoming = rows.find(isUnreported);
  if (!upcoming) return null;
  if (upcoming.epsEstimated == null && upcoming.revenueEstimated == null) return null;

  const label = upcoming.fiscalPeriodEnd || upcoming.reportDate || null;
  return {
    nextReportDate: upcoming.reportDate || upcoming.fiscalPeriodEnd || null,
    nextQuarterLabel: label,
    consensusEps: upcoming.epsEstimated ?? null,
    consensusRevenue: upcoming.revenueEstimated ?? null,
    consensusEpsVarPct: null,
    consensusRevenueVarPct: null,
  };
}

export function mergeNextQuarterConsensus(
  primary: NextQuarterConsensus | null,
  fallback: NextQuarterConsensus | null,
): NextQuarterConsensus | null {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;
  return {
    nextReportDate: primary.nextReportDate ?? fallback.nextReportDate,
    nextQuarterLabel: primary.nextQuarterLabel ?? fallback.nextQuarterLabel,
    consensusEps: primary.consensusEps ?? fallback.consensusEps,
    consensusRevenue: primary.consensusRevenue ?? fallback.consensusRevenue,
    consensusEpsVarPct: primary.consensusEpsVarPct ?? fallback.consensusEpsVarPct,
    consensusRevenueVarPct:
      primary.consensusRevenueVarPct ?? fallback.consensusRevenueVarPct,
  };
}
