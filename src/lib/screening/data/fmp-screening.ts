import { z } from "zod";
import {
  recordFmpScreenerRequest,
  recordHardDataUniverseSize,
} from "@/lib/screening/metrics";
import { noteScreeningProviderQuota } from "@/lib/screening/provider-circuit";

/**
 * Client for FMP's stable `company-screener` endpoint. Used by the Hard Data
 * agent to fetch the initial universe of tickers that match the user's brief
 * before the LLM ranks them.
 *
 * Docs: https://site.financialmodelingprep.com/developer/docs/stable#company-screener
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

/**
 * Region codes come from the intake brief (`us_canada` | `europe` | `asia_pacific`).
 * The mapping to FMP `country` values is intentionally conservative — a small
 * curated list per region rather than every ISO code — so the screener stays
 * fast and predictable.
 */
const REGION_COUNTRY_MAP: Record<string, readonly string[]> = {
  us_canada: ["US", "CA"],
  europe: [
    "GB",
    "DE",
    "FR",
    "NL",
    "IT",
    "ES",
    "SE",
    "CH",
    "IE",
    "DK",
    "FI",
    "NO",
    "AT",
    "BE",
    "PL",
    "PT",
    "GR",
    "HU",
    "CZ",
  ],
  asia_pacific: ["JP", "HK", "SG", "AU", "KR", "TW", "NZ", "IN"],
};

const fmpScreenerRowSchema = z
  .object({
    symbol: z.string().min(1).max(20),
    companyName: z.string().min(1).max(200).optional().default(""),
    marketCap: z.number().finite().nullable().optional(),
    sector: z.string().max(120).nullable().optional(),
    industry: z.string().max(120).nullable().optional(),
    country: z.string().max(10).nullable().optional(),
    exchangeShortName: z.string().max(20).nullable().optional(),
    price: z.number().finite().nullable().optional(),
    beta: z.number().finite().nullable().optional(),
    volume: z.number().finite().nullable().optional(),
    lastAnnualDividend: z.number().finite().nullable().optional(),
    isActivelyTrading: z.boolean().optional(),
  })
  .passthrough();

export const fmpScreenerCandidateSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().max(200),
  sector: z.string().max(120).nullable(),
  industry: z.string().max(120).nullable(),
  country: z.string().max(10).nullable(),
  exchange: z.string().max(20).nullable(),
  marketCapUsd: z.number().finite().nullable(),
  price: z.number().finite().nullable(),
});
export type FmpScreenerCandidate = z.infer<typeof fmpScreenerCandidateSchema>;

export interface FetchFmpScreenerOptions {
  /** Both bounds are in USD (FMP normalises to USD for `marketCap`). */
  marketCapMin?: number | null;
  marketCapMax?: number | null;
  /** Case-insensitive; matched against FMP's `sector`. */
  includeSectors?: string[];
  excludeSectors?: string[];
  /** Region codes from the intake brief. */
  regions?: string[];
  /** Hard cap on rows returned by FMP before we filter locally. */
  limit?: number;
  /** For tests / mocks. */
  fetchImpl?: typeof fetch;
}

export interface FetchFmpScreenerResult {
  candidates: FmpScreenerCandidate[];
  requestCount: number;
  errors: string[];
}

const DEFAULT_LIMIT = 200;
const MIN_LIMIT = 20;
const MAX_LIMIT = 500;

function resolveCountries(regions: readonly string[] | undefined): string[] {
  if (!regions || regions.length === 0) return [];
  const out = new Set<string>();
  for (const r of regions) {
    const list = REGION_COUNTRY_MAP[r];
    if (list) list.forEach((c) => out.add(c));
  }
  return [...out];
}

