import {
  getLatestScreeningAgentOutputUnscoped,
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

/**
 * Post-Compiler deep-dive: Tavily Research (cache-first) for the ≤5 shortlist
 * tickers. Enrichment is consumed at report compose time.
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
  for (const ticker of tickers) {
    const bundle = await getOrFetchCompanyResearch({
      ticker,
      companyName: nameByTicker.get(ticker) ?? ticker,
      runId: ctx.runId,
      model: "mini",
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
    });
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
    },
  };
};

registerHandler(SHORTLIST_RESEARCH_AGENT_KIND, runShortlistResearchStep);
