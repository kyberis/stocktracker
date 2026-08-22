import type {
  BalanceSheetReport,
  CashFlowReport,
  CompanyOverview,
  EarningsReport,
  IncomeStatementReport,
  StockDataProvider,
} from "@/lib/api-providers/types";
import type { FundamentalData } from "@/lib/types";
import { requireFeatureQuotaByUserId } from "@/lib/auth/guards";
import {
  getFundamentalsCache,
  upsertFundamentalsCache,
  type FundamentalsCacheProvider,
  type FundamentalsCacheType,
} from "@/lib/db/fundamentals-cache";
import { refundFeatureQuota } from "@/lib/feature-quotas";
import { isCacheableFundamentalData } from "@/lib/fundamentals/cache-quality";
import {
  resolveFundamentalsProvider,
  type FundamentalsDataBackend,
} from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { checkFmpRateLimit } from "@/lib/rate-limit";
import { deferTask } from "@/lib/task-runner";
import { findUserById } from "@/lib/db";

export type ShareFundamentalsScope = "full" | "valuation";

export const FUNDAMENTALS_MAX_AGE_DAYS = 7;

export const SHARE_FUNDAMENTALS_TYPES = [
  "overview",
  "income",
  "balance",
  "cashflow",
  "earnings",
] as const satisfies readonly FundamentalsCacheType[];

export type ShareFundamentalsType = (typeof SHARE_FUNDAMENTALS_TYPES)[number];

export type ShareFundamentalsErrorCode =
  | "quota_exceeded"
  | "rate_limited"
  | "not_found"
  | "invalid_input"
  | "user_not_found";

export type ShareFundamentalsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ShareFundamentalsErrorCode };

export interface ShareFundamentalsBundle {
  symbol: string;
  overview: CompanyOverview | null;
  income: FundamentalData<IncomeStatementReport> | null;
  balance: FundamentalData<BalanceSheetReport> | null;
  cashflow: FundamentalData<CashFlowReport> | null;
  earnings: FundamentalData<EarningsReport> | null;
  provider: FundamentalsCacheProvider;
  cached: boolean;
  fetchedAt: string;
}

type StatementType = Exclude<ShareFundamentalsType, "overview">;

