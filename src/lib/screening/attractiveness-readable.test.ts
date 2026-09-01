import { describe, expect, it } from "vitest";
import { formatAttractivenessCheck } from "./attractiveness-readable";
import type { ThesisFact } from "@/lib/screening/thesis/schemas";

function fact(field_id: string, value: number | boolean): ThesisFact {
  return {
    asset_id: "TEST",
    field_id,
    value,
    as_of: "2026-01-01T00:00:00.000Z",
    source: { type: "fmp", ref: "test", retrieved_at: "2026-01-01T00:00:00.000Z" },
    method: "derived",
  };
}

describe("formatAttractivenessCheck", () => {
  it("explains moat score in plain language", () => {
    const out = formatAttractivenessCheck({
      checkId: "moat",
      locale: "es",
      facts: [fact("calc:moat_score_pct", 76)],
      status: "pass",
    });
    expect(out.data).toMatch(/76\/100/i);
    expect(out.data).not.toMatch(/moat_score|calc:/);
    expect(out.meaning).toMatch(/0–100|ventaja competitiva/i);
    expect(out.interpretation).toMatch(/sólida|competitiva/i);
  });

  it("explains dilution as share-count growth, not raw field id", () => {
    const out = formatAttractivenessCheck({
      checkId: "capital_allocation",
      locale: "es",
      facts: [fact("EQ:D7", 0.04934891005421793)],
      status: "fail",
    });
    expect(out.data).toMatch(/diluci/i);
    expect(out.data).toMatch(/4,9|5/);
    expect(out.data).not.toMatch(/capital_allocation|EQ:D7/);
    expect(out.meaning).toMatch(/recompras|diluci/i);
  });

  it("explains margin trend in percentage points", () => {
    const out = formatAttractivenessCheck({
      checkId: "margin_trend",
      locale: "en",
      facts: [
        fact("calc:op_margin_delta_pp", 10.340728764543323),
        fact("calc:margin_years", 5),
      ],
      status: "pass",
    });
    expect(out.data).toMatch(/operating margin rose/i);
    expect(out.data).not.toMatch(/margin_trend|10\.340728764543323/);
    expect(out.meaning).toMatch(/percentage points/i);
  });
});
