import { z } from "zod";
import type { FmpScreenerCandidate } from "@/lib/screening/data/fmp-screening";

/**
 * Resolve a single focus ticker into a Hard Data universe row via FMP profile.
 * Used by the analyze intent so we skip the company screener.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

const profileRowSchema = z
  .object({
    symbol: z.string().min(1).max(20).optional(),
    companyName: z.string().max(200).optional(),
    sector: z.string().max(120).nullable().optional(),
    industry: z.string().max(120).nullable().optional(),
    country: z.string().max(10).nullable().optional(),
    exchange: z.string().max(40).nullable().optional(),
    exchangeShortName: z.string().max(20).nullable().optional(),
    mktCap: z.number().finite().nullable().optional(),
    marketCap: z.number().finite().nullable().optional(),
    price: z.number().finite().nullable().optional(),
  })
  .passthrough();

function fmpKey(): string | undefined {
  return (
    process.env.FMP_API_KEY?.trim() ||
    process.env.FINANCIAL_MODELING_PREP_API_KEY?.trim() ||
    undefined
  );
}

/**
 * Best-effort profile → screener candidate. Returns null when the ticker
 * cannot be resolved (missing key, HTTP error, empty profile).
 */
export async function seedFocusCandidate(
  ticker: string,
  opts?: { fetchImpl?: typeof fetch },
): Promise<FmpScreenerCandidate | null> {
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;
  const key = fmpKey();
  if (!key) {
    // Local / test fallback so analyze still builds a 1-name universe.
    return {
      ticker: symbol,
      name: symbol,
      sector: null,
      industry: null,
      country: null,
      exchange: null,
      marketCapUsd: null,
      price: null,
    };
  }

  const doFetch = opts?.fetchImpl ?? fetch;
  const url = new URL(`${FMP_BASE}/profile`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", key);

  try {
    const res = await doFetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    const parsed = profileRowSchema.safeParse(row);
    if (!parsed.success) {
      return {
        ticker: symbol,
        name: symbol,
        sector: null,
        industry: null,
        country: null,
        exchange: null,
        marketCapUsd: null,
        price: null,
      };
    }
    const p = parsed.data;
    const mcap = p.mktCap ?? p.marketCap ?? null;
    return {
      ticker: (p.symbol ?? symbol).toUpperCase(),
      name: (p.companyName ?? symbol).slice(0, 200),
      sector: p.sector ?? null,
      industry: p.industry ?? null,
      country: p.country ?? null,
      exchange: p.exchangeShortName ?? p.exchange ?? null,
      marketCapUsd: mcap != null && Number.isFinite(mcap) ? mcap : null,
      price: p.price ?? null,
    };
  } catch {
    return null;
  }
}
