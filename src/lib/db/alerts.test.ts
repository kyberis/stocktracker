import { describe, it, expect, vi, beforeEach } from "vitest";
import * as alerts from "./alerts";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  const mockClient = { execute: mockExecute, batch: mockBatch };
  return { mockExecute, mockBatch, mockClient };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("alert-uuid-456"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const alertRow = {
  id: "alert-1",
  ticker: "AAPL",
  name: "AAPL above 150",
  condition: "above",
  threshold: 150,
  currency: "USD",
  active: 1,
  triggered: 0,
  triggered_at: "",
  created_at: "2024-01-15T10:00:00Z",
  alert_type: "threshold",
  percent_basis: "",
  percent_value: 0,
  is_portfolio_wide: 0,
  portfolio_id: "",
};

describe("alerts", () => {
  describe("listAlerts", () => {
    it("maps rows to PriceAlert array", async () => {
      mockExecute.mockResolvedValue({ rows: [alertRow] });
      const result = await alerts.listAlerts("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC",
        args: ["user-1"],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "alert-1",
        ticker: "AAPL",
        name: "AAPL above 150",
        condition: "above",
        threshold: 150,
        currency: "USD",
        active: true,
        triggered: false,
        alertType: "threshold",
        isPortfolioWide: false,
        portfolioId: "",
      });
    });
  });

  describe("listAlertedTickers", () => {
    it("returns distinct tickers", async () => {
      mockExecute.mockResolvedValue({
        rows: [{ ticker: "AAPL" }, { ticker: "MSFT" }],
      });
      const result = await alerts.listAlertedTickers("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT DISTINCT ticker FROM price_alerts WHERE user_id = ? AND active = 1",
        args: ["user-1"],
      });
      expect(result).toEqual(["AAPL", "MSFT"]);
    });
  });

  describe("countActiveAlerts", () => {
    it("returns count from cnt", async () => {
      mockExecute.mockResolvedValue({ rows: [{ cnt: 5 }] });
      const result = await alerts.countActiveAlerts("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT COUNT(*) as cnt FROM price_alerts WHERE user_id = ? AND active = 1",
        args: ["user-1"],
      });
      expect(result).toBe(5);
    });
  });

  describe("createAlert", () => {
    it("inserts and returns complete PriceAlert", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const alert = {
        ticker: "GOOGL",
        name: "GOOGL below 100",
        condition: "below" as const,
        threshold: 100,
        currency: "USD",
        alertType: "threshold" as const,
        percentBasis: "" as const,
        percentValue: 0,
        isPortfolioWide: false,
        portfolioId: "",
      };
      const result = await alerts.createAlert("user-1", alert);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO price_alerts"),
        args: [
          "alert-uuid-456",
          "user-1",
          "GOOGL",
          "GOOGL below 100",
          "below",
          100,
          "USD",
          "threshold",
          "",
          0,
          0,
          "",
        ],
      });
      expect(result.alreadyExists).toBe(false);
      expect(result.alert).toMatchObject({
        ...alert,
        id: "alert-uuid-456",
        active: true,
        triggered: false,
        triggeredAt: "",
      });
      expect(result.alert.createdAt).toBeDefined();
    });

    it("returns alreadyExists when identical active alert is present", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "existing-1",
            ticker: "GOOGL",
            name: "GOOGL below 100",
            condition: "below",
            threshold: 100,
            currency: "USD",
            active: 1,
            triggered: 0,
            triggered_at: "",
            created_at: "2026-01-01",
            alert_type: "threshold",
            percent_basis: "",
            percent_value: 0,
            is_portfolio_wide: 0,
            portfolio_id: "",
          },
        ],
      });
      const result = await alerts.createAlert("user-1", {
        ticker: "GOOGL",
        name: "GOOGL below 100",
        condition: "below",
        threshold: 100,
        currency: "USD",
        alertType: "threshold",
        percentBasis: "",
        percentValue: 0,
        isPortfolioWide: false,
        portfolioId: "",
      });
      expect(result.alreadyExists).toBe(true);
      expect(result.alert.id).toBe("existing-1");
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteAlert", () => {
    it("returns true when rowsAffected > 0", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 1 });
      const result = await alerts.deleteAlert("user-1", "alert-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM price_alerts WHERE id = ? AND user_id = ?",
        args: ["alert-1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when rowsAffected === 0", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 0 });
      const result = await alerts.deleteAlert("user-1", "alert-nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("toggleAlert", () => {
    it("updates active and clears triggered fields", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 1 });
      const result = await alerts.toggleAlert("user-1", "alert-1", false);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE price_alerts SET active = ?, triggered = 0, triggered_at = '' WHERE id = ? AND user_id = ?",
        args: [0, "alert-1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("sets active to 1 when enabling", async () => {
      mockExecute.mockResolvedValue({ rowsAffected: 1 });
      await alerts.toggleAlert("user-1", "alert-1", true);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE price_alerts SET active = ?, triggered = 0, triggered_at = '' WHERE id = ? AND user_id = ?",
        args: [1, "alert-1", "user-1"],
      });
    });
  });

  describe("markAlertTriggered", () => {
    it("updates triggered and active", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await alerts.markAlertTriggered("alert-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE price_alerts SET triggered = 1, triggered_at = datetime('now'), active = 0 WHERE id = ?",
        args: ["alert-1"],
      });
    });
  });

  describe("updateLastNotified", () => {
    it("updates last_notified fields", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await alerts.updateLastNotified("alert-1", "AAPL");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE price_alerts SET last_notified_ticker = ?, last_notified_at = datetime('now') WHERE id = ?",
        args: ["AAPL", "alert-1"],
      });
    });
  });

  describe("listActiveAlertsForCron", () => {
    it("returns CronAlert with user fields", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            ...alertRow,
            user_id: "user-1",
            email: "u@example.com",
            email_verified: 1,
            plan: "pro",
            alert_channels: "email,push",
            telegram_chat_id: "",
            alert_device_enabled: 1,
            last_notified_ticker: "",
            last_notified_at: "",
          },
        ],
      });
      const result = await alerts.listActiveAlertsForCron();
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT pa.*")
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId: "user-1",
        email: "u@example.com",
        emailVerified: true,
        plan: "pro",
        telegramChatId: "",
        alertDeviceEnabled: true,
      });
      expect(result[0].alertChannels).toEqual(["email", "push"]);
    });
  });

  describe("getUserHoldingsForAlerts", () => {
    it("queries without portfolioId", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            ticker: "AAPL",
            name: "Apple Inc",
            purchase_price: 150,
            shares: 10,
            display_currency: "USD",
            exchange: "NASDAQ",
          },
        ],
      });
      const result = await alerts.getUserHoldingsForAlerts("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT ticker, name, purchase_price, shares, display_currency, exchange FROM holdings WHERE user_id = ?",
        args: ["user-1"],
      });
      expect(result).toEqual([
        {
          ticker: "AAPL",
          name: "Apple Inc",
          purchasePrice: 150,
          shares: 10,
          displayCurrency: "USD",
          exchange: "NASDAQ",
        },
      ]);
    });

    it("queries with portfolioId", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await alerts.getUserHoldingsForAlerts("user-1", "portfolio-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT ticker, name, purchase_price, shares, display_currency, exchange FROM holdings WHERE user_id = ? AND portfolio_id = ?",
        args: ["user-1", "portfolio-1"],
      });
    });
  });
});
