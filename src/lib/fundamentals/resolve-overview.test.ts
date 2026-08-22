import { describe, it, expect } from "vitest";
import { overviewSymbolCandidates } from "./resolve-overview";

describe("overviewSymbolCandidates", () => {
  it("includes Yahoo aliases for Novo Nordisk Copenhagen", () => {
    const candidates = overviewSymbolCandidates("NOVO-B.CO");
    expect(candidates).toContain("NOVO-B.CO");
    expect(candidates).toContain("NVO");
  });

  it("includes Frankfurt fallbacks for German listings", () => {
    const candidates = overviewSymbolCandidates("W9C.DE");
    expect(candidates).toContain("W9C.DE");
    expect(candidates).toContain("W9C.F");
    expect(candidates).toContain("CSU.TO");
  });

  it("deduplicates candidates", () => {
    const candidates = overviewSymbolCandidates("GOOGL");
    expect(new Set(candidates).size).toBe(candidates.length);
    expect(candidates[0]).toBe("GOOGL");
  });
});