type CachedPayload =
  | CompanyOverview
  | FundamentalData<IncomeStatementReport>
  | FundamentalData<BalanceSheetReport>
  | FundamentalData<CashFlowReport>
  | FundamentalData<EarningsReport>;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function isFundamentalsFresh(updatedAt: string, maxAgeDays = FUNDAMENTALS_MAX_AGE_DAYS): boolean {
  const parsed = Date.parse(updatedAt.replace(" ", "T"));
  if (!Number.isFinite(parsed)) return false;
  const ageMs = Date.now() - parsed;
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function latestUpdatedAt(timestamps: string[]): string {
  if (timestamps.length === 0) return new Date().toISOString().replace("T", " ").slice(0, 19);
  return timestamps.sort((a, b) => Date.parse(b.replace(" ", "T")) - Date.parse(a.replace(" ", "T")))[0]!;
}

async function readCachedType<T extends CachedPayload>(
  symbol: string,
  type: ShareFundamentalsType,
  fresh: boolean,
): Promise<{ data: T | null; updatedAt: string | null; provider: FundamentalsCacheProvider | null }> {
  if (fresh) return { data: null, updatedAt: null, provider: null };
  const row = await getFundamentalsCache(symbol, type);
  if (!row || !isFundamentalsFresh(row.updatedAt)) {
    return { data: null, updatedAt: null, provider: null };
  }
  try {
    return {
      data: JSON.parse(row.dataJson) as T,
      updatedAt: row.updatedAt,
      provider: row.provider,
    };
  } catch {
    return { data: null, updatedAt: null, provider: null };
  }
}

type FetchInvoker = (
  provider: StockDataProvider,
  symbol: string,
) => Promise<CachedPayload | null>;

const FETCH_INVOKERS: Record<ShareFundamentalsType, FetchInvoker> = {
  overview: (provider, symbol) => provider.getOverview?.(symbol) ?? Promise.resolve(null),
  income: (provider, symbol) => provider.getIncomeStatement?.(symbol) ?? Promise.resolve(null),
  balance: (provider, symbol) => provider.getBalanceSheet?.(symbol) ?? Promise.resolve(null),
  cashflow: (provider, symbol) => provider.getCashFlow?.(symbol) ?? Promise.resolve(null),
  earnings: (provider, symbol) => provider.getEarnings?.(symbol) ?? Promise.resolve(null),
};

async function fetchType(
  provider: StockDataProvider,
  backend: FundamentalsDataBackend,
  symbol: string,
  type: ShareFundamentalsType,
): Promise<{ data: CachedPayload | null; backend: FundamentalsDataBackend }> {
  try {
    const data = await FETCH_INVOKERS[type](provider, symbol);
    return { data, backend };
  } catch (err) {
    console.error(
      `[share-fundamentals] Provider fetch failed for ${symbol}/${type}:`,
      err instanceof Error ? err.message : err,
    );
    return { data: null, backend };
  }
}

async function persistType(
  symbol: string,
  type: ShareFundamentalsType,
  data: CachedPayload,
  providerTag: FundamentalsCacheProvider,
): Promise<void> {
  if (!isCacheableFundamentalData(type, data as never, providerTag)) return;
  await upsertFundamentalsCache(symbol, type, data, providerTag);
}

function typesForScope(scope: ShareFundamentalsScope): readonly ShareFundamentalsType[] {
  return scope === "valuation" ? ["overview"] : SHARE_FUNDAMENTALS_TYPES;
}

export async function ensureShareFundamentals(
  userId: string,
  symbolInput: string,
  opts?: { fresh?: boolean; scope?: ShareFundamentalsScope },
): Promise<ShareFundamentalsResult<ShareFundamentalsBundle>> {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol) {
    return { ok: false, error: "symbol is required", code: "invalid_input" };
  }

  const user = await findUserById(userId);
  if (!user) return { ok: false, error: "User not found", code: "user_not_found" };

  const fresh = opts?.fresh === true;
  const scope = opts?.scope ?? "full";
  const types = typesForScope(scope);
  const cachedParts: Partial<Record<ShareFundamentalsType, CachedPayload>> = {};
  const updatedAts: string[] = [];
  let providerTag: FundamentalsCacheProvider | null = null;

  for (const type of types) {
    const cached = await readCachedType<CachedPayload>(symbol, type, fresh);
    if (cached.data) {
      cachedParts[type] = cached.data;
      if (cached.updatedAt) updatedAts.push(cached.updatedAt);
      providerTag = providerTag ?? cached.provider;
    }
  }

  const missingTypes = types.filter((type) => !cachedParts[type]);
  let didFetch = false;

  if (missingTypes.length > 0) {
    const quota = await requireFeatureQuotaByUserId(userId, "fundamentals");
    if (!quota.allowed) {
      return {
        ok: false,
        error: "Monthly fundamentals quota exceeded. Upgrade or try again next period.",
        code: "quota_exceeded",
      };
    }

    const { provider: primary, backend: primaryBackend } = await resolveFundamentalsProvider(userId);
    let provider = primary;
    let backend = primaryBackend;

    if (backend === "fmp" && user.role !== "admin") {
      const rl = await checkFmpRateLimit(userId);
      if (!rl.allowed) {
        await refundFeatureQuota(userId, "fundamentals");
        return { ok: false, error: "FMP rate limit exceeded. Try again shortly.", code: "rate_limited" };
      }
    }

    for (const type of missingTypes) {
      let result = await fetchType(provider, backend, symbol, type);
      if (!result.data && backend === "fmp") {
        const yahooResolved = await resolveFundamentalsProvider(null);
        if (yahooResolved.backend === "yahoo") {
          result = await fetchType(yahooResolved.provider, "yahoo", symbol, type);
          provider = yahooResolved.provider;
          backend = "yahoo";
        }
      }

      if (result.data) {
        cachedParts[type] = result.data;
        const tag = result.backend as FundamentalsCacheProvider;
        providerTag = tag;
        await persistType(symbol, type, result.data, tag);
        updatedAts.push(new Date().toISOString().replace("T", " ").slice(0, 19));
        didFetch = true;
      }
    }

    if (didFetch && provider.callCount && backend === "fmp") {
      deferTask(() => recordMarketDataUsageAsync(userId, "fmp", provider.callCount!));
    }
  }

  const overview = (cachedParts.overview as CompanyOverview | undefined) ?? null;
  if (!overview) {
    if (didFetch) await refundFeatureQuota(userId, "fundamentals");
    return {
      ok: false,
      error: `No fundamental data for ${symbol}. Try a liquid ticker (e.g. AAPL, KO, MSFT).`,
      code: "not_found",
    };
  }

  return {
    ok: true,
    data: {
      symbol,
      overview,
      income: (cachedParts.income as FundamentalData<IncomeStatementReport> | undefined) ?? null,
      balance: (cachedParts.balance as FundamentalData<BalanceSheetReport> | undefined) ?? null,
      cashflow: (cachedParts.cashflow as FundamentalData<CashFlowReport> | undefined) ?? null,
      earnings: (cachedParts.earnings as FundamentalData<EarningsReport> | undefined) ?? null,
      provider: providerTag ?? "yahoo",
      cached: !didFetch,
      fetchedAt: latestUpdatedAt(updatedAts),
    },
  };
}

export async function ensureShareFundamentalsBatch(
  userId: string,
  symbols: string[],
  opts?: { fresh?: boolean; concurrency?: number; scope?: ShareFundamentalsScope },
): Promise<ShareFundamentalsResult<ShareFundamentalsBundle>[]> {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
  const concurrency = opts?.concurrency ?? (opts?.scope === "valuation" ? 5 : 3);
  const results: ShareFundamentalsResult<ShareFundamentalsBundle>[] = [];

  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((symbol) => ensureShareFundamentals(userId, symbol, opts)),
    );
    results.push(...chunkResults);
  }

  return results;
}

/** Persist overview + statements after a moat fetch (shared cache for all users). */
export async function persistShareFundamentalsFromMoatFetch(
  symbol: string,
  input: {
    overview: CompanyOverview;
    income: FundamentalData<IncomeStatementReport>;
    balance: FundamentalData<BalanceSheetReport>;
    cashflow: FundamentalData<CashFlowReport>;
    earnings: FundamentalData<EarningsReport>;
    provider: FundamentalsCacheProvider;
  },
): Promise<void> {
  const sym = normalizeSymbol(symbol);
  await Promise.all([
    persistType(sym, "overview", input.overview, input.provider),
    persistType(sym, "income", input.income, input.provider),
    persistType(sym, "balance", input.balance, input.provider),
    persistType(sym, "cashflow", input.cashflow, input.provider),
    persistType(sym, "earnings", input.earnings, input.provider),
  ]);
}
