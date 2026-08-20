import type { HardDataCandidate } from "@/lib/screening/schemas";
import type { ThesisFact, ThesisSource } from "@/lib/screening/thesis/schemas";

const FMP_SOURCE = (ref: string, asOf: string): ThesisSource => ({
  type: "fmp",
  ref,
  url: `https://financialmodelingprep.com/stable/${ref}`,
  retrieved_at: asOf,
  primary: false,
});

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function cagr(start: number, end: number, years: number): number | null {
  if (years <= 0 || start <= 0 || end <= 0) return null;
  const ratio = end / start;
  if (ratio <= 0) return null;
  return Math.pow(ratio, 1 / years) - 1;
}

function stdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function fact(opts: {
  ticker: string;
  field_id: ThesisFact["field_id"];
  value: ThesisFact["value"];
  unit?: string;
  asOf: string;
  method: ThesisFact["method"];
  ref: string;
  estimation_method?: string;
  periodKind?: NonNullable<ThesisFact["period"]>["kind"];
}): ThesisFact {
  const row: ThesisFact = {
    asset_id: opts.ticker,
    field_id: opts.field_id,
    value: opts.value,
    unit: opts.unit,
    as_of: opts.asOf,
    source: FMP_SOURCE(opts.ref, opts.asOf),
    method: opts.method,
    period: opts.periodKind ? { kind: opts.periodKind } : undefined,
  };
  if (opts.estimation_method) row.estimation_method = opts.estimation_method;
  return row;
}

/**
 * Map Hard Data enrichment (annual series + TTM ratios) into provenance-bearing
 * Facts. Never invents numbers: missing inputs become value null + stay in facts
 * so gates can return passed: null.
 */
