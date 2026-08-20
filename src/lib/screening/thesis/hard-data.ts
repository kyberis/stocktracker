import {
  insertAiLog,
  insertScreeningAgentOutput,
} from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import {
  fetchFmpScreener,
  marketCapRangeFromCondition,
} from "@/lib/screening/data/fmp-screening";
import { seedFocusCandidate } from "@/lib/screening/data/seed-focus-candidate";
import { enrichHardDataCandidates } from "@/lib/screening/data/enrich-candidates";
import { runHardDataAgent, selectRankUniverse } from "@/lib/screening/agents/hard-data";
import { applyBriefFitToCandidates } from "@/lib/screening/brief-fit";
import { resolveScreeningGatewayModel } from "@/lib/screening/resolve-model";
import {
  screeningBriefSchema,
  type HardDataCandidate,
  type ScreeningBrief,
} from "@/lib/screening/schemas";
import {
  HARD_DATA_FMP_FETCH_LIMIT,
  HARD_DATA_RANK_UNIVERSE,
  IR_FANOUT_MAX,
  SCREENING_MAX_CANDIDATES,
} from "@/lib/screening/constants";
import { deriveFactsFromCandidate } from "@/lib/screening/thesis/derive-facts";
import { insertThesisFanout } from "@/lib/screening/thesis/insert-fanout";
import { THESIS_HARD_DATA_KIND } from "@/lib/screening/thesis/kinds";
import { thesisHardDataOutputSchema } from "@/lib/screening/thesis/schemas";

export { THESIS_HARD_DATA_KIND };

function parseBrief(briefJson: string): ScreeningBrief | null {
  try {
    const res = screeningBriefSchema.safeParse(JSON.parse(briefJson));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

const runThesisHardDataStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const brief = parseBrief(ctx.briefJson);
  if (!brief) {
    return { status: "error", errorMessage: "brief_unavailable", fatal: true };
  }

  const started = Date.now();
  const asOf = new Date().toISOString();
  let candidates: HardDataCandidate[] = [];
  let universeSize = 0;
  let gaps: string[] = [];

  if (brief.intent === "analyze" && brief.focusTicker) {
    const seed = await seedFocusCandidate(brief.focusTicker, {
      companyName: brief.focusCompanyName,
    });
    if (!seed) {
      return {
        status: "error",
        errorMessage: "focus_ticker_unresolved",
        fatal: true,
      };
    }
    candidates = [
      {
        ticker: seed.ticker,
        name: brief.focusCompanyName?.trim() || seed.name,
        sector: seed.sector,
        industry: seed.industry,
        country: seed.country,
        marketCapUsd: seed.marketCapUsd,
        price: seed.price,
        rankScore: 100,
        rankReason: `Single-company analysis of ${seed.ticker}.`,
        researchTicker: seed.researchTicker ?? null,
      },
    ];
    universeSize = 1;
    try {
      candidates = applyBriefFitToCandidates(
        brief,
        await enrichHardDataCandidates(candidates),
      );
    } catch (err) {
      gaps.push(
        `enrich_failed:${err instanceof Error ? err.message.slice(0, 80) : "unknown"}`,
      );
    }
  } else {
    const mcapCriterion = brief.criteria.find((c) => c.key === "marketCap");
    const range = mcapCriterion
      ? marketCapRangeFromCondition(mcapCriterion.condition)
      : { min: null, max: null };
    const screenerResult = await fetchFmpScreener({
      marketCapMin: range.min,
      marketCapMax: range.max,
      includeSectors: brief.includeSectors,
      excludeSectors: brief.excludeSectors,
      regions: brief.regions,
      limit: HARD_DATA_FMP_FETCH_LIMIT,
    });
    const rankUniverse = selectRankUniverse(
      screenerResult.candidates,
      HARD_DATA_RANK_UNIVERSE,
    );
    universeSize = screenerResult.candidates.length;
    const runner = await runHardDataAgent({
      brief: { ...brief, candidateCount: SCREENING_MAX_CANDIDATES },
      universe: rankUniverse,
    });
    candidates = runner.output.candidates.slice(0, IR_FANOUT_MAX);
    if (runner.errorMessage) gaps.push(runner.errorMessage);
    try {
      if (candidates.length > 0) {
        candidates = applyBriefFitToCandidates(
          brief,
          await enrichHardDataCandidates(candidates),
        );
      }
    } catch (err) {
      gaps.push(
        `enrich_failed:${err instanceof Error ? err.message.slice(0, 80) : "unknown"}`,
      );
    }
  }

  const derived = candidates.map((c) => deriveFactsFromCandidate(c, asOf));
  const facts = derived.flatMap((d) => d.facts);
  const factGaps = derived.flatMap((d) => d.gaps);
  const output = thesisHardDataOutputSchema.parse({
    status: candidates.length === 0 ? "empty" : "ok",
    universeSize,
    tickers: candidates.map((c) => c.ticker),
    candidates,
    facts,
    gaps: [...gaps, ...factGaps].slice(0, 16),
    locale: brief.locale,
    generatedAt: asOf,
  });

  try {
    await insertScreeningAgentOutput({
      userId: ctx.userId,
      runId: ctx.runId,
      agentKind: THESIS_HARD_DATA_KIND,
      outputJson: JSON.stringify(output),
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    console.error(
      "[thesis/hard-data] persist failed",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await insertAiLog({
      userId: ctx.userId,
      source: "screening_thesis_hard_data",
      model: await resolveScreeningGatewayModel("screening_hard_data"),
      promptSystem: "thesis_hard_data",
      promptUser: `universe=${universeSize}`,
      response: JSON.stringify({ tickers: output.tickers }).slice(0, 4000),
      durationMs: Date.now() - started,
      status: "success",
      errorMessage: "",
    });
  } catch {
    // best-effort
  }

  let irFanout = 0;
  try {
    const real = await isFeatureEnabledForUser(
      "screening_pipeline_real_enabled",
      ctx.userId,
    );
    if (real && output.tickers.length > 0) {
      const inserted = await insertThesisFanout(ctx.runId, output.tickers);
      irFanout = inserted.irFanout;
      if (irFanout > 0) {
        void import("@/lib/screening/orchestrator/drain-run").then(
          ({ continueScreeningRunInBackground }) => {
            continueScreeningRunInBackground(ctx.runId);
          },
        );
      }
    }
  } catch (err) {
    console.error(
      "[thesis/hard-data] fan-out failed",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    status: "ok",
    payload: {
      universeSize,
      candidateCount: candidates.length,
      irFanout,
      mode: brief.intent === "analyze" ? "analyze" : "screen",
    },
  };
};

registerHandler(THESIS_HARD_DATA_KIND, runThesisHardDataStep);
