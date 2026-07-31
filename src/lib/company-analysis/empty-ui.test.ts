import { describe, expect, it } from "vitest";
import { nextQuarterRowFlags, shouldShowNarrativeSection } from "./empty-ui";

describe("nextQuarterRowFlags", () => {
  it("omits guidance row when company guidance is null", () => {
    const flags = nextQuarterRowFlags({
      companyGuidanceRevenue: null,
      consensusRevenue: 4.47e9,
      consensusEps: 15.29,
    });
    expect(flags.showGuidance).toBe(false);
    expect(flags.showConsensusRevenue).toBe(true);
    expect(flags.showConsensusEps).toBe(true);
    expect(flags.showCard).toBe(true);
  });

  it("hides the next-quarter card when every value is null", () => {
    const flags = nextQuarterRowFlags({
      companyGuidanceRevenue: null,
      consensusRevenue: null,
      consensusEps: null,
    });
    expect(flags.showCard).toBe(false);
  });

  it("shows guidance only when a value exists", () => {
    const flags = nextQuarterRowFlags({
      companyGuidanceRevenue: 1e9,
      consensusRevenue: null,
      consensusEps: null,
    });
    expect(flags.showGuidance).toBe(true);
    expect(flags.showCard).toBe(true);
  });
});

describe("shouldShowNarrativeSection", () => {
  it("always shows while pending", () => {
    expect(shouldShowNarrativeSection(true)).toBe(true);
    expect(shouldShowNarrativeSection(true, "")).toBe(true);
  });

  it("hides after settle when all texts are empty", () => {
    expect(shouldShowNarrativeSection(false, "", "  ", null, undefined)).toBe(false);
  });

  it("shows after settle when any text is present", () => {
    expect(shouldShowNarrativeSection(false, "", "Outlook text")).toBe(true);
  });
});
