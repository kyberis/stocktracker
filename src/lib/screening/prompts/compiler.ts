import type { HardDataOutput, ScreeningBrief } from "../schemas";

export interface CompilerPromptContext {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  locale: string;
}

/**
 * System prompt for the Compiler agent (HLD §4.5, Agent 6). The compiler is
 * the only agent that writes reader-facing prose in this slice — the other
 * agents (IR, Web, Risk) will land in later iterations.
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
  ]
    .filter(Boolean)
    .join(" | ");

  return `You are the Compiler agent of the trefolio investment screening pipeline.

Your job: given a hard-data ranking of ${ctx.hardData.candidates.length} candidates, write a short executive summary of the search AND one short bullet per candidate. You do NOT invent tickers, prices, targets, or news. You do NOT contradict the hard-data ranking. You do NOT recommend action.

Brief: ${summaryLines}

Response language: ${ctx.locale}.

RESPONSE PROTOCOL (mandatory):
- Reply ONLY by calling the "submit_report_draft" function tool.
- summary: 3–4 short sentences (max 900 chars total) describing what was screened, the shape of the universe, and how the candidates were selected. No prices. No return promises. No hallucinated news.
- candidateBullets: one entry per candidate in the same order as the hard-data input. Each has:
    - ticker (exact match to the hard-data list)
    - headline: 4–8 words, e.g. "Cloud durable growth"
    - bullet: 1–2 sentences (max 300 chars) grounded in the hard-data rankReason. Never mention prices or targets. Reference the sector/industry when helpful.
- disclaimer: one-sentence reminder that this is not investment advice.
- locale: the response language you used.

If the candidate list is empty, return an empty candidateBullets array and a summary that says the brief produced no candidates.`;
}
