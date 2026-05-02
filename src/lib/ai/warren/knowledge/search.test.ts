import { describe, it, expect, beforeEach } from "vitest";

import { tokenize, _resetKnowledgeIndexForTests } from "./search";
import { searchKnowledge, knowledgeCorpusSize } from "./index";

describe("knowledge · tokenize", () => {
  it("lowercases, strips diacritics, drops short tokens and stopwords", () => {
    expect(tokenize("Diversificación de la cartera")).toEqual([
      "diversificacion",
      "cartera",
    ]);
    expect(tokenize("What is P/E ratio?")).toEqual(["pe", "ratio"]);
    expect(tokenize("Stocks AND bonds")).toEqual(["stocks", "bonds"]);
  });

  it("keeps numeric tokens like 401k or 52w", () => {
    const tokens = tokenize("the 401k and 52w high");
    expect(tokens).toContain("401k");
    expect(tokens).toContain("52w");
    expect(tokens).toContain("high");
  });
});

describe("knowledge · searchKnowledge", () => {
  beforeEach(() => {
    _resetKnowledgeIndexForTests();
  });

  it("returns the matching slug as the top hit for a value-investing query", () => {
    const hits = searchKnowledge("what is margin of safety");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].slug).toBe("margin-of-safety");
  });

  it("matches a metric query to its slug", () => {
    const hits = searchKnowledge("p/e ratio for stocks");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].slug).toBe("pe-ratio");
  });

  it("returns Spanish title/summary when language is es and entry has it", () => {
    const hits = searchKnowledge("diversificación de cartera", 3, "es");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].slug).toBe("diversification");
    expect(hits[0].title).toBe("Diversificación");
    expect(hits[0].summary).toMatch(/Repartir el capital/i);
  });

  it("falls back to English title when no Spanish translation exists", () => {
    const hits = searchKnowledge("payout ratio dividends", 3, "en");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].title).not.toMatch(/^[áéíóúñ]/i);
  });

  it("returns no more than k hits", () => {
    const hits = searchKnowledge("dividend", 2);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("returns nothing for a query with no matching tokens", () => {
    const hits = searchKnowledge("zzzzz qqqqq fffff");
    expect(hits).toEqual([]);
  });

  it("includes an excerpt and the entry tags", () => {
    const [hit] = searchKnowledge("drawdown peak to trough");
    expect(hit).toBeDefined();
    expect(hit.slug).toBe("drawdown");
    expect(hit.excerpt.length).toBeGreaterThan(0);
    expect(Array.isArray(hit.tags)).toBe(true);
    expect(hit.tags.length).toBeGreaterThan(0);
  });

  it("ships at least 30 entries", () => {
    expect(knowledgeCorpusSize()).toBeGreaterThanOrEqual(30);
  });
});
