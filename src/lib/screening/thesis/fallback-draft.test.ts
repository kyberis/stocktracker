import { describe, expect, it } from "vitest";
import { fallbackThesisDraft } from "./fallback-draft";
import { scoreThesisAssessment } from "./score-assessment";
import { ADVICE_LANGUAGE, thesisDraftSchema, type ThesisFact } from "./schemas";

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

describe("fallbackThesisDraft", () => {
  it("rejects the old Spanish wording that used mantener (hold)", () => {
    expect(
      ADVICE_LANGUAGE.test(
        "Creo que UBER puede mantener su calidad de negocio en 36 meses",
      ),
    ).toBe(true);
  });

  it("rejects the old English wording that used hold as a verb", () => {
    expect(
      ADVICE_LANGUAGE.test(
        "I believe UBER can sustain its published business quality over 36 months if cash conversion and leverage hold",
      ),
    ).toBe(true);
  });

  it("returns a valid English draft without advisory verbs", () => {
    const facts = [fact("EQ:D1", 1.1)];
    const assessment = scoreThesisAssessment({ facts, soft: [] });
    const draft = fallbackThesisDraft("UBER", "en", assessment, facts);
    expect(draft).not.toBeNull();
    expect(thesisDraftSchema.safeParse(draft).success).toBe(true);
    expect(ADVICE_LANGUAGE.test(`${draft?.statement} ${draft?.premortem}`)).toBe(
      false,
    );
  });

  it("returns a valid Spanish draft and binds EQ:D1 even when dilution fails the watchlist gate", () => {
    const facts = [fact("EQ:D1", 0.98), fact("EQ:D7", true)];
    const assessment = scoreThesisAssessment({ facts, soft: [] });
    const draft = fallbackThesisDraft("UBER", "es", assessment, facts);
    expect(draft).not.toBeNull();
    expect(thesisDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft?.statement).toMatch(/UBER/);
    expect(ADVICE_LANGUAGE.test(`${draft?.statement} ${draft?.premortem}`)).toBe(
      false,
    );
    expect(draft?.kill_criteria[0]?.metric_field_id).toBe("EQ:D1");
    expect(draft?.status).toBe("watchlist");
  });
});
