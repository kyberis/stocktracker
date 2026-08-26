import { describe, expect, it } from "vitest";
import { classifyFlags, extractUsableAreaM2, isHardExcluded } from "./flags";

describe("classifyFlags", () => {
  it("quotes the literal that triggered a hard flag", () => {
    const flags = classifyFlags("Imóvel em nua propriedade com usufruto vitalício.");
    expect(flags.some((f) => f.kind === "USUFRUTO")).toBe(true);
    const quote = flags.find((f) => f.kind === "USUFRUTO")?.quote.toLowerCase() ?? "";
    expect(quote.includes("usufruto") || quote.includes("nua propriedade")).toBe(true);
    expect(isHardExcluded(flags)).toBe(true);
  });
});

describe("extractUsableAreaM2", () => {
  it("recomputes on the smaller usable area", () => {
    const r = extractUsableAreaM2("listed 95, 60 m² útil privativa", 95);
    expect(r.areaUtilM2).toBe(60);
    expect(r.areaUsadaM2).toBe(60);
  });
});
