import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ session: { userId: "admin_1" }, error: null }),
}));

vi.mock("@/lib/db", () => ({
  getProdOpsConfig: vi.fn(),
  getProdOpsSharedSecretMeta: vi.fn(),
  setProdOpsConfig: vi.fn(),
  setProdOpsSharedSecret: vi.fn(),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: (req: NextRequest) => Promise<NextResponse>) => handler,
}));

describe("admin prodops config route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current config on GET", async () => {
    const { getProdOpsConfig, getProdOpsSharedSecretMeta } = await import("@/lib/db");
    vi.mocked(getProdOpsConfig).mockResolvedValue({
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

    const { GET } = await import("./route");
    const response = await GET(new NextRequest("http://localhost/api/admin/prodops-config"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
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

  it("persists config and rotates shared secret on PUT", async () => {
    const { setProdOpsConfig, setProdOpsSharedSecret, getProdOpsSharedSecretMeta } = await import("@/lib/db");
    vi.mocked(setProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolio_prodops_bot",
      enabledEventTypes: ["user_registered", "membership_paid"],
      recipient: {
        id: "recipient_1",
        label: "@ops",
        type: "telegram_dm",
        source: "telegram_link",
        chatId: "12345",
        enabled: true,
        enabledEventTypes: ["user_registered"],
        telegramUserId: "777",
        telegramUsername: "ops",
        linkedAt: "2026-05-26T00:00:00.000Z",
      },
      pendingLink: null,
    });
    vi.mocked(getProdOpsSharedSecretMeta).mockResolvedValue({
      hasSecret: true,
      maskedSecret: "shar...cret",
      source: "database",
    });

    const { PUT } = await import("./route");
    const response = await PUT(
      new NextRequest("http://localhost/api/admin/prodops-config", {
        method: "PUT",
        body: JSON.stringify({
          enabled: true,
          baseUrl: "https://ops.trefolio.com",
          botUsername: "@trefolio_prodops_bot",
          enabledEventTypes: ["user_registered", "membership_paid"],
          recipient: {
            id: "recipient_1",
            label: "@ops",
            type: "telegram_dm",
            source: "telegram_link",
            chatId: "12345",
            enabled: true,
            enabledEventTypes: ["user_registered"],
            telegramUserId: "777",
            telegramUsername: "ops",
            linkedAt: "2026-05-26T00:00:00.000Z",
          },
          sharedSecret: "shared-secret",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(setProdOpsSharedSecret).toHaveBeenCalledWith("shared-secret");
    expect(setProdOpsConfig).toHaveBeenCalledWith({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "@trefolio_prodops_bot",
      enabledEventTypes: ["user_registered", "membership_paid"],
      recipient: {
        id: "recipient_1",
        label: "@ops",
        type: "telegram_dm",
        source: "telegram_link",
        chatId: "12345",
        enabled: true,
        enabledEventTypes: ["user_registered"],
        telegramUserId: "777",
        telegramUsername: "ops",
        linkedAt: "2026-05-26T00:00:00.000Z",
      },
    });
  });
});
