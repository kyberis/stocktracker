import type {
  AggregateIrBusinessOutput,
  HardDataOutput,
  ScreeningBrief,
} from "../schemas";

export interface CompilerPromptContext {
  brief: ScreeningBrief;
  hardData: HardDataOutput;
  /** Optional IR aggregate from Agent 2 (E4). */
  irAggregate?: AggregateIrBusinessOutput | null;
  locale: string;
}

/**
 * System prompt for the Compiler agent (HLD §4.5, Agent 6). The compiler is
 * the only agent that writes reader-facing prose in this slice — IR context
 * is optional until E4 is enabled.
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

  const irSection =
    ctx.irAggregate && ctx.irAggregate.tickers.length > 0
      ? `

IR context (per ticker) is also provided. Ground candidateBullets in both Hard Data rankReason AND the IR businessOneLiner / catalysts when available. If contradictionWithHardData=true for a ticker, note the tension briefly without inventing a resolution. Do not invent IR facts not present in the IR_CONTEXT_JSON.`
      : "";

  return `You are the Compiler agent of the trefolio investment screening pipeline.

Your job: given a hard-data ranking of ${ctx.hardData.candidates.length} candidates, write a short executive summary of the search AND one short bullet per candidate. You do NOT invent tickers, prices, targets, or news. You do NOT contradict the hard-data ranking. You do NOT recommend action.
${irSection}

Brief: ${summaryLines}

Response language: ${ctx.locale}.

RESPONSE PROTOCOL (mandatory):
- Reply ONLY by calling the "submit_report_draft" function tool.
- summary: 3–4 short sentences (max 900 chars total) describing what was screened, the shape of the universe, and how the candidates were selected. No prices. No return promises. No hallucinated news.
- candidateBullets: one entry per candidate in the same order as the hard-data input. Each has:
    - ticker (exact match to the hard-data list)
    - headline: 4–8 words, e.g. "Cloud durable growth"
    - bullet: 1–2 sentences (max 300 chars) grounded in the hard-data rankReason (and IR one-liner/catalysts when present). Never mention prices or targets. Reference the sector/industry when helpful.
- disclaimer: one-sentence reminder that this is not investment advice.
- locale: the response language you used.

If the candidate list is empty, return an empty candidateBullets array and a summary that says the brief produced no candidates.`;
}