export function deriveFactsFromCandidate(
  candidate: HardDataCandidate,
  asOf: string = new Date().toISOString(),
): { facts: ThesisFact[]; gaps: string[] } {
  const ticker = candidate.ticker.toUpperCase();
  const facts: ThesisFact[] = [];
  const gaps: string[] = [];
  const series = [...(candidate.annualSeries ?? [])].filter((r) => r.year != null);
  series.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  const latestRoic = num(candidate.roicPct) ?? num(series.at(-1)?.roicPct);
  facts.push(
    fact({
      ticker,
      field_id: "EQ:B1",
      value: latestRoic,
      unit: "pct",
      asOf,
      method: "derived",
      ref: "key-metrics-ttm",
      periodKind: "TTM",
    }),
  );
  if (latestRoic == null) gaps.push("EQ:B1_roic_missing_not_ex_goodwill");
  else gaps.push("EQ:B1_roic_not_ex_goodwill");

  const gross = series
    .map((r) => num(r.grossMarginPct))
    .filter((v): v is number => v != null);
  const sigma = stdev(gross);
  facts.push(
    fact({
      ticker,
      field_id: "EQ:B3",
      value: sigma,
      unit: "pp",
      asOf,
      method: "derived",
      ref: "income-statement",
      periodKind: "RANGE",
    }),
  );

  const revenues = series
    .map((r) => num(r.revenue))
    .filter((v): v is number => v != null && v > 0);
  const years = revenues.length >= 2 ? revenues.length - 1 : 0;
  const revCagr =
    revenues.length >= 3 ? cagr(revenues[0], revenues[revenues.length - 1], years) : null;
  facts.push(
    fact({
      ticker,
      field_id: "EQ:C1",
      value: revCagr,
      unit: "ratio",
      asOf,
      method: "derived",
      ref: "income-statement",
      periodKind: "RANGE",
    }),
  );

  const fcfNi: number[] = [];
  for (const row of series) {
    const fcf = num(row.freeCashFlow);
    const niFromMargin =
      num(row.revenue) != null && num(row.netMarginPct) != null
        ? (row.revenue as number) * ((row.netMarginPct as number) / 100)
        : null;
    const niFromEps =
      num(row.eps) != null && num(row.sharesOutstanding) != null
        ? (row.eps as number) * (row.sharesOutstanding as number)
        : null;
    const ni = niFromMargin ?? niFromEps;
    if (fcf == null || ni == null || Math.abs(ni) < 1) continue;
    fcfNi.push(fcf / ni);
  }
  const fcfNiAvg =
    fcfNi.length >= 3
      ? fcfNi.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, fcfNi.length)
      : fcfNi.length > 0
        ? fcfNi.reduce((a, b) => a + b, 0) / fcfNi.length
        : null;
  facts.push(
    fact({
      ticker,
      field_id: "EQ:D1",
      value: fcfNiAvg,
      unit: "ratio",
      asOf,
      method: "derived",
      ref: "cash-flow-statement",
      periodKind: "RANGE",
    }),
  );
  if (fcfNiAvg == null) gaps.push("EQ:D1_fcf_ni_unavailable");

  const shares = series
    .map((r) => num(r.sharesOutstanding))
    .filter((v): v is number => v != null && v > 0);
  let dilutionPct: number | null = null;
  if (shares.length >= 3) {
    const start = shares[0];
    const end = shares[shares.length - 1];
    const y = shares.length - 1;
    dilutionPct = start > 0 ? (end / start) ** (1 / y) - 1 : null;
  }
  facts.push(
    fact({
      ticker,
      field_id: "EQ:D7",
      value: candidate.severeDilution === true ? true : dilutionPct,
      unit: candidate.severeDilution === true ? "flag" : "ratio",
      asOf,
      method: "derived",
      ref: "income-statement",
      periodKind: "RANGE",
    }),
  );

  facts.push(
    fact({
      ticker,
      field_id: "EQ:E1",
      value: num(candidate.ndEbitda),
      unit: "x",
      asOf,
      method: "raw",
      ref: "ratios-ttm",
      periodKind: "TTM",
    }),
  );
  if (candidate.ndEbitda == null) gaps.push("EQ:E1_nd_ebitda_missing");

  facts.push(
    fact({
      ticker,
      field_id: "EQ:E2",
      value: num(candidate.interestCoverage),
      unit: "x",
      asOf,
      method: "raw",
      ref: "ratios-ttm",
      periodKind: "TTM",
    }),
  );
  if (candidate.interestCoverage == null) gaps.push("EQ:E2_interest_coverage_missing");

  facts.push(
    fact({
      ticker,
      field_id: "calc:hist_pe_avg",
      value: num(candidate.histPeAvg),
      unit: "x",
      asOf,
      method: "derived",
      ref: "ratios",
      periodKind: "RANGE",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:fwd_pe",
      value: num(candidate.fwdPe),
      unit: "x",
      asOf,
      method: "raw",
      ref: "ratios-ttm",
      periodKind: "TTM",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:fcf_yield",
      value: num(candidate.fcfYield),
      unit: "ratio",
      asOf,
      method: "raw",
      ref: "key-metrics-ttm",
      periodKind: "TTM",
    }),
  );
  // Wrap trefolio MOAT as an input pillar (not a verdict). Engine scores ROIC
  // and buyback-aware retained earnings; do not reimplement here.
  facts.push(
    fact({
      ticker,
      field_id: "calc:moat_score_pct",
      value: num(candidate.moatScore),
      unit: "pct",
      asOf,
      method: "derived",
      ref: "moat_cache",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:thin_liquidity",
      value: candidate.thinLiquidity === true,
      unit: "flag",
      asOf,
      method: "derived",
      ref: "quote",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:target_price",
      value: num(candidate.targetPrice),
      unit: "usd",
      asOf,
      method: "raw",
      ref: "price-target-consensus",
      periodKind: "POINT_IN_TIME",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:upside_pct",
      value: num(candidate.upsidePct),
      unit: "pct",
      asOf,
      method: "derived",
      ref: "price-target-consensus",
      periodKind: "POINT_IN_TIME",
    }),
  );

  return { facts, gaps };
}
