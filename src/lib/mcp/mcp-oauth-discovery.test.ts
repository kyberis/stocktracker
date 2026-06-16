import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildMcpOAuthProtectedResourceMetadata,
  getMcpStreamableHttpUrl,
} from "./mcp-oauth-discovery";
import { verifyIdpOAuthAccessBearer } from "./idp-oauth-access-auth";
import { verifyMcpRequestAuthDetailed } from "./trefolio-pat-auth";

vi.mock("@/lib/accounts-pat-introspect", () => ({
  isTfpPatToken: (s: string) => s.startsWith("tfp_pat_"),
  introspectTfpPatDetailed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserIdByIdpSub: vi.fn(),
}));

vi.mock("@/lib/mcp/idp-oauth-access-auth", () => ({
  isIdpOAuthAccessToken: (s: string) => s.startsWith("dev-access-"),
  verifyIdpOAuthAccessBearer: vi.fn(),
}));

describe("mcp oauth discovery", () => {
  it("builds protected resource metadata for Claude", () => {
    const meta = buildMcpOAuthProtectedResourceMetadata();
    expect(meta.resource).toBe(getMcpStreamableHttpUrl());
    expect(meta.authorization_servers).toContain("https://user.trefolio.com");
    expect(meta.scopes_supported).toContain("mcp:ecosystem");
  });
});

describe("verifyMcpRequestAuthDetailed", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const intro = await import("@/lib/accounts-pat-introspect");
    const oauth = await import("@/lib/mcp/idp-oauth-access-auth");
    const db = await import("@/lib/db");
    vi.mocked(intro.introspectTfpPatDetailed).mockResolvedValue({
      ok: true,
      sub: "idp|123",
      tokenId: "tok1",
    });
    vi.mocked(db.findUserIdByIdpSub).mockResolvedValue("user-uuid");
    vi.mocked(oauth.verifyIdpOAuthAccessBearer).mockResolvedValue({
      sub: "idp|456",
      userId: "user-oauth",
    });
  });

  it("accepts IdP OAuth access tokens", async () => {
    const result = await verifyMcpRequestAuthDetailed("dev-access-abc.idp|456");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.userId).toBe("user-oauth");
      expect(result.auth.tokenId).toMatch(/^oauth:/);
    }
  });
});

describe("verifyIdpOAuthAccessBearer", () => {
  it("exports oauth token prefix helper via mock boundary", () => {
    expect(verifyIdpOAuthAccessBearer).toBeDefined();
  });
});
