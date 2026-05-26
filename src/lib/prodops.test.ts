import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/settings", () => ({
  getProdOpsConfig: vi.fn(),
  getProdOpsSharedSecret: vi.fn(),
}));

vi.mock("@/lib/db/ops-events", () => ({
  createProdOpsEvent: vi.fn(),
  listProdOpsEventsReady: vi.fn(),
  markProdOpsEventDropped: vi.fn(),
  markProdOpsEventSent: vi.fn(),
  scheduleProdOpsEventRetry: vi.fn(),
}));

vi.mock("@/lib/db/users", () => ({
  findUserById: vi.fn(),
}));

describe("prodops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("signs payloads with sha256 HMAC", async () => {
    const { signProdOpsBody } = await import("./prodops");
    const signature = signProdOpsBody('{"ok":true}', "secret", "1716670000");
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("dispatches a ready event to prodops and marks it sent", async () => {
    const { getProdOpsConfig, getProdOpsSharedSecret } = await import("@/lib/db/settings");
    const {
      listProdOpsEventsReady,
      markProdOpsEventSent,
    } = await import("@/lib/db/ops-events");
    const { findUserById } = await import("@/lib/db/users");

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
    vi.mocked(listProdOpsEventsReady).mockResolvedValue([{
      id: "evt_1",
      eventType: "user_registered",
      userId: "user_1",
      dedupeKey: "user_registered:user_1",
      sourceApp: "trefolio",
      summary: "New signup",
      adminUrl: "https://trefolio.com/admin/users/user_1",
      payloadJson: "{\"method\":\"google\"}",
      status: "pending",
      attempts: 0,
      nextAttemptAt: "2026-05-26 00:00:00",
      lastAttemptedAt: "",
      lastError: "",
      sentAt: "",
      createdAt: "2026-05-26 00:00:00",
    }]);
    vi.mocked(findUserById).mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      username: "demo",
      display_name: "Demo User",
    } as never);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(""),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { dispatchPendingProdOpsEvents } = await import("./prodops");
    const result = await dispatchPendingProdOpsEvents();

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ops.trefolio.com/api/intake",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-ProdOps-Timestamp": expect.any(String),
          "X-ProdOps-Signature": expect.stringMatching(/^sha256=/),
        }),
      }),
    );
    expect(markProdOpsEventSent).toHaveBeenCalledWith("evt_1");
  });

  it("drops events with no matching destinations", async () => {
    const { getProdOpsConfig, getProdOpsSharedSecret } = await import("@/lib/db/settings");
    const {
      listProdOpsEventsReady,
      markProdOpsEventDropped,
    } = await import("@/lib/db/ops-events");

    vi.mocked(getProdOpsConfig).mockResolvedValue({
      enabled: true,
      baseUrl: "https://ops.trefolio.com",
      botUsername: "trefolio_prodops_bot",
      enabledEventTypes: ["membership_paid"],
      recipient: null,
      pendingLink: null,
    });
    vi.mocked(getProdOpsSharedSecret).mockResolvedValue("shared-secret");
    vi.mocked(listProdOpsEventsReady).mockResolvedValue([{
      id: "evt_2",
      eventType: "user_registered",
      userId: "user_2",
      dedupeKey: "user_registered:user_2",
      sourceApp: "trefolio",
      summary: "No destination",
      adminUrl: "https://trefolio.com/admin/users/user_2",
      payloadJson: "{}",
      status: "pending",
      attempts: 0,
      nextAttemptAt: "2026-05-26 00:00:00",
      lastAttemptedAt: "",
      lastError: "",
      sentAt: "",
      createdAt: "2026-05-26 00:00:00",
    }]);

    const { dispatchPendingProdOpsEvents } = await import("./prodops");
    const result = await dispatchPendingProdOpsEvents();

    expect(result.dropped).toBe(1);
    expect(markProdOpsEventDropped).toHaveBeenCalledWith("evt_2", "no_matching_destinations");
  });

  it("builds a user registration outbox event", async () => {
    const { createProdOpsEvent } = await import("@/lib/db/ops-events");
    const { findUserById } = await import("@/lib/db/users");
    vi.mocked(findUserById).mockResolvedValue({
      id: "user_3",
      email: "new@example.com",
      username: "newbie",
      display_name: "New User",
    } as never);

    const { enqueueProdOpsUserRegisteredEvent } = await import("./prodops");
    await enqueueProdOpsUserRegisteredEvent({
      userId: "user_3",
      method: "apple",
    });

    expect(createProdOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "user_registered",
        userId: "user_3",
        dedupeKey: "user_registered:user_3",
        sourceApp: "trefolio",
      }),
    );
  });
});
