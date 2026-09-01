import type { IncomeStatementReport } from "@/lib/api-providers/types";
import type { FundamentalData } from "@/lib/types";
import {
  computeNormalizedPe,
  evaluateEarningsQuality,
} from "@/lib/screening/scoring/earnings-quality";

type SummableField = "netIncome" | "operatingIncome" | "totalRevenue";

function sumTtm(
  rows: IncomeStatementReport[],
  field: SummableField,
  quarters = 4,
): number | null {
  const slice = rows.slice(0, quarters);
  if (slice.length < quarters) return null;
  let sum = 0;
  for (const row of slice) {
    const value = row[field];
    if (value == null || !Number.isFinite(value)) return null;
    sum += value;
  }
  return sum;
}

function epsFromNetIncome(
  netIncome: number | null,
  sharesOutstanding: number | null | undefined,
): number | null {
  if (netIncome == null || sharesOutstanding == null || !(sharesOutstanding > 0)) {
    return null;
  }
  return netIncome / sharesOutstanding;
}

function marginPct(netIncome: number | null, revenue: number | null): number | null {
  if (netIncome == null || revenue == null || !(revenue > 0)) return null;
  return (netIncome / revenue) * 100;
}

function profitMarginToPct(profitMargin: number | null | undefined): number | null {
  if (profitMargin == null || !Number.isFinite(profitMargin)) return null;
  return profitMargin > 0 && profitMargin < 1 ? profitMargin * 100 : profitMargin;
}

export interface EarningsQualityFromIncomeResult {
  earningsQualitySuspect: boolean;
  normalizedPe: number | null;
  epsFy: number | null;
  reasons: string[];
}

/**
 * Derive earnings-quality flags from cached income statements (Yahoo/FMP shape).
 * Used by Warren valuation so trailing P/E one-offs (investment gains, tax
 * releases, discontinued ops) do not label a name as cheap.
 */
export function deriveEarningsQualityFromIncome(
  income: FundamentalData<IncomeStatementReport> | null | undefined,
  opts: {
    sharesOutstanding?: number | null;
    price?: number | null;
    profitMargin?: number | null;
  } = {},
): EarningsQualityFromIncomeResult {
  const quarterly = income?.quarterly ?? [];
  const annual = income?.annual ?? [];
  const fy = annual[0] ?? null;

  const netIncomeTtm = sumTtm(quarterly, "netIncome");
  const operatingIncomeTtm = sumTtm(quarterly, "operatingIncome");
  const revenueTtm = sumTtm(quarterly, "totalRevenue");

  const epsTtm = epsFromNetIncome(netIncomeTtm, opts.sharesOutstanding);
  const epsFy = epsFromNetIncome(fy?.netIncome ?? null, opts.sharesOutstanding);

  const quality = evaluateEarningsQuality({
    epsTtm,
    epsFy,
    netMarginTtmPct:
      profitMarginToPct(opts.profitMargin) ??
      marginPct(netIncomeTtm, revenueTtm),
    netMarginFyPct: marginPct(fy?.netIncome ?? null, fy?.totalRevenue ?? null),
    netIncomeTtm,
    operatingIncomeTtm,
  });

  const normalizedPe = computeNormalizedPe(opts.price ?? null, epsFy);

  return {
    earningsQualitySuspect: quality.suspect,
    normalizedPe,
    epsFy,
    reasons: quality.reasons,
  };
}
