import { z } from "zod";
import {
  computeNormalizedPe,
  evaluateEarningsQuality,
} from "@/lib/screening/scoring/earnings-quality";

/**
 * Thin FMP client for Hard Data report enrichment (ratios + profile + series).
 * Pattern mirrors `fmp-screening.ts` / `fmp-ir.ts`.
 *
 * FMP `/stable` renamed several TTM keys (2025+): prefer the new names and
 * keep legacy aliases so older fixtures / mocks still parse.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

const num = z.union([z.number(), z.string()]).nullable().optional();

const ratiosTtmSchema = z
  .object({
    symbol: z.string().optional(),
    priceToEarningsRatioTTM: num,
    priceToEarningsDilutedRatioTTM: num,
    peRatioTTM: num,
    forwardPE: num,
    forwardPERatioTTM: num,
    enterpriseValueOverEBITDATTM: num,
    enterpriseValueMultipleTTM: num,
    netDebtToEBITDATTM: num,
    dividendYielPercentageTTM: num,
    dividendYieldTTM: num,
    dividendYieldPercentageTTM: num,
    netProfitMarginTTM: num,
    netIncomePerShareTTM: num,
    freeCashFlowYieldTTM: num,
    interestCoverageRatioTTM: num,
    interestCoverageTTM: num,
    currentRatioTTM: num,
  })
  .passthrough();

const incomeStatementSchema = z
  .object({
    symbol: z.string().optional(),
    date: z.string().optional(),
    calendarYear: z.union([z.number(), z.string()]).optional(),
    eps: num,
    epssdiluted: num,
    epsDiluted: num,
    netIncome: num,
    revenue: num,
    grossProfit: num,
    operatingIncome: num,
    weightedAverageShsOutDil: num,
    weightedAverageShsOut: num,
  })
  .passthrough();

const cashFlowSchema = z
  .object({
    symbol: z.string().optional(),
    date: z.string().optional(),
    calendarYear: z.union([z.number(), z.string()]).optional(),
    operatingCashFlow: num,
    freeCashFlow: num,
    capitalExpenditure: num,
  })
  .passthrough();

const keyMetricsTtmSchema = z
  .object({
    symbol: z.string().optional(),
    evToEBITDATTM: num,
    peRatioTTM: num,
    enterpriseValueOverEBITDATTM: num,
    netDebtToEBITDATTM: num,
    dividendYieldTTM: num,
    freeCashFlowYieldTTM: num,
    roicTTM: num,
    returnOnInvestedCapitalTTM: num,
    interestCoverageTTM: num,
    evToEBITTTM: num,
    enterpriseValueOverEBITTTM: num,
  })
  .passthrough();

const keyMetricsAnnualSchema = z
  .object({
    symbol: z.string().optional(),
    date: z.string().optional(),
    calendarYear: z.union([z.number(), z.string()]).optional(),
    roic: num,
    returnOnInvestedCapital: num,
    freeCashFlowYield: num,
    enterpriseValueOverEBIT: num,
    evToEBIT: num,
  })
  .passthrough();

const profileSchema = z
  .object({
    symbol: z.string().optional(),
    companyName: z.string().optional(),
    currency: z.string().optional(),
    price: num,
    pe: num,
    forwardPE: num,
    lastDiv: num,
    dividendYield: num,
    priceTarget: num,
    description: z.string().optional(),
    beta: num,
    averageVolume: num,
    volAvg: num,
    mktCap: num,
    industry: z.string().optional(),
    sector: z.string().optional(),
  })
  .passthrough();

const priceTargetConsensusSchema = z
  .object({
    symbol: z.string().optional(),
    targetConsensus: num,
    targetMedian: num,
    targetHigh: num,
    targetLow: num,
  })
  .passthrough();

const financialGrowthSchema = z
  .object({
    symbol: z.string().optional(),
    revenueGrowth: num,
    growthRevenue: num,
  })
  .passthrough();

const ratiosAnnualSchema = z
  .object({
    symbol: z.string().optional(),
    date: z.string().optional(),
    calendarYear: z.union([z.number(), z.string()]).optional(),
    priceToEarningsRatio: num,
    priceToEarningsDilutedRatio: num,
    peRatio: num,
    grossProfitMargin: num,
    operatingProfitMargin: num,
    netProfitMargin: num,
    interestCoverageRatio: num,
    currentRatio: num,
  })
  .passthrough();

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toYear(row: {
  calendarYear?: number | string | null;
  date?: string | null;
}): number | null {
  const cy = toNum(row.calendarYear);
  if (cy != null && cy >= 1990 && cy <= 2100) return Math.round(cy);
  if (row.date && typeof row.date === "string" && row.date.length >= 4) {
    const y = Number(row.date.slice(0, 4));
    return Number.isFinite(y) ? y : null;
  }
  return null;
}

/** Normalise margin-like values that may be fraction (0.22) or percent (22). */
function toPctPoints(v: number | null): number | null {
  if (v == null) return null;
  if (Math.abs(v) > 0 && Math.abs(v) < 1) return v * 100;
  return v;
}

