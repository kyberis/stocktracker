import { describe, expect, it } from "vitest";
import { getScreeningCopy } from "../copy";
import { pickGlossaryFor } from "../intake-glossary";

const copyEn = getScreeningCopy("en");
const copyEs = getScreeningCopy("es");

describe("pickGlossaryFor", () => {
  it("returns empty for empty input", () => {
    expect(pickGlossaryFor("", copyEn)).toEqual([]);
  });

  it("detects market cap in English", () => {
    const entries = pickGlossaryFor(
      "I recommend a market cap of 300–15,000M USD.",
      copyEn,
    );
    expect(entries.some((e) => /market\s*cap/i.test(e.term))).toBe(true);
  });

  it("detects capitalización in Spanish", () => {
    const entries = pickGlossaryFor(
      "Recomiendo una capitalización de mercado de 300–15.000 M USD.",
      copyEs,
    );
    expect(entries.length).toBeGreaterThan(0);
  });

  it("detects multiple valuation terms", () => {
    const entries = pickGlossaryFor(
      "Should we use Forward P/E, EV/EBITDA and P/FCF as valuation filters?",
      copyEn,
    );
    const terms = entries.map((e) => e.term.toLowerCase());
    expect(terms.some((t) => t.includes("p/e") || t.includes("per"))).toBe(true);
    expect(terms.some((t) => t.includes("ebitda"))).toBe(true);
  });

  it("caps at 4 entries", () => {
    const entries = pickGlossaryFor(
      "market cap ndEbitda currentRatio roic grossMargin ebitMargin fwdPe tevEbitda",
      copyEn,
    );
    expect(entries.length).toBeLessThanOrEqual(4);
  });

  it("dedupes by term", () => {
    const entries = pickGlossaryFor(
      "ROIC roic Return on invested capital ROIC",
      copyEn,
    );
    expect(entries.length).toBe(1);
  });
});
