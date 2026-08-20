import { describe, expect, it } from "vitest";
import { composeThesisReport } from "./compose-report";
import { scoreThesisAssessment } from "./score-assessment";
import {
  THESIS_RULESET_VERSION,
  thesisDraftSchema,
  thesisEvaluateOutputSchema,
  thesisHardDataOutputSchema,
  type ThesisFact,
} from "./schemas";
import type { ScreeningAgentOutputRow } from "@/lib/db/screening";

function fact(field_id: ThesisFact["field_id"], value: ThesisFact["value"]): ThesisFact {
  return {
    asset_id: "AAPL",
    field_id,
    value,
    as_of: "2026-08-19T00:00:00.000Z",
    source: {
      type: "fmp",
      ref: "ratios-ttm",
      retrieved_at: "2026-08-19T00:00:00.000Z",
    },
    method: "derived",
  };
}

function output(
  agentKind: string,
  json: unknown,
  extra?: Partial<ScreeningAgentOutputRow>,
): ScreeningAgentOutputRow {
  return {
    id: extra?.id ?? agentKind,
    runId: "run-1",
    userId: "user-1",
    agentKind,
    ticker: extra?.ticker ?? null,
    agentIndex: null,
    outputJson: JSON.stringify(json),
    latencyMs: 1,
    createdAt: extra?.createdAt ?? "2026-08-19T00:00:00.000Z",
  };
}

describe("composeThesisReport", () => {
  it("composes a thesis report from hard_data + evaluate outputs", () => {
    const facts = [
      fact("EQ:D1", 1.1),
      fact("EQ:E1", 0.4),
      fact("EQ:E2", 12),
      fact("EQ:D7", false),
    ];
    const assessment = scoreThesisAssessment({ facts, soft: [] });
    const draft = thesisDraftSchema.parse({
      ticker: "AAPL",
      statement:
        "I believe Apple can sustain published cash conversion over 36 months if leverage stays low.",
      variant_perception: {
        consensus_view: "Consensus estimates were not fetched (I1–I3 gap).",
        our_view: "Quality facts are scored independently of price targets.",
        why_mispricing_persists: "Insufficient measured consensus.",
      },
      horizon_months: 36,
      conviction: 2,
      kill_criteria: [
        {
          metric_field_id: "EQ:D1",
          operator: "<",
          threshold: 0.6,
          action: "review",
          label: "FCF/NI average falls below 0.6",
        },
      ],
      premortem:
        "It is 2029 and this position is down 50 percent. Cash conversion broke or leverage jumped.",
      scenarios: [
        {
          label: "bear",
          probability: 0.25,
          value: 0,
          key_assumptions: [{ driver: "fcf_ni", assumption: "breaks" }],
        },
        {
          label: "base",
          probability: 0.5,
          value: 0,
          key_assumptions: [{ driver: "fcf_ni", assumption: "holds" }],
        },
        {
          label: "bull",
          probability: 0.25,
          value: 0,
          key_assumptions: [{ driver: "multiple", assumption: "reverts" }],
        },
      ],
      status: "draft",
      gaps: [],
      disclaimer: "Informational only.",
    });
    const hd = thesisHardDataOutputSchema.parse({
      status: "ok",
      universeSize: 1,
      tickers: ["AAPL"],
      candidates: [
        {
          ticker: "AAPL",
          name: "Apple",
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          marketCapUsd: 3e12,
          price: 190,
          rankScore: 80,
          rankReason: "Analyze.",
        },
      ],
      facts,
      gaps: [],
      locale: "en",
      generatedAt: "2026-08-19T00:00:00.000Z",
    });
    const ev = thesisEvaluateOutputSchema.parse({
      evaluations: [
        {
          ticker: "AAPL",
          companyName: "Apple",
          assessment,
          thesis_draft: draft,
        },
      ],
      ruleset_version: THESIS_RULESET_VERSION,
      locale: "en",
      generatedAt: "2026-08-19T00:00:00.000Z",
    });

    const report = composeThesisReport({
      runId: "run-1",
      locale: "en",
      outputs: [
        output("thesis_hard_data", hd),
        output("thesis_evaluate", ev),
      ],
    });

    expect(report).not.toBeNull();
    expect(report?.kind).toBe("thesis");
    expect(report?.cards).toHaveLength(1);
    expect(report?.cards[0]?.thesis_draft?.kill_criteria[0]?.metric_field_id).toBe(
      "EQ:D1",
    );
    expect(report?.disclaimer.toLowerCase()).toContain("not constitute investment advice");
  });

  it("does not throw when a ticker has more than 80 facts", () => {
    const extraFacts = Array.from({ length: 90 }, (_, i) =>
      fact(i % 2 === 0 ? "EQ:D1" : "EQ:E1", i % 2 === 0 ? 1.1 : 0.4),
    );
    const assessment = scoreThesisAssessment({
      facts: extraFacts.slice(0, 4),
      soft: [],
    });
    const hd = thesisHardDataOutputSchema.parse({
      status: "ok",
      universeSize: 1,
      tickers: ["AAPL"],
      candidates: [
        {
          ticker: "AAPL",
          name: "Apple",
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          marketCapUsd: 3e12,
          price: 190,
          rankScore: 80,
          rankReason: "Analyze.",
        },
      ],
      facts: extraFacts,
      gaps: [],
      locale: "en",
      generatedAt: "2026-08-19T00:00:00.000Z",
    });
    const ev = thesisEvaluateOutputSchema.parse({
      evaluations: [
        {
          ticker: "AAPL",
          companyName: "Apple",
          assessment,
          thesis_draft: null,
        },
      ],
      ruleset_version: THESIS_RULESET_VERSION,
      locale: "en",
      generatedAt: "2026-08-19T00:00:00.000Z",
    });
    expect(() =>
      composeThesisReport({
        runId: "run-1",
        locale: "en",
        outputs: [output("thesis_hard_data", hd), output("thesis_evaluate", ev)],
      }),
    ).not.toThrow();
    const report = composeThesisReport({
      runId: "run-1",
      locale: "en",
      outputs: [output("thesis_hard_data", hd), output("thesis_evaluate", ev)],
    });
    expect(report?.cards[0]?.facts.length).toBe(80);
  });
});
