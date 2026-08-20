import { describe, expect, it } from "vitest";

import { FMP_ENDPOINT_CATALOG, listFmpCatalog } from "@/lib/mcp/fmp-endpoint-catalog";

describe("listFmpCatalog", () => {
  it("returns full curated list by default", () => {
    const all = listFmpCatalog();
    expect(all.endpoints.length).toBe(FMP_ENDPOINT_CATALOG.length);
    expect(all.baseUrl).toContain("/stable");
    expect(all.note).toMatch(/even if not listed here/i);
  });

  it("filters by category", () => {
    const statements = listFmpCatalog("statements");
    expect(statements.endpoints.length).toBeGreaterThan(0);
    expect(statements.endpoints.every((e) => e.category === "statements")).toBe(true);
  });

  it("includes paths used by the app FMP integration", () => {
    const paths = new Set(FMP_ENDPOINT_CATALOG.map((e) => e.path));
    for (const p of [
      "quote",
      "profile",
      "income-statement",
      "earnings-calendar",
      "news/stock",
      "senate-trades",
      "stock-peers",
      "key-metrics",
      "analyst-estimates",
      "etf/holdings",
    ]) {
      expect(paths.has(p)).toBe(true);
    }
  });
});
