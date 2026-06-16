import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  extractBearer,
  mcpPatAuthFailureMessage,
  verifyTrefolioMcpBearer,
  verifyTrefolioMcpBearerDetailed,
} from "./trefolio-pat-auth";

vi.mock("@/lib/accounts-pat-introspect", () => ({
  isTfpPatToken: (s: string) => s.startsWith("tfp_pat_"),
  introspectTfpPat: vi.fn(),
  introspectTfpPatDetailed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  findUserIdByIdpSub: vi.fn(),
}));

describe("extractBearer", () => {
  it("parses Bearer header", () => {
    const h = new Headers({ Authorization: "Bearer tfp_pat_abc" });
    expect(extractBearer(h)).toBe("tfp_pat_abc");
  });

  it("returns null when missing or wrong scheme", () => {
    expect(extractBearer(new Headers())).toBeNull();
    expect(extractBearer(new Headers({ Authorization: "Basic x" }))).toBeNull();
  });
});

describe("verifyTrefolioMcpBearer", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const intro = await import("@/lib/accounts-pat-introspect");
    const db = await import("@/lib/db");
    vi.mocked(intro.introspectTfpPatDetailed).mockResolvedValue({
      ok: true,
      sub: "idp|123",
      tokenId: "tok1",
    });
    vi.mocked(db.findUserIdByIdpSub).mockResolvedValue("user-uuid");
  });

  it("returns userId when introspection and local user match", async () => {
    const auth = await verifyTrefolioMcpBearer("tfp_pat_test");
    expect(auth).toEqual({ userId: "user-uuid", tokenId: "acc:tok1" });
  });

  it("returns null for non-tfp prefix", async () => {
    const auth = await verifyTrefolioMcpBearer("clara_pat_x");
    expect(auth).toBeNull();
  });

  it("returns null when no local user", async () => {
    const db = await import("@/lib/db");
    vi.mocked(db.findUserIdByIdpSub).mockResolvedValueOnce(null);
    const auth = await verifyTrefolioMcpBearer("tfp_pat_test");
    expect(auth).toBeNull();
  });
});

describe("verifyTrefolioMcpBearerDetailed", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const intro = await import("@/lib/accounts-pat-introspect");
    const db = await import("@/lib/db");
    vi.mocked(intro.introspectTfpPatDetailed).mockResolvedValue({
      ok: true,
      sub: "idp|123",
      tokenId: "tok1",
    });
    vi.mocked(db.findUserIdByIdpSub).mockResolvedValue("user-uuid");
  });

  it("reports missing bearer", async () => {
    expect(await verifyTrefolioMcpBearerDetailed(null)).toEqual({ ok: false, reason: "missing_bearer" });
  });

  it("reports idp_not_configured from introspection", async () => {
    const intro = await import("@/lib/accounts-pat-introspect");
    vi.mocked(intro.introspectTfpPatDetailed).mockResolvedValueOnce({
      ok: false,
      reason: "idp_not_configured",
    });
    expect(await verifyTrefolioMcpBearerDetailed("tfp_pat_test")).toEqual({
      ok: false,
      reason: "idp_not_configured",
    });
    expect(mcpPatAuthFailureMessage("idp_not_configured")).toContain("user.trefolio.com");
  });
});
