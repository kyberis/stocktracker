import type { HardDataCandidate } from "@/lib/screening/schemas";
import { recordThesisMetricRejected } from "@/lib/screening/metrics";
import type { ThesisFact, ThesisSource } from "@/lib/screening/thesis/schemas";
import {
  metricsFromCandidate,
  publishedMetricValue,
  metricById,
} from "@/lib/screening/thesis/metrics";
import type { Metric } from "@/lib/screening/thesis/metrics";
import {
  epsCagrPctFromSeries,
  grahamFairPe,
  marginDeltaFromSeries,
} from "@/lib/screening/attractiveness";

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
  fiscalLabel?: string;
  disputed?: boolean;
}): ThesisFact {
  const row: ThesisFact = {
    asset_id: opts.ticker,
    field_id: opts.field_id,
    value: opts.value,
    unit: opts.unit,
    as_of: opts.asOf,
    source: FMP_SOURCE(opts.ref, opts.asOf),
    method: opts.method,
    period:
      opts.periodKind || opts.fiscalLabel
        ? {
            kind: opts.periodKind,
            fiscal_label: opts.fiscalLabel,
          }
        : undefined,
  };
  if (opts.estimation_method) row.estimation_method = opts.estimation_method;
  if (opts.disputed) row.disputed = true;
  return row;
}

function fromMetric(
  ticker: string,
  fieldId: ThesisFact["field_id"],
  metric: Metric | undefined,
  asOf: string,
  opts?: { storeAsFraction?: boolean; fallback?: ThesisFact["value"] },
): ThesisFact {
  const published = metric ? publishedMetricValue(metric) : null;
  const raw =
    published != null && opts?.storeAsFraction ? published / 100 : published;
  const kind =
    metric?.period.kind === "CAGR"
      ? "RANGE"
      : metric?.period.kind === "SPOT"
        ? "POINT_IN_TIME"
        : metric?.period.kind === "Q"
          ? "Q"
          : metric?.period.kind === "FY"
            ? "FY"
            : metric?.period.kind === "TTM"
              ? "TTM"
              : undefined;
  return fact({
    ticker,
    field_id: fieldId,
    value: raw ?? opts?.fallback ?? null,
    unit: metric?.unit,
    asOf: metric?.period.asOf || asOf,
    method: "derived",
    ref: metric?.source.endpoint || "derived",
    periodKind: kind,
    fiscalLabel: metric?.period.label,
    disputed: metric?.status === "error",
    estimation_method:
      metric && metric.flags.length > 0
        ? `flags:${metric.flags.join(",")}`
        : undefined,
  });
}

/**
 * Map Hard Data enrichment into provenance-bearing Facts.
 * Numbers pass through the metric envelope first: unit, period, validation.
 */
