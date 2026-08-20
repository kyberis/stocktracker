import type { HardDataCandidate } from "@/lib/screening/schemas";
import { insufficientSoft } from "@/lib/screening/thesis/insufficient-soft";
import {
  thesisSoftAssessmentSchema,
  type ThesisSoftAssessment,
} from "@/lib/screening/thesis/schemas";

export interface SeedNewsItem {
  title?: string | null;
  url?: string | null;
  publishedDate?: string | null;
}

function padQuote(text: string): string {
  const trimmed = text.trim().slice(0, 400);
  return trimmed.length >= 10 ? trimmed : `${trimmed}`.padEnd(10, ".");
}

function scored(row: unknown): ThesisSoftAssessment | null {
  const parsed = thesisSoftAssessmentSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

/**
 * Soft scores that do not need an earnings transcript: FMP profile prose
 * and dated news headlines already in the evidence bundle.
 */
export function seedSoftFromPublished(opts: {
  ticker: string;
  candidate?: HardDataCandidate;
  news?: SeedNewsItem[];
  now?: string;
}): ThesisSoftAssessment[] {
  const ticker = opts.ticker.toUpperCase();
  const now = opts.now ?? new Date().toISOString();
  const day = now.slice(0, 10);
  const out: ThesisSoftAssessment[] = [];
  const summary = opts.candidate?.analysisSummary?.trim() ?? "";
  const industry = opts.candidate?.industry?.trim() ?? "";
  const sector = opts.candidate?.sector?.trim() ?? "";

  if (summary.length >= 10) {
    const a1 = scored({
      asset_id: ticker,
      field_id: "EQ:A1",
      score: 3,
      confidence: "medium",
      rationale:
        "Business is described from the FMP company profile / analysis cache.",
      evidence: [
        {
          quote: padQuote(summary),
          location: "FMP profile / analysisSummary",
          date: day,
        },
      ],
      assessed_at: now,
      assessed_by: "code:screening-thesis-seed",
    });
    if (a1) out.push(a1);
  }

  const mix = [industry, sector, summary].filter((s) => s.length > 0).join(" — ");
  if (mix.length >= 10) {
    const a3 = scored({
      asset_id: ticker,
      field_id: "EQ:A3",
      score: 3,
      confidence: "low",
      rationale: "Revenue mix inferred from published industry and profile text.",
      evidence: [
        {
          quote: padQuote(mix),
          location: "FMP profile industry/sector",
          date: day,
        },
      ],
      assessed_at: now,
      assessed_by: "code:screening-thesis-seed",
    });
    if (a3) out.push(a3);
  }

  const headline = opts.news?.find((n) => (n.title ?? "").trim().length >= 10);
  if (headline?.title) {
    const j2 = scored({
      asset_id: ticker,
      field_id: "EQ:J2",
      score: 3,
      confidence: "low",
      rationale: "Dated public headline; not company guidance.",
      evidence: [
        {
          quote: padQuote(headline.title),
          location: headline.url || "FMP news/stock",
          url: headline.url || undefined,
          date: (headline.publishedDate || day).slice(0, 10),
        },
      ],
      assessed_at: now,
      assessed_by: "code:screening-thesis-seed",
    });
    if (j2) out.push(j2);
  }

  return out;
}

/** Prefer LLM rows that have a quote; otherwise keep the published-data seed. */
export function mergeSoftPreferringQuotes(
  preferred: ThesisSoftAssessment[],
  fallback: ThesisSoftAssessment[],
  fieldIds: readonly string[],
  ticker: string,
  assessedBy: string,
): ThesisSoftAssessment[] {
  const byId = new Map<string, ThesisSoftAssessment>();
  for (const row of preferred) byId.set(row.field_id, row);
  for (const row of fallback) {
    const cur = byId.get(row.field_id);
    if (
      !cur ||
      cur.confidence === "insufficient_evidence" ||
      cur.evidence.length === 0
    ) {
      byId.set(row.field_id, row);
    }
  }
  return fieldIds.map(
    (field_id) =>
      byId.get(field_id) ??
      insufficientSoft({
        ticker,
        field_id: field_id as ThesisSoftAssessment["field_id"],
        assessed_by: assessedBy,
      }),
  );
}
