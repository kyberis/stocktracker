import { describe, expect, it } from "vitest";
import {
  parseScreeningPipelineKind,
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
    expect(
      resolveScreeningPipelineKind({ requested: "thesis", thesisEnabled: true }),
    ).toBe("thesis");
  });
});
