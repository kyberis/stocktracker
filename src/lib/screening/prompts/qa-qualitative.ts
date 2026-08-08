import type { QaIssue, ScreeningReport } from "@/lib/screening/schemas";

export interface QaQualitativePromptContext {
  report: ScreeningReport;
  layerAIssues: QaIssue[];
  rawContext: string;
  locale: string;
}

/**
 * System prompt for the QA agent's Layer B qualitative judge (HLD §4.5).
 *
 * The model receives the composed report, every raw agent output, and the
 * deterministic Layer A findings. It must call `submit_qa_verdict` with any
 * additional issues that Layer A cannot catch — R3 (insider directional
 * context), R6 (guidance freshness), R7 (price-drop causality), R8 (M&A vs
 * organic growth), or subtle cross-agent contradictions.
 */
export function buildQaQualitativePrompt(
  ctx: QaQualitativePromptContext,
): string {
  const rulesGuidance = [
    "R3 — Insider directional context: check that insiderBias narratives match the transaction direction (open-market buys imply 'buying'; sales imply 'selling').",
    "R6 — Guidance freshness: guidance.asOf must be within the last 12 months; older data should be flagged as `unconfirmed_source`.",
    "R7 — Price-drop causality: if the compiler summary attributes a price move to a cause, the underlying agent output must contain that cause.",
    "R8 — M&A vs organic growth: growth claims must not attribute inorganic (M&A) contribution to organic growth.",
  ].join("\n- ");

  const layerASummary = ctx.layerAIssues.length
    ? ctx.layerAIssues
        .slice(0, 20)
        .map(
          (i) =>
            `[${i.ruleId ?? i.issueType}] ${i.ticker ?? "-"} ${i.claimPath ?? ""}: ${i.summary}`,
        )
        .join("\n")
    : "(none)";

  return `You are the QA agent of the trefolio investment screening pipeline (Agent 6, Layer B — qualitative judge).

You do NOT rewrite the report. You inspect it for subtle inconsistencies that the deterministic Layer A cannot catch, and you emit a machine-readable verdict.

Focus areas:
- ${rulesGuidance}

Also flag any hallucinated numbers, unattributed claims, or cross-agent contradictions not already listed in the Layer A findings below.

Layer A findings (already flagged; do not repeat unless you can add material colour):
${layerASummary}

Response language: ${ctx.locale}.

RESPONSE PROTOCOL (mandatory):
- Reply ONLY by calling the "submit_qa_verdict" function tool.
- verdict: "pass" when you find no additional blocking issues; "fail" when at least one blocking qualitative issue exists.
- issues[]: 0 to 15 entries. Each entry describes ONE distinct concern with:
    - issueType: quant_mismatch | unconfirmed_source | cross_agent_inconsistency | rule_violation | other
    - ruleId: one of R3, R6, R7, R8 (or null when no rule maps)
    - agentKind: which agent produced the offending output (e.g. ir_business, web_sentiment, compiler) or null
    - ticker: uppercase ticker or null for report-level
    - claimPath: dotted path pointing to the offending field, best-effort
    - expectedValue / actualValue: brief strings, may be null
    - summary: 1–2 sentence description
    - blocking: true for issues that should force a rerun, false for warnings.
- Do NOT invent new fields. Do NOT recommend rewrites. Do NOT return prose outside the tool call.`;
}
