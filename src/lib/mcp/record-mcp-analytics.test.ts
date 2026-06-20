import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/mcp-analytics", () => ({
  trackMcpAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

import { trackMcpAnalyticsEvent } from "@/lib/db/mcp-analytics";
import { recordMcpRequestAnalytics } from "@/lib/mcp/record-mcp-analytics";

describe("recordMcpRequestAnalytics", () => {
  beforeEach(() => {
    vi.mocked(trackMcpAnalyticsEvent).mockClear();
  });

  it("records client_init on initialize", async () => {
    const req = new Request("https://trefolio.com/api/mcp/user/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    recordMcpRequestAnalytics(req, "user-1", "acc:tok1", "tfp_pat_abc");
    await vi.waitFor(() => {
      expect(trackMcpAnalyticsEvent).toHaveBeenCalled();
    });
    expect(trackMcpAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        eventType: "client_init",
        authType: "pat",
        tokenId: "acc:tok1",
      }),
    );
  });

  it("records tool_call with tool name", async () => {
    const req = new Request("https://trefolio.com/api/mcp/user/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "listHoldings" },
        id: 2,
      }),
    });
    recordMcpRequestAnalytics(req, "user-2", "acc:tok2", "dev-access-xyz");
    await vi.waitFor(() => {
      expect(trackMcpAnalyticsEvent).toHaveBeenCalled();
    });
    expect(trackMcpAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        eventType: "tool_call",
        toolName: "listHoldings",
        authType: "oauth",
      }),
    );
  });

  it("ignores non-POST requests", () => {
    const req = new Request("https://trefolio.com/api/mcp/user/mcp", { method: "GET" });
    recordMcpRequestAnalytics(req, "user-1", "acc:tok1", "tfp_pat_abc");
    expect(trackMcpAnalyticsEvent).not.toHaveBeenCalled();
  });
});
