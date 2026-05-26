import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  getLatestCreatedUser: vi.fn(),
  getLatestFeedbackEntries: vi.fn(),
  getLatestAnalyticsInteraction: vi.fn(),
  getProdOpsConfig: vi.fn(),
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

describe("POST /api/internal/prodops-query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the latest created user for the linked recipient", async () => {
    const {
      getLatestCreatedUser,
      getProdOpsConfig,
      getProdOpsSharedSecret,
    } = await import("@/lib/db");
    const { verifyProdOpsBodySignature } = await import("@/lib/prodops");

    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");
    vi.mocked(verifyProdOpsBodySignature).mockReturnValue(true);
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolioopsbot",
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
    vi.mocked(getLatestCreatedUser).mockResolvedValue({
      id: "user_1",
      username: "newuser",
      email: "new@example.com",
      displayName: "New User",
      authProvider: "google",
      plan: "free",
      createdAt: "2026-05-26T01:00:00.000Z",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-query", {
        method: "POST",
        headers: {
          "x-prodops-timestamp": "1716670000",
          "x-prodops-signature": "sha256=test",
        },
        body: JSON.stringify({
          chatId: "12345",
          queryType: "latest_user_created",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      queryType: "latest_user_created",
      user: expect.objectContaining({
        id: "user_1",
        username: "newuser",
      }),
      adminUrl: "https://trefolio.com/admin/users/user_1",
    });
  });

  it("returns forbidden when the chat id is not the linked recipient", async () => {
    const { getProdOpsConfig, getProdOpsSharedSecret } = await import("@/lib/db");
    const { verifyProdOpsBodySignature } = await import("@/lib/prodops");

    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");
    vi.mocked(verifyProdOpsBodySignature).mockReturnValue(true);
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolioopsbot",
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

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-query", {
        method: "POST",
        headers: {
          "x-prodops-timestamp": "1716670000",
          "x-prodops-signature": "sha256=test",
        },
        body: JSON.stringify({
          chatId: "99999",
          queryType: "latest_feedbacks",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("returns the latest feedbacks", async () => {
    const {
      getLatestFeedbackEntries,
      getProdOpsConfig,
      getProdOpsSharedSecret,
    } = await import("@/lib/db");
    const { verifyProdOpsBodySignature } = await import("@/lib/prodops");

    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");
    vi.mocked(verifyProdOpsBodySignature).mockReturnValue(true);
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolioopsbot",
      enabledEventTypes: ["feedback_received"],
      recipient: {
        id: "recipient_1",
        label: "@ops",
        type: "telegram_dm",
        source: "telegram_link",
        chatId: "12345",
        enabled: true,
        enabledEventTypes: ["feedback_received"],
        telegramUserId: "777",
        telegramUsername: "ops",
        linkedAt: "2026-05-26T00:00:00.000Z",
      },
      pendingLink: null,
    });
    vi.mocked(getLatestFeedbackEntries).mockResolvedValue([
      {
        id: "fb_1",
        userId: "user_1",
        username: "marcos",
        subject: "Dark mode bug",
        type: "bug",
        status: "open",
        createdAt: "2026-05-26T01:00:00.000Z",
      },
    ]);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-query", {
        method: "POST",
        headers: {
          "x-prodops-timestamp": "1716670000",
          "x-prodops-signature": "sha256=test",
        },
        body: JSON.stringify({
          chatId: "12345",
          queryType: "latest_feedbacks",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      queryType: "latest_feedbacks",
      items: [
        expect.objectContaining({
          id: "fb_1",
          subject: "Dark mode bug",
        }),
      ],
      adminUrl: "https://trefolio.com/admin/feedback",
    });
  });

  it("returns the latest analytics interaction", async () => {
    const {
      getLatestAnalyticsInteraction,
      getProdOpsConfig,
      getProdOpsSharedSecret,
    } = await import("@/lib/db");
    const { verifyProdOpsBodySignature } = await import("@/lib/prodops");

    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");
    vi.mocked(verifyProdOpsBodySignature).mockReturnValue(true);
    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolioopsbot",
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
    vi.mocked(getLatestAnalyticsInteraction).mockResolvedValue({
      userId: "user_2",
      username: "alice",
      event: "portfolio_import",
      metadataSummary: "broker=degiro, rows=42",
      createdAt: "2026-05-26T01:15:00.000Z",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/internal/prodops-query", {
        method: "POST",
        headers: {
          "x-prodops-timestamp": "1716670000",
          "x-prodops-signature": "sha256=test",
        },
        body: JSON.stringify({
          chatId: "12345",
          queryType: "latest_user_interaction",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      queryType: "latest_user_interaction",
      interaction: expect.objectContaining({
        userId: "user_2",
        event: "portfolio_import",
      }),
      adminUrl: "https://trefolio.com/admin/users/user_2",
    });
  });
});
