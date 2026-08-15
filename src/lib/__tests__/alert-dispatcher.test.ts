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
}));

import { dispatchAlert } from "../alert-dispatcher";

describe("dispatchAlert channels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendAlertEmail.mockResolvedValue({ success: true });
    sendTelegramAlert.mockResolvedValue({ success: true });
    isFeatureEnabled.mockResolvedValue(true);
    getTelegramQuota.mockResolvedValue({ allowed: true });
    listPushSubscriptions.mockResolvedValue([]);
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
});