export function deriveFactsFromCandidate(
  candidate: HardDataCandidate,
  asOf: string = new Date().toISOString(),
): { facts: ThesisFact[]; gaps: string[]; metrics: Metric[] } {
  const ticker = candidate.ticker.toUpperCase();
  const facts: ThesisFact[] = [];
  const gaps: string[] = [];
  const metrics = metricsFromCandidate(candidate, asOf);

  const roic = metricById(metrics, "roic");
  facts.push(fromMetric(ticker, "EQ:B1", roic, asOf));
  if (roic == null || publishedMetricValue(roic) == null) {
    gaps.push("EQ:B1_roic_missing_not_ex_goodwill");
  } else {
    gaps.push("EQ:B1_roic_not_ex_goodwill");
  }

  facts.push(fromMetric(ticker, "EQ:B3", metricById(metrics, "grossMarginVol"), asOf));
  facts.push(
    fromMetric(ticker, "EQ:C1", metricById(metrics, "revenueCagr"), asOf, {
      storeAsFraction: true,
    }),
  );
  const fcfNi = metricById(metrics, "fcfToNetIncome");
  facts.push(fromMetric(ticker, "EQ:D1", fcfNi, asOf));
  if (fcfNi == null || publishedMetricValue(fcfNi) == null) {
    gaps.push("EQ:D1_fcf_ni_unavailable");
  }

  const shareCagr = metricById(metrics, "shareCountCagr");
  facts.push(
    fromMetric(ticker, "EQ:D7", shareCagr, asOf, {
      storeAsFraction: true,
      fallback: candidate.severeDilution === true ? true : null,
    }),
  );

  const nd = metricById(metrics, "netDebtToEbitda");
  facts.push(fromMetric(ticker, "EQ:E1", nd, asOf));
  if (nd == null || publishedMetricValue(nd) == null) {
    gaps.push("EQ:E1_nd_ebitda_missing");
  }

  const coverage = metricById(metrics, "interestCoverage");
  facts.push(fromMetric(ticker, "EQ:E2", coverage, asOf));
  if (coverage == null || publishedMetricValue(coverage) == null) {
    gaps.push("EQ:E2_interest_coverage_missing");
  }

  facts.push(
    fromMetric(ticker, "calc:hist_pe_avg", metricById(metrics, "peHistoric"), asOf, {
      fallback: num(candidate.histPeAvg),
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
      fiscalLabel: "TTM",
    }),
  );
  facts.push(
    fromMetric(ticker, "calc:fcf_yield", metricById(metrics, "fcfYield"), asOf, {
      storeAsFraction: true,
    }),
  );
  facts.push(
    fromMetric(ticker, "calc:pe_current", metricById(metrics, "peCurrent"), asOf),
  );
  facts.push(
    fromMetric(ticker, "calc:drawdown_52w", metricById(metrics, "drawdown52w"), asOf),
  );
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
      field_id: "calc:peer_pe",
      value: num(candidate.peerPe),
      unit: "x",
      asOf,
      method: "raw",
      ref: "peer",
      periodKind: "TTM",
      fiscalLabel: "TTM",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:price_to_book",
      value: num(candidate.priceToBook),
      unit: "x",
      asOf,
      method: "raw",
      ref: "key-metrics-ttm",
      periodKind: "TTM",
      fiscalLabel: "TTM",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:net_cash",
      value: candidate.netCash === true,
      unit: "flag",
      asOf,
      method: "derived",
      ref: "ratios-ttm",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:buyback",
      value: candidate.buyback === true,
      unit: "flag",
      asOf,
      method: "derived",
      ref: "income-statement",
    }),
  );
  facts.push(
    fact({
      ticker,
      field_id: "calc:severe_dilution",
      value: candidate.severeDilution === true,
      unit: "flag",
      asOf,
      method: "derived",
      ref: "income-statement",
    }),
  );

  // Attractiveness: EPS CAGR + margin deltas from annual series
  {
    const epsCagr = epsCagrPctFromSeries(candidate.annualSeries ?? []);
    const margins = marginDeltaFromSeries(candidate.annualSeries ?? []);
    const fair = grahamFairPe(epsCagr);
    facts.push(
      fact({
        ticker,
        field_id: "calc:eps_cagr",
        value: epsCagr != null ? epsCagr / 100 : null,
        unit: "pct",
        asOf,
        method: "derived",
        ref: "income-statement",
        periodKind: "RANGE",
        fiscalLabel: "EPS CAGR",
        estimation_method: "trailing_consecutive_eps_cagr",
      }),
    );
    facts.push(
      fact({
        ticker,
        field_id: "calc:op_margin_delta_pp",
        value: margins.opMarginDeltaPp,
        unit: "pp",
        asOf,
        method: "derived",
        ref: "income-statement",
        periodKind: "RANGE",
      }),
    );
    facts.push(
      fact({
        ticker,
        field_id: "calc:net_margin_delta_pp",
        value: margins.netMarginDeltaPp,
        unit: "pp",
        asOf,
        method: "derived",
        ref: "income-statement",
        periodKind: "RANGE",
      }),
    );
    facts.push(
      fact({
        ticker,
        field_id: "calc:margin_years",
        value: margins.marginYears,
        unit: "count",
        asOf,
        method: "derived",
        ref: "income-statement",
      }),
    );
    facts.push(
      fact({
        ticker,
        field_id: "calc:graham_fair_pe",
        value: fair,
        unit: "x",
        asOf,
        method: "derived",
        ref: "graham",
        estimation_method: "8.5 + 2*epsCagrPct",
      }),
    );
  }

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
    fromMetric(ticker, "calc:upside_pct", metricById(metrics, "targetUpside"), asOf, {
      fallback: num(candidate.upsidePct),
    }),
  );

  for (const m of metrics) {
    if (m.status === "error") {
      recordThesisMetricRejected({
        ticker,
        metricId: m.id,
        flag: m.flags[0] ?? "error",
        rawValue: m.value,
      });
      gaps.push(`${m.id}_${m.flags[0] ?? "error"}`);
    }
  }

  return { facts, gaps: gaps.slice(0, 16), metrics };
}