/**
 * Mean of positive annual P/E observations (most recent first in `rows`).
 * Skips non-positive / non-finite values (losses, bad rows).
 */
export function averageAnnualPe(rows: unknown[]): {
  histPeAvg: number | null;
  histPeYears: number;
} {
  const pes: number[] = [];
  for (const row of rows) {
    const parsed = ratiosAnnualSchema.safeParse(row);
    if (!parsed.success) continue;
    const pe =
      toNum(parsed.data.priceToEarningsRatio) ??
      toNum(parsed.data.priceToEarningsDilutedRatio) ??
      toNum(parsed.data.peRatio);
    if (pe != null && pe > 0 && pe < 500) pes.push(pe);
  }
  if (pes.length === 0) return { histPeAvg: null, histPeYears: 0 };
  const sum = pes.reduce((a, b) => a + b, 0);
  return { histPeAvg: sum / pes.length, histPeYears: pes.length };
}

/** One fiscal-year observation for evaluation financial-quality tables. */
export interface AnnualFinancialPoint {
  year: number | null;
  revenue: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  eps: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  roicPct: number | null;
  sharesOutstanding: number | null;
}

export interface FmpFundamentalsBundle {
  ticker: string;
  currency: string | null;
  price: number | null;
  fwdPe: number | null;
  ownHistPe: number | null;
  /**
   * Mean annual P/E over recent fiscal years (FMP `ratios` annual).
   * Null when the series is missing or empty.
   */
  histPeAvg: number | null;
  /** Count of annual PE observations behind histPeAvg. */
  histPeYears: number;
  evEbitda: number | null;
  /** EV/EBIT when FMP exposes it. */
  evEbit: number | null;
  ndEbitda: number | null;
  dividendYield: number | null;
  targetPrice: number | null;
  netCash: boolean | null;
  /** Latest fiscal year revenue growth as percent points (e.g. 6.4 for +6.4%). */
  revenueGrowthPct: number | null;
  /**
   * Historical revenue growth, most recent first, as percent points.
   * Used to score earnings resilience (no year of severe decline over cycle).
   */
  revenueGrowthHistoryPct: number[];
  /** Diluted EPS TTM (when FMP exposes it). */
  epsTtm: number | null;
  /** Diluted EPS, latest completed fiscal year. */
  epsFy: number | null;
  /** P/E on FY diluted EPS (price / epsFy). */
  normalizedPe: number | null;
  /** True when TTM earnings look inflated vs FY (one-offs). */
  earningsQualitySuspect: boolean;
  description: string | null;
  /** Multi-year annual fundamentals (most recent first, ≤10). */
  annualSeries: AnnualFinancialPoint[];
  /** FCF yield as fraction (e.g. 0.05 = 5%) when available. */
  fcfYield: number | null;
  /** Interest coverage (EBIT / interest) TTM or latest annual. */
  interestCoverage: number | null;
  /** True when diluted share count fell over the available history. */
  buyback: boolean | null;
  /** True when diluted shares rose ≥15% over the history window. */
  severeDilution: boolean | null;
  /** Average daily volume from profile when present. */
  avgVolume: number | null;
  /** Heuristic: avg volume under 50k (illiquid for meaningful position). */
  thinLiquidity: boolean | null;
  /** Peer / industry median P/E — reserved; null until a reliable source exists. */
  peerPe: number | null;
  /** Latest ROIC % points from TTM or latest annual. */
  roicPct: number | null;
  errors: string[];
}

async function fetchJson(
  path: string,
  symbol: string,
  fetchImpl: typeof fetch,
  extraParams?: Record<string, string>,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, data: null, error: "missing_api_key" };
  const url = new URL(`${FMP_BASE}/${path}`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("symbol", symbol);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 200);
      return { ok: false, data: null, error: `fmp_${res.status}:${body}` };
    }
    return { ok: true, data: await res.json().catch(() => null) };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : "fetch_error",
    };
  }
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    return data[0] as Record<string, unknown>;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

function asRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  return [];
}

