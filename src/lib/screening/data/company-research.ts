/**
 * Shared company research: cache-first Tavily Research for screening + /analisis.
 */

import {
  getScreeningResearchCache,
  upsertScreeningResearchCache,
} from "@/lib/db/screening-research-cache";
import {
  fetchTavilyCompanyResearch,
  type TavilyCompanyResearchResult,
  type TavilyResearchModel,
} from "@/lib/screening/data/tavily-research";

export interface GetOrFetchCompanyResearchOpts {
  ticker: string;
  companyName?: string | null;
  runId?: string | null;
  model?: TavilyResearchModel;
  /** When true, skip live Research and only return cache. */
  cacheOnly?: boolean;
  fetchImpl?: typeof fetch;
}

export interface CompanyResearchBundle extends TavilyCompanyResearchResult {
  fromCache: boolean;
}

export async function getOrFetchCompanyResearch(
  opts: GetOrFetchCompanyResearchOpts,
): Promise<CompanyResearchBundle> {
  const ticker = opts.ticker.toUpperCase().trim();
  const cached = await getScreeningResearchCache(ticker);
  if (cached) {
    try {
      const payload = JSON.parse(cached.payloadJson) as TavilyCompanyResearchResult;
      return {
        ...payload,
        ticker,
        moatEvidence: payload.moatEvidence ?? "",
        capitalAllocation: payload.capitalAllocation ?? "",
        growthDrivers: payload.growthDrivers ?? "",
        addressableMarket: payload.addressableMarket ?? "",
        keyRisks: payload.keyRisks ?? [],
        analystCoverageNote: payload.analystCoverageNote ?? "",
        pricingPowerEvidence: payload.pricingPowerEvidence ?? "",
        fromCache: true,
        creditsUsed: 0,
        errors: payload.errors ?? [],
        latencyMs: 0,
      };
    } catch {
      // fall through to live fetch
    }
  }

  if (opts.cacheOnly) {
    return {
      ticker,
      businessOneLiner: "",
      segments: [],
      catalysts: [],
      guidanceSummary: "",
      competitors: [],
      moatEvidence: "",
      capitalAllocation: "",
      growthDrivers: "",
      addressableMarket: "",
      keyRisks: [],
      analystCoverageNote: "",
      pricingPowerEvidence: "",
      sources: [],
      rawContent: "",
      model: opts.model ?? "mini",
      creditsUsed: 0,
      requestId: null,
      errors: ["cache_miss"],
      latencyMs: 0,
      fromCache: false,
    };
  }

  const live = await fetchTavilyCompanyResearch({
    ticker,
    companyName: opts.companyName,
    model: opts.model ?? "mini",
    runId: opts.runId,
    fetchImpl: opts.fetchImpl,
  });

  if (live.businessOneLiner || live.rawContent || live.sources.length > 0) {
    try {
      await upsertScreeningResearchCache({
        ticker,
        payload: live,
        model: live.model,
        creditsUsed: live.creditsUsed,
      });
    } catch (err) {
      console.error(
        "[screening/research-cache] upsert failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { ...live, fromCache: false };
}
