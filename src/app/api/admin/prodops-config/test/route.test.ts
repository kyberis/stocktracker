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
      enabledEventTypes: [],
      destinations: [],
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
      enabledEventTypes: ["user_registered"],
      destinations: [{
        id: "dest_1",
        label: "Ops",
        chatId: "-1001",
        enabled: true,
        enabledEventTypes: ["user_registered"],
      }],
    });
    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");

    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/admin/prodops-config/test", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, queued: true });
    expect(enqueueProdOpsTestEvent).toHaveBeenCalledWith("admin_1");
  });
});
