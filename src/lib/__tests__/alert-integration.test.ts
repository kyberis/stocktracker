import { describe, expect, it } from "vitest";
import { createAlertSchema } from "../schemas";

describe("createAlertSchema — source field", () => {
  it("defaults source to 'alerts-tab' when not provided", () => {
    const result = createAlertSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      condition: "below",
      threshold: 150,
      currency: "USD",
      alertType: "threshold",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("alerts-tab");
    }
  });

  it("accepts source 'watchlist'", () => {
    const result = createAlertSchema.safeParse({
      ticker: "MSFT",
      name: "Microsoft",
      condition: "above",
      threshold: 400,
      currency: "USD",
      alertType: "threshold",
      source: "watchlist",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("watchlist");
    }
  });

  it("accepts source 'stock-drawer'", () => {
    const result = createAlertSchema.safeParse({
      ticker: "GOOGL",
      name: "Alphabet",
      condition: "below",
      threshold: 100,
      currency: "USD",
      alertType: "threshold",
      source: "stock-drawer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("stock-drawer");
    }
  });

  it("accepts source 'stock-row'", () => {
    const result = createAlertSchema.safeParse({
      ticker: "TSLA",
      name: "Tesla",
      condition: "above",
      threshold: 200,
      currency: "USD",
      alertType: "threshold",
      source: "stock-row",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("stock-row");
    }
  });

  it("accepts source 'profile' for portfolio-wide alerts", () => {
    const result = createAlertSchema.safeParse({
      condition: "above",
      alertType: "percent_change",
      percentBasis: "daily",
      percentValue: 5,
      isPortfolioWide: true,
      source: "profile",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("profile");
      expect(result.data.isPortfolioWide).toBe(true);
      expect(result.data.percentValue).toBe(5);
      expect(result.data.percentBasis).toBe("daily");
    }
  });

  it("rejects invalid source values", () => {
    const result = createAlertSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      condition: "below",
      threshold: 150,
      currency: "USD",
      alertType: "threshold",
      source: "invalid-source",
    });
    expect(result.success).toBe(false);
  });

  it("validates threshold alert still requires ticker and threshold > 0", () => {
    const noTicker = createAlertSchema.safeParse({
      condition: "below",
      threshold: 150,
      alertType: "threshold",
      source: "watchlist",
    });
    expect(noTicker.success).toBe(false);

    const zeroThreshold = createAlertSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      condition: "below",
      threshold: 0,
      alertType: "threshold",
      source: "watchlist",
    });
    expect(zeroThreshold.success).toBe(false);
  });

  it("validates percent_change alert requires percentValue > 0 and valid basis", () => {
    const noPct = createAlertSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      condition: "above",
      alertType: "percent_change",
      percentBasis: "daily",
      percentValue: 0,
      source: "stock-drawer",
    });
    expect(noPct.success).toBe(false);

    const noBasis = createAlertSchema.safeParse({
      ticker: "AAPL",
      name: "Apple",
      condition: "above",
      alertType: "percent_change",
      percentValue: 5,
      source: "stock-drawer",
    });
    expect(noBasis.success).toBe(false);
  });
});
