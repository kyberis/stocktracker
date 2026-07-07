import { describe, it, expect } from "vitest";

import { hasMcpScope, requiredScopeForMcpTool } from "@/lib/mcp/pat-scopes";

describe("mcp pat scopes", () => {
  it("maps tools to scopes", () => {
    expect(requiredScopeForMcpTool("getTaxReport")).toBe("tax:read");
    expect(requiredScopeForMcpTool("getPortfolioScore")).toBe("tools:read");
    expect(requiredScopeForMcpTool("saveMoatReport")).toBe("portfolio:write");
  });

  it("enforces scope membership", () => {
    expect(hasMcpScope(["portfolio:read"], "portfolio:read")).toBe(true);
    expect(hasMcpScope(["portfolio:read"], "tax:read")).toBe(false);
  });
});
