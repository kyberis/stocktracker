import type { ScreeningBrief } from "../schemas";

/**
 * System prompt for the Hard Data agent (HLD §4.5, Agent 1).
 *
 * The agent receives:
 *   1. The user's brief (already validated by Intake).
 *   2. A candidate universe fetched from FMP (already filtered by market cap
 *      and region — the sector filter is intentionally lax so the LLM can
 *      apply the brief's include/exclude decisions with more nuance).
 *
 * The agent MUST reply by calling the `submit_hard_data` function tool. No
 * prose replies. The tool schema mirrors the Zod contract so the runner does
 * not need to coerce the output shape.
 */
export interface HardDataPromptContext {
  brief: ScreeningBrief;
  /** Locale hint for the `rankReason` field. */
  locale: string;
  /** Size of the universe passed to the model, for the "gap" description. */
  universeSize: number;
}

export function buildHardDataPrompt(ctx: HardDataPromptContext): string {
  const b = ctx.brief;
  const criteriaLines = b.criteria
    .map((c) => `- ${c.key}: ${c.condition} (source=${c.source})`)
    .join("\n");
  const include =
    b.includeSectors.length > 0
      ? b.includeSectors.join(", ")
      : "no sector preference";
  const exclude =
    b.excludeSectors.length > 0
      ? b.excludeSectors.join(", ")
      : "no exclusions";
  const regions = b.regions.length > 0 ? b.regions.join(", ") : "any region";

  return `You are the Hard Data agent of the trefolio investment screening pipeline.

Your ONLY job is to rank a universe of ${ctx.universeSize} candidate tickers against the user's brief and return the top ${b.candidateCount}. You do not fetch external data, propose price targets, or write narrative prose.

Brief summary:
- intent: ${b.intent}
- include sectors: ${include}
- exclude sectors: ${exclude}
- regions: ${regions}
- desired candidate count: ${b.candidateCount}
- criteria:
${criteriaLines || "(none — free ranking based on defaults)"}

Ranking heuristics (deterministic tie-breakers first, LLM judgement second):
1. Filter OUT anything in the excluded sectors, even if the universe row leaked in.
2. Prefer tickers whose sector or industry is a natural fit for the brief.
3. Prefer smaller / mid-cap names inside the market-cap window unless the brief explicitly asks for larger.
4. When moatScorePct / moatVerdict are present, treat higher MOAT as a quality signal (trefolio Warren MOAT cache). Prefer Wide/Pass moats when the brief asks for quality.
5. When hasAnalisis / analysisSnippet are present, use them as business-quality context from trefolio /analisis — do not invent facts beyond the snippet.
6. Use rankScore in [0, 100]; monotonic within the response. Higher is better.
7. rankReason is a short (max 240 chars) locale-aware sentence explaining why the ticker is a fit, referencing at most one factor from the brief (or MOAT/analisis when used). Reply-language: ${ctx.locale}. Never mention specific prices, targets, or return promises.
8. If the universe is empty, return status = "empty" and no candidates.

RESPONSE PROTOCOL (mandatory):
- Reply ONLY by calling the "submit_hard_data" function tool.
- Populate every field. Use [] for empty lists.
- Do not fabricate metrics that were not present in the input universe row. Return null when uncertain.
- Cap candidates at ${b.candidateCount}. Any additional runner-up you would consider goes in deferredTickers (max 10).
- Note structural limitations (e.g. "few names available in Europe for this sector") in gaps (max 5 items).`;
}
