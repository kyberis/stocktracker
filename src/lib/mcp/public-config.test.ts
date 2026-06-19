import { describe, it, expect } from "vitest";

import {
  buildClaudeCodeMcpCliSnippet,
  buildClaudeDesktopMcpConfigSnippet,
  buildCursorMcpConfigSnippet,
  getProfileMcpUrl,
  getIdpDeveloperTokensUrl,
  getMcpUserEndpointUrl,
} from "@/lib/mcp/public-config";
import { resolveIdpDeveloperHref } from "@/lib/idp/config";

describe("mcp public config", () => {
  it("builds endpoint from APP_BASE_URL", () => {
    const prev = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://example.com/";
    expect(getMcpUserEndpointUrl()).toBe("https://example.com/api/mcp/user");
    process.env.APP_BASE_URL = prev;
  });

  it("builds cursor snippet with /mcp suffix", () => {
    const snippet = buildCursorMcpConfigSnippet("https://trefolio.com/api/mcp/user");
    expect(snippet).toContain("https://trefolio.com/api/mcp/user/mcp");
    expect(snippet).toContain("tfp_pat_YOUR_TOKEN_HERE");
  });

  it("builds Claude Desktop snippet with type http and bearer header", () => {
    const snippet = buildClaudeDesktopMcpConfigSnippet("https://trefolio.com/api/mcp/user");
    const parsed = JSON.parse(snippet) as {
      mcpServers: { trefolio: { type: string; url: string; headers: { Authorization: string } } };
    };
    expect(parsed.mcpServers.trefolio.type).toBe("http");
    expect(parsed.mcpServers.trefolio.headers.Authorization).toContain("tfp_pat_");
  });

  it("builds Claude Code CLI snippet", () => {
    const snippet = buildClaudeCodeMcpCliSnippet("https://trefolio.com/api/mcp/user");
    expect(snippet).toContain("claude mcp add");
    expect(snippet).toContain("https://trefolio.com/api/mcp/user/mcp");
    expect(snippet).toContain("tfp_pat_YOUR_TOKEN_HERE");
  });

  it("returns profile MCP tab URL", () => {
    const prev = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://trefolio.com";
    expect(getProfileMcpUrl()).toBe("https://trefolio.com/profile?section=mcp");
    expect(getIdpDeveloperTokensUrl()).toBe(getProfileMcpUrl());
    process.env.APP_BASE_URL = prev;
  });
});

describe("resolveIdpDeveloperHref", () => {
  it("returns null when IdP issuer is unset in dev", () => {
    const prevIssuer = process.env.IDP_ISSUER;
    const prevBase = process.env.IDP_BASE_URL;
    const prevNode = process.env.NODE_ENV;
    delete process.env.IDP_ISSUER;
    delete process.env.IDP_BASE_URL;
    process.env.NODE_ENV = "development";
    expect(resolveIdpDeveloperHref({ from: "trefolio" })).toBeNull();
    process.env.IDP_ISSUER = prevIssuer;
    process.env.IDP_BASE_URL = prevBase;
    process.env.NODE_ENV = prevNode;
  });

  it("builds developer URL from issuer", () => {
    const prevIssuer = process.env.IDP_ISSUER;
    process.env.IDP_ISSUER = "https://user.example.com";
    expect(resolveIdpDeveloperHref({ from: "trefolio" })).toBe(
      "https://user.example.com/account/developer?from=trefolio",
    );
    process.env.IDP_ISSUER = prevIssuer;
  });
});
