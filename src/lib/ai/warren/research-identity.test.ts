import { describe, expect, it } from "vitest";

import {
  resolveWarrenResearchIdentity,
  warrenResearchSearchPrefix,
} from "./research-identity";

describe("resolveWarrenResearchIdentity", () => {
  it("maps Novo Copenhagen to NVO and Novo Nordisk", () => {
    const id = resolveWarrenResearchIdentity("NOVO-B.CO");
    expect(id).toMatchObject({
      ticker: "NOVO-B.CO",
      searchTicker: "NVO",
      companyName: "Novo Nordisk",
    });
    expect(id?.aliases).toContain("NVO");
    expect(warrenResearchSearchPrefix(id!)).toBe("Novo Nordisk NVO");
  });

  it("keeps an explicit company name", () => {
    const id = resolveWarrenResearchIdentity("FLR", "Fluor Corporation");
    expect(id).toMatchObject({
      ticker: "FLR",
      searchTicker: "FLR",
      companyName: "Fluor Corporation",
    });
  });

  it("rejects junk tickers", () => {
    expect(resolveWarrenResearchIdentity("FLR; drop")).toBeNull();
  });
});
