import type { ThesisSoftAssessment } from "@/lib/screening/thesis/schemas";

export function insufficientSoft(opts: {
  ticker: string;
  field_id: ThesisSoftAssessment["field_id"];
  assessed_by: string;
  rationale?: string;
}): ThesisSoftAssessment {
  return {
    asset_id: opts.ticker,
    field_id: opts.field_id,
    score: null,
    confidence: "insufficient_evidence",
    rationale:
      opts.rationale ??
      "No citable primary excerpt in the evidence bundle.",
    evidence: [],
    disconfirming_evidence: [],
    assessed_at: new Date().toISOString(),
    assessed_by: opts.assessed_by,
  };
}
