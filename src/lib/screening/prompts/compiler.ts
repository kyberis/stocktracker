import type {
  AggregateIrBusinessOutput,
  AggregateTechnicalsOutput,
  AggregateWebSentimentOutput,
  HardDataOutput,
  PortfolioContextOutput,
  RiskOutput,
  ScreeningBrief,
} from "../schemas";
import { SCREENING_MAX_CANDIDATES } from "../constants";

export interface CompilerPromptContext {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  /** Optional IR aggregate from Agent 2 (E4). */
  irAggregate?: AggregateIrBusinessOutput | null;
  webAggregate?: AggregateWebSentimentOutput | null;
  technicalsAggregate?: AggregateTechnicalsOutput | null;
  portfolioContext?: PortfolioContextOutput | null;
  risk?: RiskOutput | null;
  locale: string;
}

/**
 * System prompt for the Compiler agent (HLD §4.5). Writes reader-facing prose
 * grounded in Hard Data + optional IR / Web / Technicals / Portfolio / Risk,
 * selects the final shortlist, and drafts educational per-candidate theses.
 */
export function buildCompilerPrompt(ctx: CompilerPromptContext): string {
  const b = ctx.brief;
  const finalN = b.candidateCount || SCREENING_MAX_CANDIDATES;
  const researchN = ctx.hardData.candidates.length;
  const summaryLines = [
    `intent: ${b.intent}`,
    b.includeSectors.length
      ? `include: ${b.includeSectors.join(", ")}`
      : "include: any sector",
    b.excludeSectors.length ? `exclude: ${b.excludeSectors.join(", ")}` : null,
    b.regions.length ? `regions: ${b.regions.join(", ")}` : "regions: any",
    `researchUniverse: ${researchN}`,
    `finalShortlist: ${finalN}`,
    b.riskProfile ? `riskProfile: ${b.riskProfile}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const extras: string[] = [];
  if (ctx.irAggregate && ctx.irAggregate.tickers.length > 0) {
    extras.push(
      "IR context is provided. Prefer names with clear businessOneLiner / catalysts; if contradictionWithHardData=true, note the tension briefly or demote.",
    );
  }
  if (ctx.webAggregate && ctx.webAggregate.tickers.length > 0) {
    extras.push(
      "Web & Sentiment context is provided. Prefer confirmed signals; mention single_source_unconfirmed only as a caveat. Do not invent news not in WEB_CONTEXT_JSON.",
    );
  }
  if (ctx.technicalsAggregate && ctx.technicalsAggregate.tickers.length > 0) {
    extras.push(
      "Technicals context is provided. Explain price context (52w distance, MA200, returns) in plain language when writing theses.",
    );
  }
  if (ctx.portfolioContext) {
    extras.push(
      "Portfolio Context is provided. Reflect new_position vs top_up_existing and illustrative allocation bands without sounding like an order.",
    );
  }
  if (ctx.risk) {
    extras.push(
      "Risk context is provided. Prefer fit over stretch/poor_fit; mention concentration flags in research framing only.",
    );
  }
  const extraSection =
    extras.length > 0 ? `\n\n${extras.join("\n")}` : "";

  return `You are the Compiler agent of the trefolio investment screening pipeline.

Your job: given a hard-data research universe of ${researchN} candidates (plus optional research context), SELECT the best ${finalN} for the user report and write (1) a short executive summary and (2) an educational thesis per SELECTED candidate. You do NOT invent tickers, prices, targets, or news. You do NOT recommend buying or selling.
${extraSection}

Brief: ${summaryLines}

Selection rules:
1. Choose at most ${finalN} tickers from the hard-data list (exact ticker strings). Prefer names that fit the brief AND have the strongest combined Hard Data + IR + Web + technicals + fit/risk evidence.
2. Order candidateBullets best-first (priority order for the report).
3. Do NOT emit bullets for research names you are dropping — only the final shortlist.
4. When evidence is thin for everyone, still pick the best ${finalN} by Hard Data rankScore and note gaps in the summary.

Thesis writing (selection phase — keep SHORT; a later evaluate step writes the full trefolio checklist):
- headline: 4–8 words capturing the angle.
- bullet: ONE short paragraph (about 280–700 characters) explaining why this name made the shortlist from Hard Data + IR/Web/fit evidence.
- Mention 1–2 present metrics only; do not invent figures.
- Do NOT write a full multi-section investment thesis here.
- Close implicitly as research framing — no buy/sell language.

Response language: ${ctx.locale}.

RESPONSE PROTOCOL (mandatory):
- Reply ONLY by calling the "submit_report_draft" function tool.
- summary: 3–4 short sentences (max 900 chars total) describing what was screened, how many names were researched, and how the final ${finalN} were selected. No prices. No return promises. No hallucinated news.
- candidateBullets: exactly the final shortlist (≤${finalN}), best-first. Each has ticker, headline, bullet (educational thesis as above).
- disclaimer: one-sentence reminder that this is not investment advice.
- locale: the response language you used.

If the candidate list is empty, return an empty candidateBullets array and a summary that says the brief produced no candidates.`;
}
