import { z } from "zod";

/**
 * Thin FMP client for Hard Data report enrichment (ratios + profile).
 * Pattern mirrors `fmp-screening.ts` / `fmp-ir.ts`.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

const num = z.union([z.number(), z.string()]).nullable().optional();

const ratiosTtmSchema = z
  .object({
    symbol: z.string().optional(),
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
  description: string | null;
  errors: string[];
}

async function fetchJson(
  path: string,
  symbol: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, data: null, error: "missing_api_key" };
  const url = new URL(`${FMP_BASE}/${path}`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("symbol", symbol);
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

  const [ratiosRes, metricsRes, profileRes] = await Promise.all([
    fetchJson("ratios-ttm", symbol, doFetch),
    fetchJson("key-metrics-ttm", symbol, doFetch),
    fetchJson("profile", symbol, doFetch),
  ]);

  if (!ratiosRes.ok && ratiosRes.error) errors.push(ratiosRes.error);
  if (!metricsRes.ok && metricsRes.error) errors.push(metricsRes.error);
  if (!profileRes.ok && profileRes.error) errors.push(profileRes.error);

  const ratiosRaw = firstRow(ratiosRes.data);
  const metricsRaw = firstRow(metricsRes.data);
  const profileRaw = firstRow(profileRes.data);

  const ratios = ratiosRaw ? ratiosTtmSchema.safeParse(ratiosRaw) : null;
  const metrics = metricsRaw ? keyMetricsTtmSchema.safeParse(metricsRaw) : null;
  const profile = profileRaw ? profileSchema.safeParse(profileRaw) : null;

  const r = ratios?.success ? ratios.data : null;
  const m = metrics?.success ? metrics.data : null;
  const p = profile?.success ? profile.data : null;

  const fwdPe =
    toNum(r?.forwardPE) ??
    toNum(r?.forwardPERatioTTM) ??
    toNum(p?.forwardPE) ??
    null;
  const ownHistPe = toNum(r?.peRatioTTM) ?? toNum(m?.peRatioTTM) ?? toNum(p?.pe) ?? null;
  const evEbitda =
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

  const netCash = ndEbitda == null ? null : ndEbitda < 0;

  return {
    ticker: symbol,
    currency: p?.currency ? String(p.currency).slice(0, 8) : null,
    price: toNum(p?.price),
    fwdPe,
    ownHistPe,
    evEbitda,
    ndEbitda,
    dividendYield,
    targetPrice: toNum(p?.priceTarget),
    netCash,
    description: p?.description
      ? String(p.description).trim().slice(0, 400)
      : null,
    errors,
  };
}
