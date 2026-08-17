import { describe, expect, it } from "vitest";
import {
  isValidAlertQuote,
  priceInAlertCurrency,
  shouldTriggerThreshold,
  shouldTriggerPercent,
  percentChangeSincePurchase,
  shouldFinalizeOneShot,
  isSameUtcDay,
  parseNotifiedTickers,
  tickerAlreadyNotifiedToday,
  mergeNotifiedTicker,
} from "../alert-evaluation";
import { normalizeAlertChannels } from "../alert-dispatcher";

describe("alert-evaluation", () => {
  it("rejects errored and zero quotes", () => {
    expect(isValidAlertQuote(undefined)).toBe(false);
    expect(isValidAlertQuote({ regularMarketPrice: 0, currency: "USD" })).toBe(false);
    expect(isValidAlertQuote({ regularMarketPrice: 10, currency: "USD", error: true })).toBe(false);
    expect(isValidAlertQuote({ regularMarketPrice: 10, currency: "USD" })).toBe(true);
  });

  it("compares threshold in same currency", () => {
    expect(shouldTriggerThreshold("above", 150, 140)).toBe(true);
    expect(shouldTriggerThreshold("below", 90, 100)).toBe(true);
    expect(shouldTriggerThreshold("below", 110, 100)).toBe(false);
  });

  it("converts quote price into alert currency when FX is available", () => {
    const rates = { EURUSD: 1.1 };
    // $110 → €100
    expect(priceInAlertCurrency(110, "USD", "EUR", rates)).toBeCloseTo(100, 5);
    expect(priceInAlertCurrency(110, "USD", "USD", rates)).toBe(110);
    expect(priceInAlertCurrency(110, "USD", "JPY", {})).toBeNull();
  });

  it("triggers percent on absolute move", () => {
    expect(shouldTriggerPercent(5.1, 5)).toBe(true);
    expect(shouldTriggerPercent(-5.1, 5)).toBe(true);
    expect(shouldTriggerPercent(4.9, 5)).toBe(false);
    expect(shouldTriggerPercent(null, 5)).toBe(false);
  });

  it("computes purchase-basis percent with FX", () => {
    const rates = { EURUSD: 1.1 };
    // bought at €100, quote $121 (= €110) → +10%
    const pct = percentChangeSincePurchase(121, "USD", 100, "EUR", rates);
    expect(pct).toBeCloseTo(10, 4);
  });

  it("finalizes one-shot after send or permanent skips, not transient fails", () => {
    expect(
      shouldFinalizeOneShot({
        channelsRequested: ["email"],
        channelsSent: ["email"],
        channelsFailed: [],
      }),
    ).toBe(true);
    expect(
      shouldFinalizeOneShot({
        channelsRequested: ["email"],
        channelsSent: [],
        channelsFailed: ["email"],
      }),
    ).toBe(false);
    expect(
      shouldFinalizeOneShot({
        channelsRequested: ["email"],
        channelsSent: [],
        channelsFailed: [],
      }),
    ).toBe(true);
    expect(
      shouldFinalizeOneShot({
        channelsRequested: [],
        channelsSent: [],
        channelsFailed: [],
      }),
    ).toBe(true);
  });

  it("same UTC day helper", () => {
    expect(isSameUtcDay(new Date().toISOString())).toBe(true);
    expect(isSameUtcDay("")).toBe(false);
    expect(isSameUtcDay("2020-01-01T00:00:00.000Z")).toBe(false);
  });

  it("tracks every notified ticker for the UTC day, not only the last one", () => {
    expect(parseNotifiedTickers("AAPL, MSFT")).toEqual(["AAPL", "MSFT"]);
    const now = new Date("2026-08-17T15:00:00.000Z");
    expect(
      tickerAlreadyNotifiedToday("2026-08-17T08:00:00.000Z", "AAPL,MSFT", "AAPL", now),
    ).toBe(true);
    expect(
      tickerAlreadyNotifiedToday("2026-08-17T08:00:00.000Z", "AAPL,MSFT", "NVDA", now),
    ).toBe(false);
    expect(
      tickerAlreadyNotifiedToday("2026-08-16T22:00:00.000Z", "AAPL", "AAPL", now),
    ).toBe(false);
    expect(mergeNotifiedTicker("AAPL", "MSFT", true)).toBe("AAPL,MSFT");
    expect(mergeNotifiedTicker("AAPL,MSFT", "aapl", true)).toBe("AAPL,MSFT");
    expect(mergeNotifiedTicker("AAPL", "MSFT", false)).toBe("MSFT");
  });
});

describe("normalizeAlertChannels", () => {
  it("maps legacy whatsapp to telegram and drops unknowns", () => {
    expect(normalizeAlertChannels(["email", "whatsapp" as never, "sms" as never])).toEqual([
      "email",
      "telegram",
    ]);
  });

  it("preserves email and telegram selection order without dupes", () => {
    expect(normalizeAlertChannels(["telegram", "email", "email"])).toEqual(["telegram", "email"]);
  });
});
