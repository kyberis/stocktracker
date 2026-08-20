import { describe, expect, it } from "vitest";
import {
  thesisDraftSchema,
  thesisKillCriterionSchema,
} from "./schemas";

describe("thesis contracts", () => {
  it("requires kill criteria to bind a namespaced metric_field_id", () => {
    const ok = thesisKillCriterionSchema.safeParse({
      metric_field_id: "EQ:D1",
      operator: "<",
      threshold: 0.6,
      action: "review",
    });
    expect(ok.success).toBe(true);
    const bad = thesisKillCriterionSchema.safeParse({
      metric_field_id: "fcf_ni",
      operator: "<",
      threshold: 0.6,
      action: "review",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects buy/sell/hold language in the thesis statement", () => {
    const parsed = thesisDraftSchema.safeParse({
      ticker: "AAPL",
      statement: "I would buy AAPL here because cash conversion looks durable over years.",
      variant_perception: {
        consensus_view: "Gap",
        our_view: "Facts",
        why_mispricing_persists: "No consensus fetch.",
      },
      horizon_months: 36,
      conviction: 2,
      kill_criteria: [],
      premortem:
        "It is 2029 and this position is down 50 percent after a balance-sheet shock.",
      scenarios: [],
      status: "draft",
      gaps: [],
      disclaimer: "Informational.",
    });
    expect(parsed.success).toBe(false);
  });
});
