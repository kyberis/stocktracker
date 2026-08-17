import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sendAlertEmail,
  sendPercentAlertEmail,
  sendTelegramAlert,
  sendPushNotification,
  listPushSubscriptions,
  createDeviceNotification,
  getTelegramQuota,
  incrementTelegramCounter,
  isFeatureEnabled,
  trackEvent,
  hasRecentFiredEmailDispatch,
} = vi.hoisted(() => ({
  sendAlertEmail: vi.fn(),
  sendPercentAlertEmail: vi.fn(),
  sendTelegramAlert: vi.fn(),
  sendPushNotification: vi.fn(),
  listPushSubscriptions: vi.fn(),
  createDeviceNotification: vi.fn(),
  getTelegramQuota: vi.fn(),
  incrementTelegramCounter: vi.fn(),
  isFeatureEnabled: vi.fn(),
  trackEvent: vi.fn(),
  hasRecentFiredEmailDispatch: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendAlertEmail,
  sendPercentAlertEmail,
}));
vi.mock("@/lib/telegram", () => ({
  sendTelegramAlert,
}));
vi.mock("@/lib/web-push", () => ({
  sendPushNotification,
}));
vi.mock("@/lib/db", () => ({
  listPushSubscriptions,
  deletePushSubscription: vi.fn(),
  createDeviceNotification,
  getTelegramQuota,
  incrementTelegramCounter,
  isFeatureEnabled,
  trackEvent,
  hasRecentFiredEmailDispatch,
}));

import { buildPushBody, dispatchAlert } from "../alert-dispatcher";

describe("dispatchAlert channels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendAlertEmail.mockResolvedValue({ success: true });
    sendTelegramAlert.mockResolvedValue({ success: true });
    isFeatureEnabled.mockResolvedValue(true);
    getTelegramQuota.mockResolvedValue({ allowed: true });
    listPushSubscriptions.mockResolvedValue([]);
    hasRecentFiredEmailDispatch.mockResolvedValue(false);
  });

  it("sends only email when email is selected", async () => {
    const result = await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["email"],
        telegramChatId: "123",
      },
      {
        type: "threshold",
        ticker: "AAPL",
        name: "Apple",
        condition: "above",
        threshold: 200,
        currentPrice: 201,
        currency: "USD",
      },
    );

    expect(sendAlertEmail).toHaveBeenCalledTimes(1);
    expect(sendTelegramAlert).not.toHaveBeenCalled();
    expect(result.channelsSent).toEqual(["email"]);
    expect(result.channelsRequested).toEqual(["email"]);
  });

  it("sends email and telegram when both selected", async () => {
    const result = await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["email", "telegram"],
        telegramChatId: "999",
      },
      {
        type: "threshold",
        ticker: "AAPL",
        name: "Apple",
        condition: "below",
        threshold: 100,
        currentPrice: 90,
        currency: "USD",
      },
    );

    expect(sendAlertEmail).toHaveBeenCalledTimes(1);
    expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
    expect(result.channelsSent).toEqual(["email", "telegram"]);
  });

  it("skips telegram when not linked and does not invent whatsapp", async () => {
    const result = await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["telegram", "whatsapp" as never],
        telegramChatId: "",
      },
      {
        type: "threshold",
        ticker: "MSFT",
        name: "Microsoft",
        condition: "above",
        threshold: 400,
        currentPrice: 410,
        currency: "USD",
      },
    );

    expect(sendTelegramAlert).not.toHaveBeenCalled();
    expect(sendAlertEmail).not.toHaveBeenCalled();
    expect(result.channelsRequested).toEqual(["telegram"]);
    expect(result.channelsSkipped).toEqual([
      { channel: "telegram", reason: "telegram_not_linked" },
    ]);
  });

  it("skips unverified email instead of sending", async () => {
    const result = await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: false,
        plan: "free",
        alertChannels: ["email"],
        telegramChatId: "",
      },
      {
        type: "threshold",
        ticker: "AAPL",
        name: "Apple",
        condition: "above",
        threshold: 1,
        currentPrice: 2,
        currency: "USD",
      },
    );

    expect(sendAlertEmail).not.toHaveBeenCalled();
    expect(result.channelsSkipped[0]?.reason).toBe("email_unverified");
  });

  it("skips email when the same alert already emailed in 24h", async () => {
    hasRecentFiredEmailDispatch.mockResolvedValue(true);
    const result = await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["email"],
        telegramChatId: "",
      },
      {
        type: "threshold",
        ticker: "AAPL",
        name: "Apple",
        condition: "above",
        threshold: 200,
        currentPrice: 201,
        currency: "USD",
        alertId: "alert-1",
      },
    );

    expect(sendAlertEmail).not.toHaveBeenCalled();
    expect(hasRecentFiredEmailDispatch).toHaveBeenCalledWith("alert-1", "AAPL");
    expect(result.channelsSkipped).toEqual([{ channel: "email", reason: "already_emailed_24h" }]);
  });

  it("passes headlines through to the threshold email", async () => {
    await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["email"],
        telegramChatId: "",
      },
      {
        type: "threshold",
        ticker: "AAPL",
        name: "Apple",
        condition: "above",
        threshold: 200,
        currentPrice: 201,
        currency: "USD",
        headlines: [{ title: "Apple news", source: "Reuters", publishedAt: "2026-08-17T10:00:00Z", url: "https://example.com/a" }],
      },
    );

    expect(sendAlertEmail).toHaveBeenCalledWith(
      "a@example.com",
      expect.objectContaining({
        headlines: [expect.objectContaining({ title: "Apple news" })],
      }),
      undefined,
      "u1",
    );
  });

  it("includes the top headline in Telegram and push/device copy", async () => {
    listPushSubscriptions.mockResolvedValue([
      { endpoint: "https://push.example/1", p256dh: "p", auth: "a" },
    ]);
    sendPushNotification.mockResolvedValue({ success: true });
    createDeviceNotification.mockResolvedValue(undefined);

    const payload = {
      type: "threshold" as const,
      ticker: "AAPL",
      name: "Apple",
      condition: "above" as const,
      threshold: 200,
      currentPrice: 201,
      currency: "USD",
      headlines: [
        { title: "Apple reports earnings", source: "Reuters", publishedAt: "2026-08-17T10:00:00Z", url: "https://example.com/a" },
      ],
    };

    expect(buildPushBody(payload)).toContain("Apple reports earnings");

    await dispatchAlert(
      {
        userId: "u1",
        email: "a@example.com",
        emailVerified: true,
        plan: "pro",
        alertChannels: ["telegram", "push", "device"],
        telegramChatId: "999",
      },
      payload,
    );

    expect(sendTelegramAlert).toHaveBeenCalledWith(
      "999",
      expect.objectContaining({
        headline: { title: "Apple reports earnings", url: "https://example.com/a" },
      }),
    );
    expect(sendPushNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: expect.stringContaining("Apple reports earnings") }),
    );
    expect(createDeviceNotification).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ message: expect.stringContaining("Apple reports earnings") }),
    );
  });
});
