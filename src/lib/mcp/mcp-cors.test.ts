import { describe, expect, it } from "vitest";

import { mcpCorsPreflightResponse, withMcpCors } from "./mcp-cors";

describe("mcp cors", () => {
  it("adds Access-Control-Allow-Origin to responses", () => {
    const wrapped = withMcpCors(new Response("ok", { status: 200 }));
    expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns OPTIONS preflight with MCP methods", () => {
    const res = mcpCorsPreflightResponse();
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
  });
});
