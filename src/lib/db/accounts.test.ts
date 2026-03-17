import { describe, it, expect, vi, beforeEach } from "vitest";
import * as accounts from "./accounts";

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
  randomUUID: vi.fn().mockReturnValue("test-uuid-123"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("accounts", () => {
  describe("listAccounts", () => {
    it("maps rows to Account array", async () => {
      mockExecute.mockResolvedValue({
        rows: [
          { id: "a1", name: "Broker A", broker: "broker-a", currency: "EUR", created_at: "2024-01-01T00:00:00Z" },
          { id: "a2", name: "Broker B", broker: "broker-b", currency: "USD", created_at: "2024-01-02T00:00:00Z" },
        ],
      });
      const result = await accounts.listAccounts("user-1");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC",
        args: ["user-1"],
      });
      expect(result).toEqual([
        { id: "a1", name: "Broker A", broker: "broker-a", currency: "EUR", createdAt: "2024-01-01T00:00:00Z" },
        { id: "a2", name: "Broker B", broker: "broker-b", currency: "USD", createdAt: "2024-01-02T00:00:00Z" },
      ]);
    });
  });

  describe("addAccount", () => {
    it("inserts and returns Account with id", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const acct = { name: "My Broker", broker: "broker-x", currency: "GBP" };
      const result = await accounts.addAccount("user-1", acct);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "INSERT INTO accounts (id, user_id, name, broker, currency) VALUES (?, ?, ?, ?, ?)",
        args: ["test-uuid-123", "user-1", "My Broker", "broker-x", "GBP"],
      });
      expect(result).toMatchObject({
        id: "test-uuid-123",
        name: "My Broker",
        broker: "broker-x",
        currency: "GBP",
      });
      expect(result.createdAt).toBeDefined();
    });

    it("uses default broker and currency when omitted", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const acct = { name: "Manual", broker: "", currency: "EUR" };
      const result = await accounts.addAccount("user-1", acct);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "INSERT INTO accounts (id, user_id, name, broker, currency) VALUES (?, ?, ?, ?, ?)",
        args: ["test-uuid-123", "user-1", "Manual", "", "EUR"],
      });
      expect(result.broker).toBe("");
      expect(result.currency).toBe("EUR");
    });
  });

  describe("findAccountByBroker", () => {
    it("returns Account when found", async () => {
      mockExecute.mockResolvedValue({
        rows: [{ id: "a1", name: "Broker A", broker: "broker-a", currency: "EUR", created_at: "2024-01-01" }],
      });
      const result = await accounts.findAccountByBroker("user-1", "broker-a");
      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT * FROM accounts WHERE user_id = ? AND broker = ? LIMIT 1",
        args: ["user-1", "broker-a"],
      });
      expect(result).toEqual({
        id: "a1",
        name: "Broker A",
        broker: "broker-a",
        currency: "EUR",
        createdAt: "2024-01-01",
      });
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await accounts.findAccountByBroker("user-1", "broker-x");
      expect(result).toBeNull();
    });
  });

  describe("findOrCreateBrokerAccount", () => {
    it("returns existing account when found", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: "existing", name: "Existing", broker: "broker-x", currency: "EUR", created_at: "2024-01-01" }],
      });
      const result = await accounts.findOrCreateBrokerAccount("user-1", "broker-x", "Broker X");
      expect(result).toEqual({
        id: "existing",
        name: "Existing",
        broker: "broker-x",
        currency: "EUR",
        createdAt: "2024-01-01",
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("creates new account when not found", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await accounts.findOrCreateBrokerAccount("user-1", "broker-new", "New Broker");
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "SELECT * FROM accounts WHERE user_id = ? AND broker = ? LIMIT 1",
        args: ["user-1", "broker-new"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: "INSERT INTO accounts (id, user_id, name, broker, currency) VALUES (?, ?, ?, ?, ?)",
        args: ["test-uuid-123", "user-1", "New Broker", "broker-new", "EUR"],
      });
      expect(result).toMatchObject({
        id: "test-uuid-123",
        name: "New Broker",
        broker: "broker-new",
        currency: "EUR",
      });
    });
  });

  describe("deleteAccount", () => {
    it("returns true when rowsAffected > 0", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 3 })
        .mockResolvedValueOnce({ rowsAffected: 1 });
      const result = await accounts.deleteAccount("user-1", "acct-1");
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        sql: "UPDATE holdings SET account_id = '' WHERE user_id = ? AND account_id = ?",
        args: ["user-1", "acct-1"],
      });
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        sql: "DELETE FROM accounts WHERE id = ? AND user_id = ?",
        args: ["acct-1", "user-1"],
      });
      expect(result).toBe(true);
    });

    it("returns false when rowsAffected === 0", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({ rowsAffected: 0 });
      const result = await accounts.deleteAccount("user-1", "acct-nonexistent");
      expect(result).toBe(false);
    });

    it("returns false when DELETE rowsAffected is undefined", async () => {
      mockExecute
        .mockResolvedValueOnce({ rowsAffected: 0 })
        .mockResolvedValueOnce({});
      const result = await accounts.deleteAccount("user-1", "acct-1");
      expect(result).toBe(false);
    });
  });
});
