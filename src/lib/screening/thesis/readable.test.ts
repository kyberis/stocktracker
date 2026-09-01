import { describe, expect, it } from "vitest";
import { buildReadableThesis } from "./readable";
import { scoreThesisAssessment } from "./score-assessment";
import type { ThesisFact, ThesisSoftAssessment } from "./schemas";

function fact(field_id: ThesisFact["field_id"], value: ThesisFact["value"]): ThesisFact {
  return {
    asset_id: "UBER",
    field_id,
    value,
    as_of: "2026-08-20T00:00:00.000Z",
    source: {
      type: "fmp",
      ref: "ratios-ttm",
      retrieved_at: "2026-08-20T00:00:00.000Z",
    },
    method: "derived",
  };
}

describe("buildReadableThesis", () => {
  it("explains a failed dilution check in Spanish without EQ codes or a raw score", () => {
    const facts = [
      fact("EQ:D1", 0.9815419449871572),
      fact("EQ:E1", 1.2306252339947585),
      fact("EQ:E2", 14.909090909090908),
      fact("EQ:D7", true),
      fact("calc:pe_current", 22),
      fact("calc:hist_pe_avg", 20),
      fact("calc:eps_cagr", 0.12),
      fact("calc:op_margin_delta_pp", 1),
      fact("calc:net_margin_delta_pp", 0.5),
      fact("calc:margin_years", 5),
      fact("calc:moat_score_pct", 60),
      fact("calc:severe_dilution", true),
    ];
    const assessment = scoreThesisAssessment({
      facts,
      soft: [],
      sector: "Technology",
      industry: "Software - Application",
    });
    const article = buildReadableThesis({
      locale: "es",
      companyName: "Uber Technologies, Inc.",
      ticker: "UBER",
      industry: "Software - Application",
      businessSummary:
        "Uber operates a global mobility and delivery marketplace connecting riders and drivers.",
      assessment,
      facts,
      soft: [
        {
          asset_id: "UBER",
          field_id: "EQ:B7",
          score: null,
          confidence: "insufficient_evidence",
          evidence: [],
          disconfirming_evidence: [],
          assessed_at: "2026-08-20T00:00:00.000Z",
          assessed_by: "test",
        } as ThesisSoftAssessment,
        {
          asset_id: "UBER",
          field_id: "EQ:F10",
          score: null,
          confidence: "insufficient_evidence",
          evidence: [],
          disconfirming_evidence: [],
          assessed_at: "2026-08-20T00:00:00.000Z",
          assessed_by: "test",
        } as ThesisSoftAssessment,
        {
          asset_id: "UBER",
          field_id: "EQ:F7",
          score: null,
          confidence: "insufficient_evidence",
          evidence: [],
          disconfirming_evidence: [],
          assessed_at: "2026-08-20T00:00:00.000Z",
          assessed_by: "test",
        } as ThesisSoftAssessment,
      ],
      draft: null,
    });
    expect(assessment.verdict).toBe("watchlist_gate_failed");
    expect(article.headline).toMatch(/acciones ha subido|lista de seguimiento|diluci/i);
    expect(article.headline).not.toMatch(/EQ:|puerta|75/i);
    expect(article.business).toMatch(/mobility/i);
    expect(article.checks.length).toBeGreaterThanOrEqual(6);
    expect(article.conclusion.length).toBeGreaterThan(10);
    expect(article.openQuestions).toMatch(/ventaja competitiva/i);
    expect(article.openQuestions).not.toMatch(/EQ:/);
  });

  it("calls 2.4x interest coverage ajustada and never justa on a naked −15.33", () => {
    const facts = [
      fact("EQ:D1", 0.89),
      fact("EQ:E1", 3.16),
      fact("EQ:E2", 2.396),
      fact("EQ:D7", -0.062),
    ];
    const assessment = scoreThesisAssessment({ facts, soft: [] });
    const article = buildReadableThesis({
      locale: "es",
      companyName: "NRG Energy, Inc.",
      ticker: "NRG",
      industry: "Utilities - Independent Power Producers",
      businessSummary: "NRG Energy generates electricity for residential, commercial and industrial customers.",
      assessment,
      facts,
      soft: [],
      draft: null,
      metrics: [
        {
          ticker: "NRG",
          id: "interestCoverage",
          value: 2.396,
          unit: "x",
          period: { kind: "FY", label: "FY2025", asOf: "2026-02-24" },
          source: { provider: "derived", endpoint: "income-statement", filingDate: "2026-02-24" },
          formula: "EBIT / |interestExpense|",
          status: "ok",
          flags: ["stale_filing"],
        },
        {
          ticker: "NRG",
          id: "shareCountCagr",
          value: -6.2,
          unit: "pct",
          period: { kind: "CAGR", label: "CAGR FY2022→FY2025", asOf: "2026-02-24" },
          source: { provider: "derived", endpoint: "income-statement" },
          formula: "(shares_n / shares_0)^(1/n) − 1",
          status: "ok",
          flags: [],
        },
      ],
    });
    expect(article.weaknesses.some((s) => /ajustada/i.test(s.text) && /2,4x/.test(s.text))).toBe(
      true,
    );
    expect(article.weaknesses.join(" ")).not.toMatch(/justa/);
    expect(article.strengths.some((s) => /recompra/i.test(s.text))).toBe(true);
    expect(article.strengths.join(" ")).not.toMatch(/no ha subido de forma material/);
  });
});
