import { scoreCategories } from "@/lib/screening/scoring/categories";
import type {
  ScreeningCandidateCard,
  ScreeningCategories,
  ScreeningReport,
} from "@/lib/screening/schemas";

/**
 * Derive category axes from fields already on the card (legacy reports that
 * predate `categories`, or cards composed before Hard Data PE history landed).
 */
export function deriveCategoriesFromCard(
  card: Pick<
    ScreeningCandidateCard,
    "multiples" | "flags" | "suitability"
  >,
): ScreeningCategories {
  return scoreCategories({
    fwdPe: card.multiples.fwdPe ?? null,
    ownHistPe: card.multiples.ownHistPe ?? null,
    histPeAvg: card.multiples.histPeAvg ?? null,
    histPeYears: card.multiples.histPeYears ?? null,
    moatScorePct: card.flags.moatScore ?? null,
    suitability: card.suitability ?? null,
    ndEbitda: card.multiples.ndEbitda ?? null,
    netCash: card.flags.netCash ?? null,
  });
}

/**
 * Attach categories when missing. Never overwrite labels, but backfill
 * ND/EBITDA / netCash onto solidity for older reports that predate those fields.
 */
export function ensureCardCategories(
  card: ScreeningCandidateCard,
): ScreeningCandidateCard {
  if (!card.categories) {
    return { ...card, categories: deriveCategoriesFromCard(card) };
  }
  const s = card.categories.solidity;
  if (s.ndEbitda != null || s.netCash != null) return card;
  return {
    ...card,
    categories: {
      ...card.categories,
      solidity: {
        ...s,
        ndEbitda: card.multiples.ndEbitda ?? null,
        netCash: card.flags.netCash ?? null,
        source:
          s.source ??
          (s.moatScore != null
            ? "moat"
            : card.multiples.ndEbitda != null || card.flags.netCash != null
              ? "fundamentals"
              : "none"),
      },
    },
  };
}

/**
 * Ensure every card and comparison row carries category labels. Safe to call
 * on every report read (mock fixture + compose output).
 */
export function ensureReportCategories(report: ScreeningReport): ScreeningReport {
  const cards = report.cards.map(ensureCardCategories);
  const byTicker = new Map(cards.map((c) => [c.ticker.toUpperCase(), c]));
  const comparisonRows = report.comparisonRows.map((row) => {
    const card = byTicker.get(row.ticker.toUpperCase());
    const cats = card?.categories;
    if (
      row.cheapLabel != null &&
      row.fitLabel != null &&
      row.solidityLabel != null
    ) {
      return row;
    }
    return {
      ...row,
      score: row.score ?? null,
      verdict: row.verdict ?? null,
      cheapLabel: row.cheapLabel ?? cats?.cheap.label ?? null,
      fitLabel: row.fitLabel ?? cats?.fit.label ?? null,
      solidityLabel: row.solidityLabel ?? cats?.solidity.label ?? null,
    };
  });
  return { ...report, cards, comparisonRows };
}
