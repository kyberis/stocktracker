import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  createProdOpsRecipientLink: vi.fn(),
  getProdOpsConfig: vi.fn(),
  getProdOpsSharedSecretMeta: vi.fn(),
  unlinkProdOpsRecipient: vi.fn(),
}));

describe("internal prodops-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IDP_SERVICE_TOKEN = "idp-secret";
  });

  it("rejects missing bearer token", async () => {
    const { GET } = await import("./route");
    const response = await GET(new NextRequest("http://localhost/api/internal/prodops-link"));
    expect(response.status).toBe(401);
  });

  it("returns linked status for the IdP", async () => {
    const { getProdOpsConfig } = await import("@/lib/db");
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefoliobot",
      enabledEventTypes: ["user_registered"],
      recipient: {
        id: "recipient_1",
        label: "@ops",
        type: "telegram_dm",
        source: "telegram_link",
        chatId: "12345",
        enabled: true,
        enabledEventTypes: ["user_registered"],
      },
      pendingLink: null,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/internal/prodops-link", {
        headers: { authorization: "Bearer idp-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      linked: true,
      botUsername: "trefoliobot",
      enabled: true,
    });
  });

  it("mints a deep link", async () => {
    const { createProdOpsRecipientLink } = await import("@/lib/db");
    vi.mocked(createProdOpsRecipientLink).mockResolvedValue({
      deepLink: "https://t.me/trefoliobot?start=aabbccddeeff",
      expiresAt: "2026-08-13T00:00:00.000Z",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-link", {
        method: "POST",
        headers: { authorization: "Bearer idp-secret" },
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.deep_link).toBe("https://t.me/trefoliobot?start=aabbccddeeff");
    expect(json.deepLink).toBe(json.deep_link);
  });

  it("unlinks the recipient", async () => {
    const { unlinkProdOpsRecipient, getProdOpsSharedSecretMeta } = await import("@/lib/db");
    vi.mocked(unlinkProdOpsRecipient).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefoliobot",
      enabledEventTypes: ["user_registered"],
      recipient: null,
      pendingLink: null,
    });
    vi.mocked(getProdOpsSharedSecretMeta).mockResolvedValue({
      hasSecret: true,
      maskedSecret: "****",
      source: "env",
    });

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new NextRequest("http://localhost/api/internal/prodops-link", {
        method: "DELETE",
        headers: { authorization: "Bearer idp-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      linked: false,
      botUsername: "trefoliobot",
      hasSharedSecret: true,
    });
  });
});
