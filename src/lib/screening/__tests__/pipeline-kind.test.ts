import { describe, expect, it } from "vitest";
import {
  parseScreeningPipelineKind,
  pipelineKindForIntent,
  resolveScreeningPipelineKind,
} from "../pipeline-kind";

describe("pipeline-kind", () => {
  it("defaults unknown values to checklist", () => {
    expect(parseScreeningPipelineKind(undefined)).toBe("checklist");
    expect(parseScreeningPipelineKind("nope")).toBe("checklist");
    expect(parseScreeningPipelineKind("thesis")).toBe("thesis");
  });

  it("forces checklist when the thesis flag is off", () => {
    expect(
      resolveScreeningPipelineKind({ requested: "thesis", thesisEnabled: false }),
    ).toBe("checklist");
  });

  it("allows thesis only for analyze when the flag is on", () => {
    expect(
      resolveScreeningPipelineKind({
        requested: "thesis",
        thesisEnabled: true,
        intent: "analyze",
      }),
    ).toBe("thesis");
    expect(
      resolveScreeningPipelineKind({
        requested: "thesis",
        thesisEnabled: true,
        intent: "explore",
      }),
    ).toBe("checklist");
    expect(
      resolveScreeningPipelineKind({
        requested: "thesis",
        thesisEnabled: true,
        intent: "rebalance",
      }),
    ).toBe("checklist");
  });

  it("maps analyze + flag to thesis via pipelineKindForIntent", () => {
    expect(
      pipelineKindForIntent({ intent: "analyze", thesisEnabled: true }),
    ).toBe("thesis");
    expect(
      pipelineKindForIntent({ intent: "explore", thesisEnabled: true }),
    ).toBe("checklist");
    expect(
      pipelineKindForIntent({ intent: "analyze", thesisEnabled: false }),
    ).toBe("checklist");
  });
});