function buildAnnualSeries(
  incomeRows: unknown[],
  cashRows: unknown[],
  metricsRows: unknown[],
  ratiosRows: unknown[],
): AnnualFinancialPoint[] {
  const cashByYear = new Map<number, z.infer<typeof cashFlowSchema>>();
  for (const row of cashRows) {
    const p = cashFlowSchema.safeParse(row);
    if (!p.success) continue;
    const y = toYear(p.data);
    if (y != null) cashByYear.set(y, p.data);
  }
  const metricsByYear = new Map<number, z.infer<typeof keyMetricsAnnualSchema>>();
  for (const row of metricsRows) {
    const p = keyMetricsAnnualSchema.safeParse(row);
    if (!p.success) continue;
    const y = toYear(p.data);
    if (y != null) metricsByYear.set(y, p.data);
  }
  const ratiosByYear = new Map<number, z.infer<typeof ratiosAnnualSchema>>();
  for (const row of ratiosRows) {
    const p = ratiosAnnualSchema.safeParse(row);
    if (!p.success) continue;
    const y = toYear(p.data);
    if (y != null) ratiosByYear.set(y, p.data);
  }

  const points: AnnualFinancialPoint[] = [];
  for (const row of incomeRows) {
    const p = incomeStatementSchema.safeParse(row);
    if (!p.success) continue;
    const year = toYear(p.data);
    const revenue = toNum(p.data.revenue);
    const grossProfit = toNum(p.data.grossProfit);
    const operatingIncome = toNum(p.data.operatingIncome);
    const netIncome = toNum(p.data.netIncome);
    const ratios = year != null ? ratiosByYear.get(year) : undefined;
    const cash = year != null ? cashByYear.get(year) : undefined;
    const metrics = year != null ? metricsByYear.get(year) : undefined;

    const grossFromIncome =
      revenue != null && revenue !== 0 && grossProfit != null
        ? (grossProfit / revenue) * 100
        : null;
    const opFromIncome =
      revenue != null && revenue !== 0 && operatingIncome != null
        ? (operatingIncome / revenue) * 100
        : null;
    const netFromIncome =
      revenue != null && revenue !== 0 && netIncome != null
        ? (netIncome / revenue) * 100
        : null;

    points.push({
      year,
      revenue,
      grossMarginPct:
        toPctPoints(toNum(ratios?.grossProfitMargin)) ?? grossFromIncome,
      operatingMarginPct:
        toPctPoints(toNum(ratios?.operatingProfitMargin)) ?? opFromIncome,
      netMarginPct:
        toPctPoints(toNum(ratios?.netProfitMargin)) ?? netFromIncome,
      eps:
        toNum(p.data.epsDiluted) ??
        toNum(p.data.epssdiluted) ??
        toNum(p.data.eps),
      operatingCashFlow: cash ? toNum(cash.operatingCashFlow) : null,
      freeCashFlow: cash ? toNum(cash.freeCashFlow) : null,
      roicPct: toPctPoints(
        toNum(metrics?.roic) ?? toNum(metrics?.returnOnInvestedCapital),
      ),
      sharesOutstanding:
        toNum(p.data.weightedAverageShsOutDil) ??
        toNum(p.data.weightedAverageShsOut),
    });
    if (points.length >= 10) break;
  }
  return points;
}

function shareCountFlags(series: AnnualFinancialPoint[]): {
  buyback: boolean | null;
  severeDilution: boolean | null;
} {
  const shares = series
    .map((p) => p.sharesOutstanding)
    .filter((n): n is number => n != null && n > 0);
  if (shares.length < 2) return { buyback: null, severeDilution: null };
  const latest = shares[0]!;
  const oldest = shares[shares.length - 1]!;
  if (oldest <= 0) return { buyback: null, severeDilution: null };
  const changePct = ((latest - oldest) / oldest) * 100;
  return {
    buyback: changePct < -2,
    severeDilution: changePct >= 15,
  };
}

/**
 * Fetch ratios + profile + multi-year series for one ticker. Best-effort; never throws.
 */
