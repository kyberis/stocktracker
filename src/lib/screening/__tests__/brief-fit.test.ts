import { describe, expect, it } from "vitest";
import {
  evaluateBriefFit,
  parseNumericCondition,
} from "../brief-fit";
import type { ScreeningBrief } from "@/lib/screening/schemas";

function brief(criteria: ScreeningBrief["criteria"]): ScreeningBrief {
  return {
    intent: "explore",
    includeSectors: [],
    excludeSectors: [],
    regions: ["us_canada"],
    candidateCount: 5,
    criteria,
    endedEarly: false,
    locale: "en",
    riskProfile: null,
  };
}

describe("parseNumericCondition", () => {
  it("parses inequalities", () => {
    expect(parseNumericCondition("< 15x")).toEqual({ op: "<", value: 15 });
    expect(parseNumericCondition("> 12%")).toEqual({ op: ">", value: 12 });
  });
});

describe("evaluateBriefFit", () => {
  it("marks majority when most criteria pass", () => {
    const fit = evaluateBriefFit(
      brief([
        { key: "fwdPe", condition: "< 15x", source: "chat" },
        { key: "ndEbitda", condition: "< 2.5x", source: "chat" },
        { key: "marketCap", condition: "300 – 15,000M USD", source: "chat" },
      ]),
      {
        marketCapUsd: 5_000_000_000,
        fwdPe: 12,
        evEbitda: null,
        ndEbitda: 1.2,
      },
    );
    expect(fit.metCount).toBe(3);
    expect(fit.meetsMajority).toBe(true);
    expect(fit.unmet).toHaveLength(0);
  });

  it("lists unmet expectations when majority fails", () => {
    const fit = evaluateBriefFit(
      brief([
        { key: "fwdPe", condition: "< 15x", source: "chat" },
        { key: "ndEbitda", condition: "< 2.5x", source: "chat" },
      ]),
      {
        marketCapUsd: null,
        fwdPe: 28,
        evEbitda: null,
        ndEbitda: 4,
      },
    );
    expect(fit.meetsMajority).toBe(false);
    expect(fit.unmet.map((u) => u.key).sort()).toEqual(["fwdPe", "ndEbitda"]);
  });
});
