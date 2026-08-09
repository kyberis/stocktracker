import { describe, expect, it } from "vitest";
import { artOfInvestingEvaluationSchema } from "@/lib/screening/schemas";

describe("artOfInvestingEvaluationSchema", () => {
  it("accepts a grounded DESCARTE evaluation", () => {
    const parsed = artOfInvestingEvaluationSchema.safeParse({
      ticker: "ILLIQ",
      filterVerdict: "DESCARTE",
      filterReason: "thin_liquidity",
      businessThreeSentences: "DATO NO DISPONIBLE",
      companyType: "unclear",
      moat: "DATO NO DISPONIBLE",
      management: "DATO NO DISPONIBLE",
      financials: "DATO NO DISPONIBLE",
      growth: "DATO NO DISPONIBLE",
      valuation: "DATO NO DISPONIBLE",
      catalysts: "DATO NO DISPONIBLE",
      risksAndPremortem: "DATO NO DISPONIBLE",
      thesisInvalidation: "DATO NO DISPONIBLE",
      informationGaps: ["avgVolume"],
      conviction: "baja",
      convictionReason: "Eliminated at Fase 0.",
      disclaimer: "Informational only — not investment advice.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.filterVerdict).toBe("DESCARTE");
    }
  });
});
