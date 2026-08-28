import { describe, expect, it } from "vitest";
import { priceAlertNotification } from "./notification-templates";

describe("priceAlertNotification", () => {
  it("builds a threshold above notification", () => {
    const n = priceAlertNotification({
      type: "threshold",
      ticker: "AAPL",
      name: "Apple",
      condition: "above",
      threshold: 200,
      currentPrice: 201.5,
      currency: "USD",
    });
    expect(n.type).toBe("alert");
    expect(n.title).toBe("i18n:notifPriceAlertTitle|AAPL");
    expect(n.message).toBe("i18n:notifPriceAlertAboveMessage|Apple|USD|200.00|201.50");
    expect(n.link).toBe("/tools/alerts");
  });

  it("builds a percent-change notification with localized message key", () => {
    const n = priceAlertNotification({
      type: "percent_change",
      ticker: "MSFT",
      name: "Microsoft",
      currentPrice: 400,
      currency: "USD",
      percentChange: -5.25,
      percentBasis: "daily",
    });
    expect(n.message).toBe("i18n:notifPriceAlertPercentDownTodayMessage|Microsoft|5.25|USD|400.00");
  });
});
