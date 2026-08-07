import type {
  AggregateIrBusinessOutput,
  AggregateWebSentimentOutput,
  HardDataOutput,
  PortfolioContextOutput,
  RiskOutput,
  ScreeningBrief,
} from "../schemas";

export interface CompilerPromptContext {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  /** Optional IR aggregate from Agent 2 (E4). */
  irAggregate?: AggregateIrBusinessOutput | null;
  webAggregate?: AggregateWebSentimentOutput | null;
  portfolioContext?: PortfolioContextOutput | null;
  risk?: RiskOutput | null;
  locale: string;
}

/**
 * System prompt for the Compiler agent (HLD §4.5). Writes reader-facing prose
 * grounded in Hard Data + optional IR / Web / Portfolio Context / Risk.
 */
export function buildCompilerPrompt(ctx: CompilerPromptContext): string {
  const b = ctx.brief;
  const summaryLines = [
    `intent: ${b.intent}`,
    b.includeSectors.length
      ? `include: ${b.includeSectors.join(", ")}`
      : "include: any sector",
    b.excludeSectors.length ? `exclude: ${b.excludeSectors.join(", ")}` : null,
    b.regions.length ? `regions: ${b.regions.join(", ")}` : "regions: any",
    `candidateCount: ${b.candidateCount}`,
    b.riskProfile ? `riskProfile: ${b.riskProfile}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const extras: string[] = [];
  if (ctx.irAggregate && ctx.irAggregate.tickers.length > 0) {
    extras.push(
      "IR context is provided. Ground bullets in Hard Data rankReason AND IR businessOneLiner / catalysts when available. If contradictionWithHardData=true, note the tension briefly.",
    );
  }
  if (ctx.webAggregate && ctx.webAggregate.tickers.length > 0) {
    extras.push(
      "Web & Sentiment context is provided. Prefer confirmed signals; mention single_source_unconfirmed only as a caveat. Do not invent news not in WEB_CONTEXT_JSON.",
    );
  }
  if (ctx.portfolioContext) {
    extras.push(
      "Portfolio Context is provided. Reflect new_position vs top_up_existing and illustrative allocation bands without sounding like an order.",
    );
  }
  if (ctx.risk) {
    extras.push(
      "Risk context is provided. Mention suitability (fit/stretch/poor_fit) and concentration flags in research framing only.",
    );
  }
  const extraSection =
    extras.length > 0 ? `\n\n${extras.join("\n")}` : "";

  return `You are the Compiler agent of the trefolio investment screening pipeline.

Your job: given a hard-data ranking of ${ctx.hardData.candidates.length} candidates (plus optional research context), write a short executive summary of the search AND one short bullet per candidate. You do NOT invent tickers, prices, targets, or news. You do NOT contradict the hard-data ranking. You do NOT recommend action.
${extraSection}

Brief: ${summaryLines}

Response language: ${ctx.locale}.

RESPONSE PROTOCOL (mandatory):
- Reply ONLY by calling the "submit_report_draft" function tool.
- summary: 3–4 short sentences (max 900 chars total) describing what was screened, the shape of the universe, and how the candidates were selected. No prices. No return promises. No hallucinated news.
- candidateBullets: one entry per candidate in the same order as the hard-data input. Each has:
    - ticker (exact match to the hard-data list)
    - headline: 4–8 words, e.g. "Cloud durable growth"
    - bullet: 1–2 sentences (max 300 chars) grounded in hard-data rankReason and available IR/Web/fit/risk context. Never mention prices or targets.
- disclaimer: one-sentence reminder that this is not investment advice.
- locale: the response language you used.

If the candidate list is empty, return an empty candidateBullets array and a summary that says the brief produced no candidates.`;
}
