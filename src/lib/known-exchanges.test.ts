import { describe, expect, it } from "vitest";
import { KNOWN_EXCHANGES, mergeExchangeSuggestions } from "./known-exchanges";

describe("KNOWN_EXCHANGES", () => {
  it("is non-empty with unique codes", () => {
    expect(KNOWN_EXCHANGES.length).toBeGreaterThan(10);
    const codes = KNOWN_EXCHANGES.map((e) => e.code.toUpperCase());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes core venues used in add-fund / seed flows", () => {
    const codes = new Set(KNOWN_EXCHANGES.map((e) => e.code));
    expect(codes.has("FUND")).toBe(true);
    expect(codes.has("XET")).toBe(true);
    expect(codes.has("NDQ")).toBe(true);
    expect(codes.has("LSE")).toBe(true);
  });
});

describe("mergeExchangeSuggestions", () => {
  it("prepends unique portfolio codes and keeps curated labels", () => {
    const merged = mergeExchangeSuggestions(["xet", "CUSTOM", "XET", ""]);
    expect(merged[0]).toEqual({ code: "XET", label: "Xetra" });
    expect(merged[1]).toEqual({ code: "CUSTOM", label: "CUSTOM" });
    const xetCount = merged.filter((e) => e.code === "XET").length;
    expect(xetCount).toBe(1);
    expect(merged.some((e) => e.code === "FUND")).toBe(true);
  });
});
