import { METRIC_CATALOG } from "./catalog";
import type { CatalogRule } from "./catalog";
import { validateMetric } from "./validate";
import type {
  MarketSnapshot,
  Metric,
  MetricId,
  MetricPeriodKind,
  StatementYear,
  TtmFallback,
  ValidateContext,
} from "./types";

function sortedYears(years: StatementYear[]): StatementYear[] {
  return [...years].filter((y) => Number.isFinite(y.year)).sort((a, b) => a.year - b.year);
}

function latest(years: StatementYear[]): StatementYear | null {
  const s = sortedYears(years);
  return s.at(-1) ?? null;
}

function fyLabel(year: number): string {
  return `FY${year}`;
}

function cagrLabel(startYear: number, endYear: number): string {
  return `CAGR FY${startYear}→FY${endYear}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function sampleStdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function ratioCagr(
  start: number,
  end: number,
  years: number,
): number | null {
  if (years < 3 || start <= 0 || end <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

/**
 * Longest trailing run of consecutive fiscal years with a positive value.
 * H5: no gaps. n is the number of intervals (endYear - startYear).
 */
function trailingConsecutiveCagr(
  years: StatementYear[],
  pick: (row: StatementYear) => number | null,
): { startYear: number; endYear: number; n: number; value: number } | null {
  const s = sortedYears(years);
  const points: { year: number; value: number }[] = [];
  for (const row of s) {
    const v = pick(row);
    if (v != null && v > 0) points.push({ year: row.year, value: v });
  }
  if (points.length < 4) return null;
  let run: { year: number; value: number }[] = [];
  const runs: { year: number; value: number }[][] = [];
  for (const p of points) {
    if (run.length === 0 || p.year === run[run.length - 1]!.year + 1) {
      run.push(p);
    } else {
      runs.push(run);
      run = [p];
    }
  }
  runs.push(run);
  const trailing = runs.at(-1);
  if (!trailing || trailing.length < 4) return null;
  const start = trailing[0]!;
  const end = trailing[trailing.length - 1]!;
  const n = end.year - start.year;
  const value = ratioCagr(start.value, end.value, n);
  if (value == null) return null;
  return { startYear: start.year, endYear: end.year, n, value };
}

function envelope(
  id: MetricId,
  value: number | null,
  periodKind: MetricPeriodKind,
  label: string,
  asOf: string,
  extra?: { filingDate?: string; flags?: string[] },
): Metric {
  const rule: CatalogRule = METRIC_CATALOG[id];
  return {
    id,
    value,
    unit: rule.unit,
    period: { kind: periodKind, label, asOf },
    source: {
      provider: "derived",
      endpoint: rule.endpoint,
      filingDate: extra?.filingDate,
    },
    formula: rule.formula,
    status: "ok",
    flags: extra?.flags ?? [],
  };
}

function effectiveTaxRate(row: StatementYear): number | null {
  const ebt = row.incomeBeforeTax;
  const tax = row.incomeTaxExpense;
  if (ebt == null || ebt <= 0 || tax == null || !Number.isFinite(tax)) return null;
  const rate = tax / ebt;
  if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) return null;
  return rate;
}

function netDebt(row: StatementYear): number | null {
  if (row.totalDebt == null) return null;
  return row.totalDebt - (row.cash ?? 0) - (row.shortTermInvestments ?? 0);
}

export interface ComputeMetricsInput {
  ticker: string;
  years: StatementYear[];
  market: MarketSnapshot;
  ttm?: TtmFallback;
}

export function computeThesisMetrics(input: ComputeMetricsInput): Metric[] {
  const years = sortedYears(input.years);
  const last = latest(years);
  const prev = years.length >= 2 ? years[years.length - 2]! : null;
  const asOf = last?.filingDate || input.market.asOf;
  const fy = last ? fyLabel(last.year) : "FY";
  const ctx: ValidateContext = {
    ticker: input.ticker,
    ebit: last?.ebit ?? null,
    previousTotalDebt: prev?.totalDebt ?? null,
    currentTotalDebt: last?.totalDebt ?? null,
    sector: input.market.sector,
    industry: input.market.industry,
    now: input.market.asOf,
  };

  const out: Metric[] = [];

  // ROIC — catalog formula; null if invested capital ≤ 0 or tax rate missing.
  {
    let value: number | null = null;
    if (last?.ebit != null) {
      const tax = effectiveTaxRate(last);
      const equity = last.totalEquity;
      const debt = last.totalDebt;
      if (tax != null && equity != null && debt != null) {
        const invested = debt + equity - (last.cash ?? 0);
        if (invested > 0) {
          value = ((last.ebit * (1 - tax)) / invested) * 100;
        }
      }
    }
    if (value == null && input.ttm?.roicPct != null) {
      out.push(
        validateMetric(
          envelope("roic", input.ttm.roicPct, "TTM", "TTM", input.market.asOf),
          ctx,
        ),
      );
    } else {
      out.push(
        validateMetric(
          envelope("roic", value, "FY", fy, asOf, { filingDate: last?.filingDate }),
          ctx,
        ),
      );
    }
  }

  // Interest coverage — never pass a naked TTM ratio if statements exist.
  {
    let value: number | null = null;
    let kind: MetricPeriodKind = "FY";
    let label = fy;
    const ebitForH1 = last?.ebit ?? null;
    if (last?.ebit != null && last.interestExpense != null) {
      if (last.interestExpense === 0) {
        value = null;
      } else {
        value = last.ebit / Math.abs(last.interestExpense);
      }
    } else if (input.ttm?.interestCoverage != null) {
      value = input.ttm.interestCoverage;
      kind = "TTM";
      label = "TTM";
    }
    out.push(
      validateMetric(
        envelope("interestCoverage", value, kind, label, asOf, {
          filingDate: kind === "FY" ? last?.filingDate : undefined,
        }),
        { ...ctx, ebit: ebitForH1 },
      ),
    );
  }

  // Net debt / EBITDA — FY first; TTM only if FY cannot be built.
  {
    let value: number | null = null;
    let kind: MetricPeriodKind = "FY";
    let label = fy;
    const nd = last ? netDebt(last) : null;
    if (nd != null && last?.ebitda != null) {
      value = last.ebitda <= 0 ? null : nd / last.ebitda;
    } else if (input.ttm?.netDebtToEbitda != null) {
      value = input.ttm.netDebtToEbitda;
      kind = "TTM";
      label = "TTM";
    }
    const flags: string[] = [];
    if (kind === "TTM" && last?.ebitda != null) flags.push("mixed_period");
    out.push(
      validateMetric(
        envelope("netDebtToEbitda", value, kind, label, asOf, {
          filingDate: kind === "FY" ? last?.filingDate : undefined,
          flags,
        }),
        ctx,
      ),
    );
  }

  // FCF / NI — 3-year median. Latest year NI ≤ 0 → null.
  {
    let value: number | null = null;
    let label = fy;
    if (last && (last.netIncome == null || last.netIncome <= 0)) {
      value = null;
    } else {
      const ratios: number[] = [];
      const window = years.slice(-3);
      for (const row of window) {
        if (row.netIncome == null || row.netIncome <= 0 || row.freeCashFlow == null) {
          continue;
        }
        ratios.push(row.freeCashFlow / row.netIncome);
      }
      if (ratios.length >= 3) {
        value = median(ratios);
        const start = window[0]!.year;
        const end = window[window.length - 1]!.year;
        label = `median FY${start}–FY${end}`;
      }
    }
    out.push(
      validateMetric(
        envelope("fcfToNetIncome", value, "FY", label, asOf, {
          filingDate: last?.filingDate,
        }),
        ctx,
      ),
    );
  }

  // FCF yield as percentage points.
  {
    let value: number | null = null;
    const fcf = last?.freeCashFlow ?? null;
    const cap =
      input.market.marketCap != null && input.market.marketCap > 0
        ? input.market.marketCap
        : input.market.price != null &&
            last?.sharesDiluted != null &&
            last.sharesDiluted > 0
          ? input.market.price * last.sharesDiluted
          : null;
    if (fcf != null && cap != null && cap > 0) {
      value = (fcf / cap) * 100;
    }
    out.push(
      validateMetric(
        envelope("fcfYield", value, "FY", fy, asOf, { filingDate: last?.filingDate }),
        ctx,
      ),
    );
  }

  // Revenue CAGR — consecutive complete years, n ≥ 3.
  {
    const cagr = trailingConsecutiveCagr(years, (r) => r.revenue);
    const value = cagr ? cagr.value * 100 : null;
    const label = cagr
      ? cagrLabel(cagr.startYear, cagr.endYear)
      : "CAGR";
    out.push(
      validateMetric(
        envelope("revenueCagr", value, "CAGR", label, asOf, {
          filingDate: last?.filingDate,
        }),
        ctx,
      ),
    );
  }

  // Diluted share-count CAGR.
  {
    const cagr = trailingConsecutiveCagr(years, (r) => r.sharesDiluted);
    const value = cagr ? cagr.value * 100 : null;
    const label = cagr
      ? cagrLabel(cagr.startYear, cagr.endYear)
      : "CAGR";
    out.push(
      validateMetric(
        envelope("shareCountCagr", value, "CAGR", label, asOf, {
          filingDate: last?.filingDate,
        }),
        ctx,
      ),
    );
  }

  // Gross-margin volatility.
  {
    const gm = years
      .map((r) => r.grossMarginPct)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const value = gm.length >= 4 ? sampleStdev(gm) : null;
    out.push(
      validateMetric(
        envelope(
          "grossMarginVol",
          value,
          "CAGR",
          last ? `FY${years[0]!.year}–FY${last.year}` : "n years",
          asOf,
        ),
        ctx,
      ),
    );
  }

  // Current P/E from TTM EPS.
  {
    const eps = input.market.epsTtm;
    const price = input.market.price;
    const value =
      price != null && eps != null && eps > 0 ? price / eps : null;
    out.push(
      validateMetric(
        envelope("peCurrent", value, "TTM", "TTM", input.market.asOf),
        ctx,
      ),
    );
  }

  // Historic P/E — median of annual observations with EPS > 0.
  {
    const pes = years
      .filter((r) => r.eps == null || r.eps > 0)
      .map((r) => r.annualPe)
      .filter((v): v is number => v != null && v > 0 && v < 500);
    const value = pes.length >= 3 ? median(pes) : null;
    out.push(
      validateMetric(
        envelope(
          "peHistoric",
          value,
          "CAGR",
          last ? `FY${years[0]!.year}–FY${last.year}` : "annual",
          asOf,
        ),
        ctx,
      ),
    );
  }

  // 52-week drawdown.
  {
    const price = input.market.price;
    const high = input.market.high52w;
    const value =
      price != null && high != null && high > 0 ? (price / high - 1) * 100 : null;
    out.push(
      validateMetric(
        envelope("drawdown52w", value, "SPOT", "52w", input.market.asOf),
        ctx,
      ),
    );
  }

  // Consensus target upside.
  {
    const price = input.market.price;
    const target = input.market.targetPrice;
    const value =
      price != null && price > 0 && target != null ? (target / price - 1) * 100 : null;
    out.push(
      validateMetric(
        envelope(
          "targetUpside",
          value,
          "SPOT",
          "consensus",
          input.market.targetAsOf || input.market.asOf,
        ),
        ctx,
      ),
    );
  }

  return out;
}

export function metricById(metrics: Metric[], id: MetricId): Metric | undefined {
  return metrics.find((m) => m.id === id);
}
