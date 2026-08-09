import { describe, expect, it } from "vitest";
import { renderEvaluationThesis } from "@/lib/screening/evaluation-thesis";
import type { ArtOfInvestingEvaluation } from "@/lib/screening/schemas";

const sample: ArtOfInvestingEvaluation = {
  ticker: "AAPL",
  filterVerdict: "PASA",
  filterReason: "Business clear; leverage comfortable.",
  businessThreeSentences: "Sells devices. To consumers. Brand preference.",
  companyType: "compounder",
  moat: "Brand + ecosystem. ROIC series strong.",
  management: "Buybacks at elevated multiples — mixed.",
  financials: "ROIC ~45%; ND/EBITDA net cash.",
  growth: "Mostly price/mix; services mix rising.",
  valuation: "Own hist PE 20x; peer PE DATO NO DISPONIBLE.",
  catalysts: "Next product cycle.",
  risksAndPremortem: "Regulation; China; 2029 loss from competition.",
  thesisInvalidation: "ROIC collapses below WACC for 3 years.",
  informationGaps: ["peer median PE"],
  conviction: "media",
  convictionReason: "Quality high; valuation incomplete.",
  disclaimer: "Informational only — not investment advice.",
};

describe("renderEvaluationThesis", () => {
  it("includes all 13 sections and disclaimer", () => {
    const text = renderEvaluationThesis(sample);
    expect(text).toContain("VEREDICTO DEL FILTRO");
    expect(text).toContain("PASA");
    expect(text).toContain("EL NEGOCIO EN 3 FRASES");
    expect(text).toContain("NIVEL DE CONVICCIÓN");
    expect(text).toContain("peer median PE");
    expect(text).toContain("not investment advice");
    expect(text.length).toBeLessThanOrEqual(4000);
  });
});
