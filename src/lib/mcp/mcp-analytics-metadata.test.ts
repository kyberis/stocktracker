import { describe, it, expect } from "vitest";

import {
  buildMcpToolCallMetadata,
  formatPatScopesMetadata,
} from "@/lib/mcp/mcp-analytics-metadata";

describe("buildMcpToolCallMetadata", () => {
  it("adds required scope for known tools", () => {
    expect(buildMcpToolCallMetadata("listHoldings", undefined)).toEqual({
      scope: "portfolio:read",
    });
  });

  it("allowlists ticker and portfolioId", () => {
    expect(
      buildMcpToolCallMetadata("getMoatEvaluation", {
        ticker: "AAPL",
        portfolioId: "p1",
        secret: "should-not-appear",
      }),
    ).toEqual({
      scope: "warren:moat",
      ticker: "AAPL",
      portfolioId: "p1",
      resources: "ticker=AAPL;portfolioId=p1",
    });
  });

  it("records FMP path and symbol", () => {
    const meta = buildMcpToolCallMetadata("fmpRequest", {
      path: "quote",
      params: { symbol: "MSFT", apikey: "leak" },
      symbol: "MSFT",
    });
    expect(meta.scope).toBe("market:fmp");
    expect(meta.path).toBe("quote");
    expect(meta.symbol).toBe("MSFT");
    expect(meta.resources).toContain("path=quote");
    expect(JSON.stringify(meta)).not.toContain("leak");
  });

  it("ignores unknown tools without crashing", () => {
    expect(buildMcpToolCallMetadata("customTool", { ticker: "X" })).toEqual({
      ticker: "X",
      resources: "ticker=X",
    });
  });
});

describe("formatPatScopesMetadata", () => {
  it("joins scopes", () => {
    expect(formatPatScopesMetadata(["portfolio:read", "market:fmp"])).toEqual({
      scopes: "portfolio:read,market:fmp",
    });
  });

  it("returns empty for missing scopes", () => {
    expect(formatPatScopesMetadata(undefined)).toEqual({});
    expect(formatPatScopesMetadata([])).toEqual({});
  });
});