function normaliseSector(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function looksLikeFundOrEtf(name: string, exchange: string | null | undefined): boolean {
  const n = name.toLowerCase();
  if (/\b(etf|fund|portfolio|trust|index)\b/.test(n)) return true;
  if (/\b(mutual fund|money market|bond fund)\b/.test(n)) return true;
  const ex = (exchange ?? "").toUpperCase();
  if (ex === "MUTUAL_FUND" || ex === "ETF") return true;
  return false;
}

/**
 * Build a single FMP screener request per country (FMP's `country` filter is
 * single-value on the stable endpoint). We de-dup by symbol after fanning out.
 */
export async function fetchFmpScreener(
  opts: FetchFmpScreenerOptions,
): Promise<FetchFmpScreenerResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    recordFmpScreenerRequest("error");
    return { candidates: [], requestCount: 0, errors: ["missing_api_key"] };
  }
  const doFetch = opts.fetchImpl ?? fetch;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(MIN_LIMIT, opts.limit ?? DEFAULT_LIMIT),
  );

  const countries = resolveCountries(opts.regions);
  const queries: URL[] = [];
  const scopes = countries.length > 0 ? countries : [null];
  for (const country of scopes) {
    const url = new URL(`${FMP_BASE}/company-screener`);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("isActivelyTrading", "true");
    if (opts.marketCapMin != null && Number.isFinite(opts.marketCapMin)) {
      url.searchParams.set("marketCapMoreThan", String(Math.floor(opts.marketCapMin)));
    }
    if (opts.marketCapMax != null && Number.isFinite(opts.marketCapMax)) {
      url.searchParams.set("marketCapLowerThan", String(Math.floor(opts.marketCapMax)));
    }
    if (country) url.searchParams.set("country", country);
    queries.push(url);
  }

  const merged = new Map<string, FmpScreenerCandidate>();
  const errors: string[] = [];
  const includeSet = new Set(opts.includeSectors?.map(normaliseSector).filter(Boolean));
  const excludeSet = new Set(opts.excludeSectors?.map(normaliseSector).filter(Boolean));

  let requestCount = 0;
  for (const url of queries) {
    requestCount++;
    try {
      const res = await doFetch(url.toString(), {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        recordFmpScreenerRequest(res.status === 429 ? "rate_limited" : "error");
        const body = (await res.text().catch(() => "")).slice(0, 300);
        if (res.status === 429) {
          noteScreeningProviderQuota({
            provider: "fmp",
            statusCode: 429,
            detail: body,
          });
        }
        errors.push(`fmp_${res.status}:${body}`);
        continue;
      }
      recordFmpScreenerRequest("ok");
      const json = (await res.json().catch(() => null)) as unknown;
      if (!Array.isArray(json)) {
        errors.push("fmp_bad_shape");
        continue;
      }
      for (const raw of json) {
        const parsed = fmpScreenerRowSchema.safeParse(raw);
        if (!parsed.success) continue;
        const row = parsed.data;
        const sectorLc = normaliseSector(row.sector);
        if (excludeSet.size > 0 && sectorLc && excludeSet.has(sectorLc)) continue;
        if (includeSet.size > 0) {
          if (!sectorLc || !includeSet.has(sectorLc)) continue;
        }
        const key = row.symbol.toUpperCase();
        if (merged.has(key)) continue;
        if (looksLikeFundOrEtf(row.companyName || key, row.exchangeShortName)) continue;
        merged.set(key, {
          ticker: key,
          name: row.companyName || key,
          sector: row.sector ?? null,
          industry: row.industry ?? null,
          country: row.country ?? null,
          exchange: row.exchangeShortName ?? null,
          marketCapUsd: row.marketCap ?? null,
          price: row.price ?? null,
        });
      }
    } catch (err) {
      recordFmpScreenerRequest("error");
      errors.push(err instanceof Error ? err.message : "fetch_error");
    }
  }

  const candidates = [...merged.values()].sort((a, b) => {
    const aCap = a.marketCapUsd ?? 0;
    const bCap = b.marketCapUsd ?? 0;
    return bCap - aCap;
  });
  recordHardDataUniverseSize(candidates.length);
  return { candidates, requestCount, errors };
}

export function marketCapRangeFromCondition(
  condition: string,
): { min: number | null; max: number | null } {
  // Accept forms like "300 – 15,000M USD", "300-15000M", "> 5,000M USD",
  // "< 20B", "300M–15B USD". We're deliberately forgiving because the user
  // can override via the intake chat.
  if (!condition) return { min: null, max: null };
  const cleaned = condition
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .toLowerCase();

  const parseValue = (raw: string): number | null => {
    const m = raw.match(/(-?\d+(?:\.\d+)?)([mb])?/);
    if (!m) return null;
    const value = parseFloat(m[1]);
    if (!Number.isFinite(value)) return null;
    const unit = m[2];
    if (unit === "b") return value * 1_000_000_000;
    if (unit === "m") return value * 1_000_000;
    // Bare numbers are assumed to be millions in this domain.
    return value * 1_000_000;
  };

  const rangeMatch = cleaned.match(
    /(\d+(?:\.\d+)?[mb]?)[^\d]+(\d+(?:\.\d+)?[mb]?)/,
  );
  if (rangeMatch) {
    return {
      min: parseValue(rangeMatch[1]),
      max: parseValue(rangeMatch[2]),
    };
  }
  if (cleaned.startsWith(">") || cleaned.startsWith(">=")) {
    return { min: parseValue(cleaned.replace(/^>=?/, "")), max: null };
  }
  if (cleaned.startsWith("<") || cleaned.startsWith("<=")) {
    return { min: null, max: parseValue(cleaned.replace(/^<=?/, "")) };
  }
  const single = parseValue(cleaned);
  return { min: single, max: null };
}
