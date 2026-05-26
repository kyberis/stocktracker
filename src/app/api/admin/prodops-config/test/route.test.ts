import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    session: { userId: "admin_1", role: "admin" },
    error: null,
  }),
}));

vi.mock("@/lib/db", () => ({
  getProdOpsConfig: vi.fn(),
  getProdOpsSharedSecret: vi.fn(),
}));

vi.mock("@/lib/prodops", () => ({
  enqueueProdOpsTestEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/with-metrics", () => ({
  withMetrics: (_name: string, handler: (req: NextRequest) => Promise<Response>) => handler,
}));

describe("POST /api/admin/prodops-config/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when prodops is disabled", async () => {
    const { getProdOpsConfig, getProdOpsSharedSecret } = await import("@/lib/db");
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: false,
      baseUrl: "",
      botUsername: "",
      enabledEventTypes: [],
      recipient: null,
      pendingLink: null,
    });
    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("");

    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/admin/prodops-config/test", { method: "POST" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ProdOps is disabled" });
  });

  it("queues a test event when config is valid", async () => {
    const { getProdOpsConfig, getProdOpsSharedSecret } = await import("@/lib/db");
    const { enqueueProdOpsTestEvent } = await import("@/lib/prodops");
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolio_prodops_bot",
      enabledEventTypes: ["user_registered"],
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
    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");

    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/admin/prodops-config/test", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, queued: true });
    expect(enqueueProdOpsTestEvent).toHaveBeenCalledWith("admin_1");
  });
});
