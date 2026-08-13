import { z } from "zod";
import type { FmpScreenerCandidate } from "@/lib/screening/data/fmp-screening";
import { resolveResearchSymbol } from "@/lib/screening/data/research-symbol";

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

function stubCandidate(symbol: string): FmpScreenerCandidate {
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

function candidateFromProfile(
  listedTicker: string,
  p: z.infer<typeof profileRowSchema>,
): FmpScreenerCandidate {
  const mcap = p.mktCap ?? p.marketCap ?? null;
  return {
    ticker: listedTicker,
    name: (p.companyName ?? listedTicker).slice(0, 200),
    sector: p.sector ?? null,
    industry: p.industry ?? null,
    country: p.country ?? null,
    exchange: p.exchangeShortName ?? p.exchange ?? null,
    marketCapUsd: mcap != null && Number.isFinite(mcap) ? mcap : null,
    price: p.price ?? null,
  };
}

async function fetchProfile(
  symbol: string,
  doFetch: typeof fetch,
  key: string,
): Promise<z.infer<typeof profileRowSchema> | null> {
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
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type FocusSeedCandidate = FmpScreenerCandidate & {
  researchTicker?: string | null;
};

/**
 * Best-effort profile → screener candidate. Returns null when the ticker
 * cannot be resolved (missing key, HTTP error, empty profile).
 * Secondary listings keep `ticker` as the user-facing symbol and set
 * `researchTicker` to the FMP primary when name-search finds one.
 */
export async function seedFocusCandidate(
  ticker: string,
  opts?: { fetchImpl?: typeof fetch; companyName?: string | null },
): Promise<FocusSeedCandidate | null> {
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;
  const key = fmpKey();
  if (!key) {
    return stubCandidate(symbol);
  }

  const doFetch = opts?.fetchImpl ?? fetch;
  const listedProfile = await fetchProfile(symbol, doFetch, key);
  let seed: FocusSeedCandidate = listedProfile
    ? candidateFromProfile(symbol, listedProfile)
    : stubCandidate(symbol);

  const searchName =
    opts?.companyName?.trim() ||
    (seed.name && seed.name !== symbol ? seed.name : "");
  if (searchName) {
    const resolved = await resolveResearchSymbol({
      ticker: symbol,
      companyName: searchName,
      fetchImpl: doFetch,
    });
    if (resolved.mapped) {
      const primary = await fetchProfile(resolved.symbol, doFetch, key);
      if (primary) {
        const filled = candidateFromProfile(symbol, primary);
        seed = {
          ...filled,
          ticker: symbol,
          price: seed.price ?? filled.price,
          researchTicker: resolved.symbol,
          name: opts?.companyName?.trim() || filled.name || seed.name,
        };
      } else {
        seed.researchTicker = resolved.symbol;
      }
    }
  }

  return seed;
}
