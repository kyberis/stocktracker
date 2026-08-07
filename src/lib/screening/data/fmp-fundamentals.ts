import { z } from "zod";

/**
 * Thin FMP client for Hard Data report enrichment (ratios + profile).
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
    // Current stable API
    priceToEarningsRatioTTM: num,
    priceToEarningsDilutedRatioTTM: num,
    // Legacy aliases
    peRatioTTM: num,
    forwardPE: num,
    forwardPERatioTTM: num,
    enterpriseValueOverEBITDATTM: num,
    netDebtToEBITDATTM: num,
    dividendYielPercentageTTM: num,
    dividendYieldTTM: num,
    dividendYieldPercentageTTM: num,
  })
  .passthrough();

const keyMetricsTtmSchema = z
  .object({
    symbol: z.string().optional(),
    // Current stable API
    evToEBITDATTM: num,
    // Legacy aliases
    peRatioTTM: num,
    enterpriseValueOverEBITDATTM: num,
    netDebtToEBITDATTM: num,
    dividendYieldTTM: num,
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

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export interface FmpFundamentalsBundle {
  ticker: string;
  currency: string | null;
  price: number | null;
  fwdPe: number | null;
  ownHistPe: number | null;
  evEbitda: number | null;
  ndEbitda: number | null;
  dividendYield: number | null;
  targetPrice: number | null;
  netCash: boolean | null;
  /** Annual revenue growth as percent points (e.g. 6.4 for +6.4%). */
  revenueGrowthPct: number | null;
  description: string | null;
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

/**
 * Fetch ratios + profile for one ticker. Best-effort; never throws.
 */
export async function fetchFmpFundamentals(
  ticker: string,
  opts?: { fetchImpl?: typeof fetch },
): Promise<FmpFundamentalsBundle> {
  const symbol = ticker.toUpperCase();
  const doFetch = opts?.fetchImpl ?? fetch;
  const errors: string[] = [];

  const [ratiosRes, metricsRes, profileRes, targetRes, growthRes] =
    await Promise.all([
      fetchJson("ratios-ttm", symbol, doFetch),
      fetchJson("key-metrics-ttm", symbol, doFetch),
      fetchJson("profile", symbol, doFetch),
      fetchJson("price-target-consensus", symbol, doFetch),
      fetchJson("financial-growth", symbol, doFetch, { limit: "1" }),
    ]);

  if (!ratiosRes.ok && ratiosRes.error) errors.push(ratiosRes.error);
  if (!metricsRes.ok && metricsRes.error) errors.push(metricsRes.error);
  if (!profileRes.ok && profileRes.error) errors.push(profileRes.error);
  if (!targetRes.ok && targetRes.error) errors.push(targetRes.error);
  if (!growthRes.ok && growthRes.error) errors.push(growthRes.error);

  const ratiosRaw = firstRow(ratiosRes.data);
  const metricsRaw = firstRow(metricsRes.data);
  const profileRaw = firstRow(profileRes.data);
  const targetRaw = firstRow(targetRes.data);
  const growthRaw = firstRow(growthRes.data);

  const ratios = ratiosRaw ? ratiosTtmSchema.safeParse(ratiosRaw) : null;
  const metrics = metricsRaw ? keyMetricsTtmSchema.safeParse(metricsRaw) : null;
  const profile = profileRaw ? profileSchema.safeParse(profileRaw) : null;
  const target = targetRaw
    ? priceTargetConsensusSchema.safeParse(targetRaw)
    : null;
  const growth = growthRaw ? financialGrowthSchema.safeParse(growthRaw) : null;

  const r = ratios?.success ? ratios.data : null;
  const m = metrics?.success ? metrics.data : null;
  const p = profile?.success ? profile.data : null;
  const t = target?.success ? target.data : null;
  const g = growth?.success ? growth.data : null;

  // Stable API rarely exposes true forward PE on ratios-ttm; keep legacy keys.
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
  // Normalise to fraction when providers return percent points (e.g. 2.5 → 0.025).
  if (dividendYield != null && dividendYield > 1) {
    dividendYield = dividendYield / 100;
  }

  const growthFraction =
    toNum(g?.revenueGrowth) ?? toNum(g?.growthRevenue) ?? null;
  const revenueGrowthPct =
    growthFraction == null ? null : growthFraction * 100;

  const netCash = ndEbitda == null ? null : ndEbitda < 0;

  const targetPrice =
    toNum(t?.targetConsensus) ??
    toNum(t?.targetMedian) ??
    toNum(p?.priceTarget) ??
    null;

  return {
    ticker: symbol,
    currency: p?.currency ? String(p.currency).slice(0, 8) : null,
    price: toNum(p?.price),
    fwdPe,
    ownHistPe,
    evEbitda,
    ndEbitda,
    dividendYield,
    targetPrice,
    netCash,
    revenueGrowthPct,
    description: p?.description
      ? String(p.description).trim().slice(0, 400)
      : null,
    errors,
  };
}
