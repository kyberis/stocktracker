import { describe, expect, it } from "vitest";
import { buildIntakeHref, buildIntakeHrefFromBrief } from "../intake-href";
import { screeningBriefSchema } from "../schemas";

describe("buildIntakeHref", () => {
  it("builds intake URL with intent and sectors", () => {
    expect(
      buildIntakeHref({
        intent: "rebalance",
        includeSectors: ["Healthcare", "Industrials"],
        excludeSectors: ["Technology"],
      }),
    ).toBe(
      "/screening/intake?intent=rebalance&include=Healthcare%2CIndustrials&exclude=Technology",
    );
  });

  it("defaults to explore without extras", () => {
    expect(buildIntakeHref({})).toBe("/screening/intake?intent=explore");
  });

  it("rebuilds from a brief", () => {
    const brief = screeningBriefSchema.parse({
      intent: "explore",
      includeSectors: [],
      excludeSectors: ["Technology"],
      regions: [],
      candidateCount: 5,
      criteria: [],
      endedEarly: false,
      locale: "es",
    });
    expect(buildIntakeHrefFromBrief(brief)).toBe(
      "/screening/intake?intent=explore&exclude=Technology",
    );
  });
});
