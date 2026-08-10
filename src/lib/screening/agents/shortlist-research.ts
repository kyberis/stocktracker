import {
  getLatestScreeningAgentOutputUnscoped,
  heartbeatStepLease,
  insertScreeningAgentOutput,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import { getOrFetchCompanyResearch } from "@/lib/screening/data/company-research";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import {
  compilerReportDraftSchema,
  hardDataOutputSchema,
  shortlistResearchOutputSchema,
  type ShortlistResearchOutput,
  type ShortlistResearchTicker,
} from "@/lib/screening/schemas";

export const SHORTLIST_RESEARCH_AGENT_KIND = "shortlist_research";

/** Leave headroom under the heavy-step lease / function maxDuration. */
const WALL_BUDGET_MS = 150_000;
/** Cap each live Tavily Research call so 5 tickers cannot serialize past the budget. */
const PER_TICKER_TIMEOUT_MS = 55_000;
const HEARTBEAT_LEASE_MS = 90_000;

/**
 * Post-Compiler deep-dive: Tavily Research (cache-first) for the ≤5 shortlist
 * tickers. Enrichment is consumed at report compose time.
 *
 * Bound wall time and heartbeat the lease so a dropped waitUntil / killed
 * isolate does not leave the UI on a zombie `running` step for minutes.
 */
export const runShortlistResearchStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const enabled = await isFeatureEnabledForUser(
    "screening_tavily_research_enabled",
    ctx.userId,
  );
  if (!enabled) {
    const empty: ShortlistResearchOutput = {
      tickers: [],
      generatedAt: new Date().toISOString(),
    };
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: SHORTLIST_RESEARCH_AGENT_KIND,
      outputJson: JSON.stringify(empty),
      latencyMs: 0,
    });
    return { status: "ok", payload: { skipped: true, reason: "flag_off" } };
  }

  const started = Date.now();
  const ownerId = ctx.step.leaseOwner;
  const compilerRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    "compiler",
  );
  const hardDataRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    "hard_data",
  );

  let tickers: string[] = [];
  if (compilerRow) {
    try {
      const draft = compilerReportDraftSchema.safeParse(
        JSON.parse(compilerRow.outputJson),
      );
      if (draft.success) {
        tickers = draft.data.candidateBullets
          .map((c) => c.ticker.toUpperCase())
          .slice(0, 5);
      }
    } catch {
      // fall through
    }
  }

  const nameByTicker = new Map<string, string>();
  if (hardDataRow) {
    try {
      const hd = hardDataOutputSchema.safeParse(JSON.parse(hardDataRow.outputJson));
      if (hd.success) {
        for (const c of hd.data.candidates) {
          nameByTicker.set(c.ticker.toUpperCase(), c.name || c.ticker);
        }
      }
    } catch {
      // ignore
    }
  }

  const researched: ShortlistResearchTicker[] = [];
  let truncated = false;
  for (const ticker of tickers) {
    const elapsed = Date.now() - started;
    const remaining = WALL_BUDGET_MS - elapsed;
    if (remaining < 8_000) {
      truncated = true;
      break;
    }

    if (ownerId) {
      await heartbeatStepLease({
        stepId: ctx.step.id,
        ownerId,
        leaseMs: HEARTBEAT_LEASE_MS,
      }).catch(() => {
        // best-effort — do not fail the research step on heartbeat errors
      });
    }

    const timeoutMs = Math.min(PER_TICKER_TIMEOUT_MS, remaining);
    const bundle = await getOrFetchCompanyResearch({
      ticker,
      companyName: nameByTicker.get(ticker) ?? ticker,
      runId: ctx.runId,
      model: "mini",
      timeoutMs,
    });
    researched.push({
      ticker,
      businessOneLiner: bundle.businessOneLiner,
      segments: bundle.segments,
      catalysts: bundle.catalysts,
      guidanceSummary: bundle.guidanceSummary,
      competitors: bundle.competitors,
      sources: bundle.sources,
      fromCache: bundle.fromCache,
      creditsUsed: bundle.creditsUsed,
      errors: bundle.errors,
      moatEvidence: bundle.moatEvidence,
      capitalAllocation: bundle.capitalAllocation,
      growthDrivers: bundle.growthDrivers,
      addressableMarket: bundle.addressableMarket,
      keyRisks: bundle.keyRisks,
      analystCoverageNote: bundle.analystCoverageNote,
      pricingPowerEvidence: bundle.pricingPowerEvidence,
    });
  }

  if (truncated && tickers.length > researched.length) {
    console.warn(
      `[screening/shortlist-research] wall budget hit run=${ctx.runId} done=${researched.length}/${tickers.length}`,
    );
  }

  const output: ShortlistResearchOutput = {
    tickers: researched,
    generatedAt: new Date().toISOString(),
  };
  const parsed = shortlistResearchOutputSchema.safeParse(output);
  const payload = parsed.success ? parsed.data : output;

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: SHORTLIST_RESEARCH_AGENT_KIND,
      outputJson: JSON.stringify(payload),
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    console.error(
      "[screening/shortlist-research] persist failed",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    status: "ok",
    payload: {
      tickerCount: researched.length,
      cacheHits: researched.filter((t) => t.fromCache).length,
      creditsUsed: researched.reduce((s, t) => s + t.creditsUsed, 0),
      truncated,
    },
  };
};

registerHandler(SHORTLIST_RESEARCH_AGENT_KIND, runShortlistResearchStep);
