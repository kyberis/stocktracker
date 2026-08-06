import { describe, expect, it } from "vitest";
import { runSanityLimits } from "../rules/sanity-limits";
import { screeningBriefSchema, type ScreeningBrief } from "../schemas";

function brief(overrides: Partial<ScreeningBrief> = {}): ScreeningBrief {
  return screeningBriefSchema.parse({
    intent: "explore",
    includeSectors: [],
    excludeSectors: [],
    regions: [],
    candidateCount: 5,
    criteria: [],
    endedEarly: false,
    locale: "en",
    ...overrides,
  });
}

describe("runSanityLimits", () => {
  it("accepts the trefolio preset", () => {
    const result = runSanityLimits(
      brief({
        criteria: [
          { key: "marketCap", condition: "300 – 15,000M USD", source: "preset" },
          { key: "ndEbitda", condition: "< 2.5x", source: "preset" },
          { key: "roic", condition: "> 12%", source: "preset" },
          { key: "fwdPe", condition: "< 15x", source: "preset" },
          { key: "revenueCagr", condition: "> 5%", source: "preset" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects impossibly aggressive ROIC and P/E targets", () => {
    const result = runSanityLimits(
      brief({
        criteria: [
          { key: "roic", condition: "> 250%", source: "chat" },
          { key: "fwdPe", condition: "< -2x", source: "chat" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    const keys = result.issues.map((i) => i.key);
    expect(keys).toContain("roic");
    expect(keys).toContain("fwdPe");
  });

  it("rejects candidate count outside 3..5", () => {
    // Schema itself clamps candidateCount; validate the sanity layer echoes
    // the same rule for defence in depth against handcrafted payloads.
    const raw = brief({ candidateCount: 4 });
    const tampered = { ...raw, candidateCount: 12 } as ScreeningBrief;
    const result = runSanityLimits(tampered);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.key).toBe("candidateCount");
  });

  it("rejects a sector that is both included and excluded", () => {
    const result = runSanityLimits(
      brief({
        includeSectors: ["Technology"],
        excludeSectors: ["technology"],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.key).toBe("sectors");
  });

  it("ignores text-only conditions (e.g. region labels)", () => {
    const result = runSanityLimits(
      brief({
        criteria: [
          { key: "region", condition: "US/Canada · Europe", source: "chat" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });
});
