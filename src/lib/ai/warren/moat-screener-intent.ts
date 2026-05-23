import { queryMoatCache } from "@/lib/db";

/** User wants moat-screener stock ideas (NOT Agent Office missions). */
export function wantsMoatScreenerIntent(message: string): boolean {
  return /moat\s*screener|screener\s*moat|ideas.*(invert|inversi|stock|moat|valor)|stock\s*ideas|find\s*stocks.*moat|p\s*\/?\s*e\s*(bajo|under|below|<)|wide\s*moat|buenas\s*ideas.*invert/i.test(
    message,
  );
}

/** Parse max P/E from natural language (default undefined → caller uses 15). */
export function extractPeMaxFromMessage(message: string): number | undefined {
  const below =
    message.match(/p\s*\/?\s*e\s*(?:bajo|under|below|menor(?:\s+a)?|<\s*|<=?\s*|m[aá]ximo|max\.?)\s*(\d+(?:\.\d+)?)/i) ||
    message.match(/(?:bajo|under|below|menor(?:\s+a)?)\s*(\d+(?:\.\d+)?)\s*(?:en\s+)?p\s*\/?\s*e/i);
  if (below?.[1]) {
    const n = Number(below[1]);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

export async function buildMoatScreenerPrefetchAppendix(message: string): Promise<string | null> {
  if (!wantsMoatScreenerIntent(message)) return null;

  const peMax = extractPeMaxFromMessage(message) ?? 15;
  const result = await queryMoatCache({
    peMax,
    scoreMin: 60,
    limit: 8,
    sortBy: "score",
    sortDir: "desc",
    page: 1,
  });

  const lines = result.results.map(
    (r) =>
      `${r.symbol} (${r.companyName}) — moat ${r.scorePct.toFixed(0)}%, ${r.verdict}, P/E ${r.peRatio ?? "n/a"}, ${r.passedCount}/${r.criteriaCount} criteria pass`,
  );

  return [
    "TASK OVERRIDE — Moat screener request detected:",
    `User asked for investment ideas from the moat screener with P/E max ${peMax}.`,
    "You MUST call `screenMoatStocks` with matching filters, then `renderMoatSummaryCard` or `renderStockPickCard` for 2–3 top names.",
    "Do NOT call `listOfficeMissions` — that is unrelated to stock screeners.",
    result.total === 0
      ? "Prefetch returned 0 matches — say so clearly and suggest relaxing P/E or score filters."
      : `Prefetch found ${result.total} match(es). Top rows:\n${lines.join("\n")}`,
  ].join("\n");
}
