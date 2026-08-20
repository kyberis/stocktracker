import { getLatestScreeningAgentOutputUnscoped, insertScreeningAgentOutput } from "@/lib/db";
import { isFeatureEnabledForUser } from "@/lib/db/settings";
import {
  registerHandler,
  type HandlerContext,
  type HandlerResult,
  type StepHandler,
} from "@/lib/screening/orchestrator/handlers";
import { fetchFmpIrBundle, summariseIrBundleForLlm } from "@/lib/screening/data/fmp-ir";
import { fetchTavilySearch } from "@/lib/screening/data/tavily";
import {
  cleanCompanyNameForSearch,
  researchSymbolForListed,
} from "@/lib/screening/data/research-symbol";
import { insufficientSoft } from "@/lib/screening/thesis/insufficient-soft";
import { THESIS_HARD_DATA_KIND, THESIS_WEB_KIND } from "@/lib/screening/thesis/kinds";
import {
  thesisHardDataOutputSchema,
  thesisSoftAssessmentSchema,
  thesisWebOutputSchema,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export { THESIS_WEB_KIND };

function biasFromBundle(summary: Record<string, unknown>): "buying" | "selling" | "mixed" | "none" {
  const insiders = summary.insiders;
  if (!Array.isArray(insiders) || insiders.length === 0) return "none";
  let buys = 0;
  let sells = 0;
  for (const row of insiders) {
    const text = JSON.stringify(row).toLowerCase();
    if (text.includes("purchase") || text.includes("buy") || text.includes("acquir")) buys += 1;
    if (text.includes("sale") || text.includes("sell") || text.includes("dispos")) sells += 1;
  }
  if (buys > 0 && sells === 0) return "buying";
  if (sells > 0 && buys === 0) return "selling";
  if (buys > 0 && sells > 0) return "mixed";
  return "none";
}

const runThesisWebStep: StepHandler = async (
  ctx: HandlerContext,
): Promise<HandlerResult> => {
  const ticker = ctx.step.ticker?.toUpperCase().trim();
  if (!ticker) return { status: "error", errorMessage: "ticker_missing", fatal: true };
  const started = Date.now();
  const hdRow = await getLatestScreeningAgentOutputUnscoped(
    ctx.runId,
    THESIS_HARD_DATA_KIND,
  );
  const hd = hdRow
    ? thesisHardDataOutputSchema.safeParse(JSON.parse(hdRow.outputJson))
    : null;
  const candidate = hd?.success
    ? hd.data.candidates.find((c) => c.ticker.toUpperCase() === ticker)
    : undefined;
  const researchTicker = await researchSymbolForListed({
    ticker,
    companyName: candidate?.name,
    researchTicker: candidate?.researchTicker,
  });
  const tavilyOn = await isFeatureEnabledForUser(
    "screening_tavily_research_enabled",
    ctx.userId,
  );
  const [bundle, news] = await Promise.all([
    fetchFmpIrBundle({ ticker: researchTicker }),
    tavilyOn
      ? fetchTavilySearch({
          query: `${cleanCompanyNameForSearch(candidate?.name || ticker)} (${researchTicker}) news`,
          maxResults: 5,
          daysBack: 90,
          runId: ctx.runId,
        })
      : Promise.resolve({ results: [], errors: [] as string[] }),
  ]);
  const summary = summariseIrBundleForLlm(bundle) as Record<string, unknown>;
  const bias = biasFromBundle(summary);
  const now = new Date().toISOString();
  const f7 = thesisSoftAssessmentSchema.safeParse({
    asset_id: ticker,
    field_id: "EQ:F7",
    score: bias === "buying" ? 4 : bias === "selling" ? 2 : bias === "mixed" ? 3 : null,
    confidence: bias === "none" ? "insufficient_evidence" : "medium",
    rationale: `Insider net bias from FMP insider-trading search: ${bias}.`,
    evidence:
      bias === "none"
        ? []
        : [
            {
              quote: `Insider net bias classified as ${bias} from recent Form 4 activity in the FMP insider-trading search bundle.`,
              location: "FMP insider-trading/search",
              date: now.slice(0, 10),
            },
          ],
    assessed_at: now,
    assessed_by: "code:screening-thesis-web",
  });
  const i6News = news.results[0] ?? bundle.news[0];
  const i6Quote =
    i6News && "title" in i6News
      ? String(i6News.title || "").trim()
      : "";
  const i6Url =
    i6News && "url" in i6News ? String(i6News.url || "") : "";
  const i6: ThesisSoftAssessment = i6Quote.length >= 10
    ? thesisSoftAssessmentSchema.parse({
        asset_id: ticker,
        field_id: "EQ:I6",
        score: null,
        confidence: "low",
        rationale:
          "Media tone is context for variant perception, not a pillar score.",
        evidence: [
          {
            quote: i6Quote.slice(0, 280).padEnd(10, "."),
            location: i6Url || "FMP news/stock",
            url: i6Url || undefined,
            date: now.slice(0, 10),
          },
        ],
        assessed_at: now,
        assessed_by: "code:screening-thesis-web",
      })
    : insufficientSoft({
        ticker,
        field_id: "EQ:I6",
        assessed_by: "code:screening-thesis-web",
      });

  const output = thesisWebOutputSchema.parse({
    ticker,
    soft_assessments: [
      f7.success
        ? f7.data
        : insufficientSoft({
            ticker,
            field_id: "EQ:F7",
            assessed_by: "code:screening-thesis-web",
          }),
      i6,
    ],
    insider_net_bias: bias,
    gaps: news.errors.slice(0, 4),
  });
  await insertScreeningAgentOutput({
    userId: ctx.userId,
    runId: ctx.runId,
    agentKind: THESIS_WEB_KIND,
    ticker,
    outputJson: JSON.stringify(output),
    latencyMs: Date.now() - started,
  });
  return { status: "ok", payload: { ticker, bias } };
};

registerHandler(THESIS_WEB_KIND, runThesisWebStep);
