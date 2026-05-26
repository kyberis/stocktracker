import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  completeProdOpsRecipientLink: vi.fn(),
  getProdOpsSharedSecret: vi.fn(),
}));

vi.mock("@/lib/prodops", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prodops")>("@/lib/prodops");
  return {
    ...actual,
    verifyProdOpsBodySignature: vi.fn(),
  };
});

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: (req: NextRequest) => Promise<Response>) => handler,
}));

describe("admin prodops link completion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a signed completion callback", async () => {
    const { getProdOpsSharedSecret, completeProdOpsRecipientLink } = await import("@/lib/db");
    const { verifyProdOpsBodySignature } = await import("@/lib/prodops");
    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");
    vi.mocked(verifyProdOpsBodySignature).mockReturnValue(true);
    vi.mocked(completeProdOpsRecipientLink).mockResolvedValue({
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
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/prodops-config/link/complete", {
        method: "POST",
        headers: {
          "x-prodops-timestamp": "1716670000",
          "x-prodops-signature": "sha256=test",
        },
        body: JSON.stringify({
          token: "test-token",
          chatId: "12345",
          telegramUserId: "777",
          telegramUsername: "ops",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      recipient: expect.objectContaining({
        chatId: "12345",
        telegramUsername: "ops",
      }),
    });
  });
});
