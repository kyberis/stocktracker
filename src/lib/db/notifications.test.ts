import { describe, it, expect, vi, beforeEach } from "vitest";
import * as notifications from "./notifications";

const { mockExecute, mockBatch, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockBatch = vi.fn();
  return {
    mockExecute,
    mockBatch,
    mockClient: { execute: mockExecute, batch: mockBatch },
  };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("notif-uuid-123"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const notificationInput = {
  type: "admin" as const,
  title: "Test Title",
  message: "Test message",
};

const notificationRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "n1",
  type: "admin",
  title: "Test",
  title_es: "",
  message: "Message",
  message_es: "",
  link: "",
  link_label: "",
  link_label_es: "",
  read: 0,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("notifications", () => {
  describe("createNotification", () => {
    it("inserts and returns AppNotification", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ deleted_at: "" }] })
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

      const result = await notifications.createNotification("user-1", notificationInput);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT deleted_at FROM users WHERE id = ?",
        args: ["user-1"],
      });
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("INSERT INTO notifications"),
        args: expect.arrayContaining(["user-1", "admin", "Test Title", "Test message"]),
      });
      expect(result).toMatchObject({
        id: "notif-uuid-123",
        type: "admin",
        title: "Test Title",
        message: "Test message",
        read: false,
      });
      expect(result?.createdAt).toBeDefined();
    });

    it("returns null for deleted users without inserting", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ deleted_at: "2026-01-01T00:00:00Z" }] });
      const result = await notifications.createNotification("user-1", notificationInput);
      expect(result).toBeNull();
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("includes optional titleEs, messageEs, link, linkLabel, linkLabelEs", async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [{ deleted_at: "" }] })
        .mockResolvedValueOnce({ rows: [] });
      const input = {
        ...notificationInput,
        titleEs: "Título",
        messageEs: "Mensaje",
        link: "/settings",
        linkLabel: "View",
        linkLabelEs: "Ver",
      };
      const result = await notifications.createNotification("user-1", input);
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.any(String),
        args: expect.arrayContaining(["Título", "Mensaje", "/settings", "View", "Ver"]),
      });
      expect(result?.titleEs).toBe("Título");
      expect(result?.link).toBe("/settings");
    });
  });

  describe("broadcastNotification", () => {
    it("inserts for each user when targetPlan not set", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: "u1" }, { id: "u2" }],
      });
      mockBatch.mockResolvedValueOnce([{ rowsAffected: 1 }, { rowsAffected: 1 }]);

      const count = await notifications.broadcastNotification(notificationInput);

      expect(mockExecute).toHaveBeenCalledWith("SELECT id FROM users WHERE deleted_at = ''");
      expect(mockBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sql: expect.stringContaining("INSERT INTO notifications"),
            args: expect.any(Array),
          }),
        ]),
        "write"
      );
      expect(count).toBe(2);
    });

    it("filters by targetPlan when provided", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{ id: "pro-user-1" }],
      });
      mockBatch.mockResolvedValueOnce([{ rowsAffected: 1 }]);

      const count = await notifications.broadcastNotification({
        ...notificationInput,
        targetPlan: "pro",
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT id FROM users WHERE plan = ? AND deleted_at = ''",
        args: ["pro"],
      });
      expect(count).toBe(1);
    });

    it("returns 0 when no users", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const count = await notifications.broadcastNotification(notificationInput);

      expect(count).toBe(0);
      expect(mockBatch).not.toHaveBeenCalled();
    });
  });

  describe("listNotifications", () => {
    it("returns notifications with default opts", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          notificationRow({ id: "n1", title: "First" }),
          notificationRow({ id: "n2", title: "Second", read: 1 }),
        ],
      });

      const result = await notifications.listNotifications("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("WHERE user_id = ?"),
        args: ["user-1", 50],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: "n1", title: "First", read: false });
      expect(result[1]).toMatchObject({ id: "n2", read: true });
    });

    it("filters unread when unreadOnly true", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [notificationRow({ id: "n1", read: 0 })],
      });

      const result = await notifications.listNotifications("user-1", {
        unreadOnly: true,
        limit: 20,
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("AND read = 0"),
        args: ["user-1", 20],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("countUnreadNotifications", () => {
    it("returns count of unread", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ cnt: 5 }] });

      const result = await notifications.countUnreadNotifications("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read = 0",
        args: ["user-1"],
      });
      expect(result).toBe(5);
    });

    it("returns 0 when no unread", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
      const result = await notifications.countUnreadNotifications("user-1");
      expect(result).toBe(0);
    });
  });

  describe("markNotificationsRead", () => {
    it("marks specific ids when ids provided", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 2 });

      const result = await notifications.markNotificationsRead("user-1", ["n1", "n2"]);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("id IN (?,?)"),
        args: ["user-1", "n1", "n2"],
      });
      expect(result).toBe(2);
    });

    it("marks all unread when ids omitted", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 3 });

      const result = await notifications.markNotificationsRead("user-1");

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0",
        args: ["user-1"],
      });
      expect(result).toBe(3);
    });
  });

  describe("purgeOldNotifications", () => {
    it("deletes notifications older than daysOld", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 42 });

      const result = await notifications.purgeOldNotifications(90);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: "DELETE FROM notifications WHERE created_at < datetime('now', ?)",
        args: ["-90 days"],
      });
      expect(result).toBe(42);
    });

    it("uses default 90 days when not provided", async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
      await notifications.purgeOldNotifications();
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.any(String),
        args: ["-90 days"],
      });
    });
  });

  describe("listBroadcastHistory", () => {
    it("returns distinct admin notifications", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          notificationRow({ id: "min-id-1", title: "Broadcast 1" }),
          notificationRow({ id: "min-id-2", title: "Broadcast 2" }),
        ],
      });

      const result = await notifications.listBroadcastHistory(10);

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining("DISTINCT"),
        args: [10],
      });
      expect(result).toHaveLength(2);
    });
  });
});