export async function fetchFmpFundamentals(
  ticker: string,
  opts?: { fetchImpl?: typeof fetch },
): Promise<FmpFundamentalsBundle> {
  const symbol = ticker.toUpperCase();
  const doFetch = opts?.fetchImpl ?? fetch;
  const errors: string[] = [];

  const [
    ratiosRes,
    metricsRes,
    profileRes,
    targetRes,
    growthRes,
    incomeAnnualRes,
    incomeTtmRes,
    ratiosAnnualRes,
    cashFlowRes,
    keyMetricsAnnualRes,
  ] = await Promise.all([
    fetchJson("ratios-ttm", symbol, doFetch),
    fetchJson("key-metrics-ttm", symbol, doFetch),
    fetchJson("profile", symbol, doFetch),
    fetchJson("price-target-consensus", symbol, doFetch),
    fetchJson("financial-growth", symbol, doFetch, { limit: "10" }),
    fetchJson("income-statement", symbol, doFetch, {
      period: "annual",
      limit: "10",
    }),
    fetchJson("income-statement-ttm", symbol, doFetch),
    fetchJson("ratios", symbol, doFetch, { period: "annual", limit: "10" }),
    fetchJson("cash-flow-statement", symbol, doFetch, {
      period: "annual",
      limit: "10",
    }),
    fetchJson("key-metrics", symbol, doFetch, {
      period: "annual",
      limit: "10",
    }),
  ]);

  for (const res of [
    ratiosRes,
    metricsRes,
    profileRes,
    targetRes,
    growthRes,
    incomeAnnualRes,
    incomeTtmRes,
    ratiosAnnualRes,
    cashFlowRes,
    keyMetricsAnnualRes,
  ]) {
    if (!res.ok && res.error) errors.push(res.error);
  }

  const ratiosRaw = firstRow(ratiosRes.data);
  const metricsRaw = firstRow(metricsRes.data);
  const profileRaw = firstRow(profileRes.data);
  const targetRaw = firstRow(targetRes.data);
  const growthRows = asRows(growthRes.data);
  const incomeAnnualRows = asRows(incomeAnnualRes.data);
  const incomeTtmRaw = firstRow(incomeTtmRes.data);
  const ratiosAnnualRows = asRows(ratiosAnnualRes.data);
  const cashFlowRows = asRows(cashFlowRes.data);
  const keyMetricsAnnualRows = asRows(keyMetricsAnnualRes.data);
  const { histPeAvg, histPeYears } = averageAnnualPe(ratiosAnnualRows);

  const ratios = ratiosRaw ? ratiosTtmSchema.safeParse(ratiosRaw) : null;
  const metrics = metricsRaw ? keyMetricsTtmSchema.safeParse(metricsRaw) : null;
  const profile = profileRaw ? profileSchema.safeParse(profileRaw) : null;
  const target = targetRaw
    ? priceTargetConsensusSchema.safeParse(targetRaw)
    : null;
  const growthParsed = growthRows
    .map((row) => financialGrowthSchema.safeParse(row))
    .filter((r) => r.success)
    .map((r) => r.data);
  const g = growthParsed[0] ?? null;
  const incomeFyParsed = incomeAnnualRows
    .map((row) => incomeStatementSchema.safeParse(row))
    .filter((row) => row.success)
    .map((row) => row.data);
  const incomeTtmParsed = incomeTtmRaw
    ? incomeStatementSchema.safeParse(incomeTtmRaw)
    : null;

  const r = ratios?.success ? ratios.data : null;
  const m = metrics?.success ? metrics.data : null;
  const p = profile?.success ? profile.data : null;
  const t = target?.success ? target.data : null;
  const fyIncome = incomeFyParsed[0] ?? null;
  const ttmIncome = incomeTtmParsed?.success ? incomeTtmParsed.data : null;

  const fwdPe =
    toNum(r?.forwardPE) ??
    toNum(r?.forwardPERatioTTM) ??
    toNum(p?.forwardPE) ??
    null;
  const ownHistPe =
    toNum(r?.priceToEarningsRatioTTM) ??
    toNum(r?.priceToEarningsDilutedRatioTTM) ??
    toNum(r?.peRatioTTM) ??
    toNum(m?.peRatioTTM) ??
    toNum(p?.pe) ??
    null;
  const evEbitda =
    toNum(m?.evToEBITDATTM) ??
    toNum(r?.enterpriseValueOverEBITDATTM) ??
    toNum(m?.enterpriseValueOverEBITDATTM) ??
    null;
  const ndEbitda =
    toNum(r?.netDebtToEBITDATTM) ?? toNum(m?.netDebtToEBITDATTM) ?? null;

  let dividendYield =
    toNum(r?.dividendYielPercentageTTM) ??
    toNum(r?.dividendYieldPercentageTTM) ??
    toNum(r?.dividendYieldTTM) ??
    toNum(m?.dividendYieldTTM) ??
    toNum(p?.dividendYield) ??
    null;
  if (dividendYield != null && dividendYield > 1) {
    dividendYield = dividendYield / 100;
  }

  const growthFraction =
    toNum(g?.revenueGrowth) ?? toNum(g?.growthRevenue) ?? null;
  const revenueGrowthPct =
    growthFraction == null ? null : growthFraction * 100;

  const revenueGrowthHistoryPct = growthParsed
    .map((row) => toNum(row.revenueGrowth) ?? toNum(row.growthRevenue))
    .filter((n): n is number => n != null && Number.isFinite(n))
    .map((f) => f * 100);

  const netCash = ndEbitda == null ? null : ndEbitda < 0;

  const targetPrice =
    toNum(t?.targetConsensus) ??
    toNum(t?.targetMedian) ??
    toNum(p?.priceTarget) ??
    null;

  const price = toNum(p?.price);
  const epsFy =
    toNum(fyIncome?.epsDiluted) ??
    toNum(fyIncome?.epssdiluted) ??
    toNum(fyIncome?.eps) ??
    null;
  const epsTtm =
    toNum(ttmIncome?.epsDiluted) ??
    toNum(ttmIncome?.epssdiluted) ??
    toNum(ttmIncome?.eps) ??
    toNum(r?.netIncomePerShareTTM) ??
    null;

  const netMarginTtmPct = (() => {
    const fromRatio = toNum(r?.netProfitMarginTTM);
    if (fromRatio != null) {
      return fromRatio > 0 && fromRatio < 1 ? fromRatio * 100 : fromRatio;
    }
    const ni = toNum(ttmIncome?.netIncome);
    const rev = toNum(ttmIncome?.revenue);
    if (ni != null && rev != null && rev > 0) return (ni / rev) * 100;
    return null;
  })();

  const netMarginFyPct = (() => {
    const ni = toNum(fyIncome?.netIncome);
    const rev = toNum(fyIncome?.revenue);
    if (ni != null && rev != null && rev > 0) return (ni / rev) * 100;
    return null;
  })();

  const quality = evaluateEarningsQuality({
    epsTtm,
    epsFy,
    netMarginTtmPct,
    netMarginFyPct,
  });
  const normalizedPe = computeNormalizedPe(price, epsFy);

  const annualSeries = buildAnnualSeries(
    incomeAnnualRows,
    cashFlowRows,
    keyMetricsAnnualRows,
    ratiosAnnualRows,
  );
  const { buyback, severeDilution } = shareCountFlags(annualSeries);

  let fcfYield =
    toNum(r?.freeCashFlowYieldTTM) ??
    toNum(m?.freeCashFlowYieldTTM) ??
    null;
  if (fcfYield != null && Math.abs(fcfYield) > 1) {
    fcfYield = fcfYield / 100;
  }
  if (fcfYield == null && annualSeries[0]?.freeCashFlow != null) {
    const mktCap = toNum(p?.mktCap);
    const fcf = annualSeries[0].freeCashFlow;
    if (mktCap != null && mktCap > 0 && fcf != null) {
      fcfYield = fcf / mktCap;
    }
  }

  const interestCoverage =
    toNum(r?.interestCoverageRatioTTM) ??
    toNum(r?.interestCoverageTTM) ??
    toNum(m?.interestCoverageTTM) ??
    (() => {
      const latestRatio = ratiosAnnualSchema.safeParse(ratiosAnnualRows[0]);
      return latestRatio.success
        ? toNum(latestRatio.data.interestCoverageRatio)
        : null;
    })();

  const evEbit =
    toNum(m?.evToEBITTTM) ??
    toNum(m?.enterpriseValueOverEBITTTM) ??
    (() => {
      const latest = keyMetricsAnnualSchema.safeParse(keyMetricsAnnualRows[0]);
      return latest.success
        ? toNum(latest.data.evToEBIT) ??
            toNum(latest.data.enterpriseValueOverEBIT)
        : null;
    })();

  const roicPct =
    toPctPoints(toNum(m?.roicTTM) ?? toNum(m?.returnOnInvestedCapitalTTM)) ??
    annualSeries[0]?.roicPct ??
    null;

  const avgVolume = toNum(p?.averageVolume) ?? toNum(p?.volAvg);
  const thinLiquidity =
    avgVolume == null ? null : avgVolume > 0 && avgVolume < 50_000;

  return {
    ticker: symbol,
    currency: p?.currency ? String(p.currency).slice(0, 8) : null,
    price,
    fwdPe,
    ownHistPe,
    histPeAvg,
    histPeYears,
    evEbitda,
    evEbit,
    ndEbitda,
    dividendYield,
    targetPrice,
    netCash,
    revenueGrowthPct,
    revenueGrowthHistoryPct,
    epsTtm,
    epsFy,
    normalizedPe,
    earningsQualitySuspect: quality.suspect,
    description: p?.description
      ? String(p.description).trim().slice(0, 400)
      : null,
    annualSeries,
    fcfYield,
    interestCoverage,
    buyback,
    severeDilution,
    avgVolume,
    thinLiquidity,
    peerPe: null,
    roicPct,
    errors,
  };
}
