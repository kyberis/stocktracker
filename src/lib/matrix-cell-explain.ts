import {
  buildDeterministicMatrixCellNarrative,
  MATRIX_CELL_EXPLAIN_DISCLAIMER,
  type MatrixCellBreakdown,
} from "@/lib/matrix-cell-breakdown";

export { MATRIX_CELL_EXPLAIN_DISCLAIMER };

/**
 * LLM narrative for a matrix cell breakdown. Falls back to deterministic text.
 * Server-only: dynamically imports the AI gateway so client bundles never pull db/fs.
 */
export async function explainMatrixCellBreakdown(args: {
  breakdown: MatrixCellBreakdown;
  language?: string;
  headers?: Headers;
}): Promise<{ narrative: string; disclaimer: string; usedLlm: boolean }> {
  const fallback = buildDeterministicMatrixCellNarrative(args.breakdown);
  const lang = args.language === "es" ? "Spanish" : "English";

  const compact = {
    assetKey: args.breakdown.assetKey,
    period: args.breakdown.period,
    displayMode: args.breakdown.displayMode,
    baseCurrency: args.breakdown.baseCurrency,
    periodStart: args.breakdown.periodStart,
    periodEnd: args.breakdown.periodEnd,
    current: args.breakdown.current,
    past: args.breakdown.past,
    netCashFlow: args.breakdown.netCashFlow,
    pl: args.breakdown.pl,
    pct: args.breakdown.pct,
    dayAbs: args.breakdown.dayAbs,
    dayPct: args.breakdown.dayPct,
    costBasis: args.breakdown.costBasis,
    unrealizedVsCost: args.breakdown.unrealizedVsCost,
    formula: args.breakdown.formula,
    warnings: args.breakdown.warnings,
    transactions: args.breakdown.transactions.slice(0, 40).map((t) => ({
      date: t.date,
      type: t.type,
      ticker: t.ticker,
      assetType: t.assetType,
      flowBase: t.flowBase,
    })),
  };

  try {
    const { fetchGatewayChatCompletions } = await import("@/lib/ai/gateway");
    const res = await fetchGatewayChatCompletions(
      {
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content:
              `You explain one cell of a portfolio performance matrix in ${lang}. ` +
              "Use ONLY the JSON numbers and transactions provided. Do not invent trades or prices. " +
              "Emphasize that period P/L is current − past − netCashFlow (snapshot-based), " +
              "NOT profit vs purchase price; if costBasis/unrealizedVsCost are present, contrast them briefly. " +
              "2–5 short sentences. No investment advice. " +
              'Return JSON: { "narrative": "..." }.',
          },
          {
            role: "user",
            content: JSON.stringify(compact),
          },
        ],
      },
      { headers: args.headers },
    );
    if (!res.ok) {
      return { narrative: fallback, disclaimer: MATRIX_CELL_EXPLAIN_DISCLAIMER, usedLlm: false };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim() || "";
    const parsed = tryParseNarrative(content);
    if (parsed) {
      return { narrative: parsed, disclaimer: MATRIX_CELL_EXPLAIN_DISCLAIMER, usedLlm: true };
    }
    if (content) {
      return {
        narrative: content.slice(0, 1200),
        disclaimer: MATRIX_CELL_EXPLAIN_DISCLAIMER,
        usedLlm: true,
      };
    }
  } catch {
    // fall through
  }

  return { narrative: fallback, disclaimer: MATRIX_CELL_EXPLAIN_DISCLAIMER, usedLlm: false };
}

function tryParseNarrative(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(content.slice(start, end + 1)) as { narrative?: unknown };
    const narrative = String(obj.narrative || "").trim();
    return narrative ? narrative.slice(0, 1200) : null;
  } catch {
    return null;
  }
}
