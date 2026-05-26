import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ session: { userId: "admin_1" }, error: null }),
}));

vi.mock("@/lib/db", () => ({
  createProdOpsRecipientLink: vi.fn(),
  getProdOpsSharedSecretMeta: vi.fn(),
  unlinkProdOpsRecipient: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: (req: NextRequest) => Promise<Response>) => handler,
}));

describe("admin prodops link route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a deep link on POST", async () => {
    const { createProdOpsRecipientLink } = await import("@/lib/db");
    vi.mocked(createProdOpsRecipientLink).mockResolvedValue({
      deepLink: "https://t.me/trefolio_prodops_bot?start=test-token",
      expiresAt: "2999-05-26T00:15:00.000Z",
    });

    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/admin/prodops-config/link", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      deepLink: "https://t.me/trefolio_prodops_bot?start=test-token",
      expiresAt: "2999-05-26T00:15:00.000Z",
    });
  });

  it("unlinks the recipient on DELETE", async () => {
    const { unlinkProdOpsRecipient, getProdOpsSharedSecretMeta } = await import("@/lib/db");
    vi.mocked(unlinkProdOpsRecipient).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolio_prodops_bot",
      enabledEventTypes: ["user_registered"],
      recipient: null,
      pendingLink: null,
    });
    vi.mocked(getProdOpsSharedSecretMeta).mockResolvedValue({
      hasSecret: true,
      maskedSecret: "shar...cret",
      source: "database",
    });

    const { DELETE } = await import("./route");
    const response = await DELETE(new NextRequest("http://localhost/api/admin/prodops-config/link", { method: "DELETE" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      config: {
        enabled: true,
        baseUrl: "https://ops.trefolio.com",
        botUsername: "trefolio_prodops_bot",
        enabledEventTypes: ["user_registered"],
        recipient: null,
        pendingLink: null,
      },
      hasSharedSecret: true,
      maskedSharedSecret: "shar...cret",
      secretSource: "database",
    });
  });
});
