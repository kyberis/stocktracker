import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = vi.hoisted(() => ({
  execute: vi.fn().mockResolvedValue({ rows: [], columns: [] }),
  batch: vi.fn().mockResolvedValue([]),
  executeMultiple: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

vi.mock("@/lib/utils", () => ({
  generateId: vi.fn(() => "mock-conn-id"),
}));

import {
  requestConnection,
  acceptConnection,
  rejectConnection,
  withdrawConnection,
  removeConnection,
  blockUser,
  unblockUser,
  isConnected,
  listConnections,
  countConnections,
  searchPeople,
} from "./social-connections";

describe("social-connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.execute.mockResolvedValue({ rows: [], columns: [] });
  });

  describe("requestConnection", () => {
    it("creates a pending connection when none exists", async () => {
      // getConnectionBetween returns no rows, then INSERT succeeds
      mockClient.execute
        .mockResolvedValueOnce({ rows: [], columns: [] })
        .mockResolvedValueOnce({ rows: [], columns: [] });

      const conn = await requestConnection("user-a", "user-b");

      expect(conn.id).toBe("mock-conn-id");
      expect(conn.requesterId).toBe("user-a");
      expect(conn.receiverId).toBe("user-b");
      expect(conn.status).toBe("pending");

      const insertCall = mockClient.execute.mock.calls[1][0];
      expect(insertCall.sql).toContain("INSERT INTO user_connections");
      expect(insertCall.args).toContain("user-a");
      expect(insertCall.args).toContain("user-b");
      expect(insertCall.args).toContain("mock-conn-id");
    });

    it("throws when connection is already accepted", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-a",
            receiver_id: "user-b",
            status: "accepted",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      await expect(requestConnection("user-a", "user-b")).rejects.toThrow(
        "Already connected"
      );
    });

    it("throws when a pending request already exists", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-a",
            receiver_id: "user-b",
            status: "pending",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      await expect(requestConnection("user-a", "user-b")).rejects.toThrow(
        "Connection request already pending"
      );
    });

    it("throws when user is blocked", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-b",
            receiver_id: "user-a",
            status: "blocked",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      await expect(requestConnection("user-a", "user-b")).rejects.toThrow(
        "Cannot connect with this user"
      );
    });

    it("throws if rejected and within cooldown period", async () => {
      const recentDate = new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000
      ).toISOString();
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-a",
            receiver_id: "user-b",
            status: "rejected",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: recentDate,
          },
        ],
        columns: [],
      });

      await expect(requestConnection("user-a", "user-b")).rejects.toThrow(
        "Please wait before re-requesting"
      );
    });

    it("re-requests after cooldown period on rejected connection", async () => {
      const oldDate = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString();
      mockClient.execute
        .mockResolvedValueOnce({
          rows: [
            {
              id: "conn-1",
              requester_id: "user-a",
              receiver_id: "user-b",
              status: "rejected",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: oldDate,
            },
          ],
          columns: [],
        })
        .mockResolvedValueOnce({ rows: [], columns: [] });

      const conn = await requestConnection("user-a", "user-b");

      expect(conn.status).toBe("pending");
      expect(conn.id).toBe("conn-1");

      const updateCall = mockClient.execute.mock.calls[1][0];
      expect(updateCall.sql).toContain("UPDATE user_connections");
      expect(updateCall.sql).toContain("status = 'pending'");
    });
  });

  describe("acceptConnection", () => {
    it("returns true when pending connection is accepted", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await acceptConnection("conn-1", "user-b");

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("status = 'accepted'");
      expect(call.sql).toContain("receiver_id = ?");
      expect(call.sql).toContain("status = 'pending'");
      expect(call.args).toEqual(["conn-1", "user-b"]);
    });

    it("returns false when connection does not exist or user is not receiver", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await acceptConnection("conn-1", "wrong-user");
      expect(result).toBe(false);
    });
  });

  describe("rejectConnection", () => {
    it("returns true when pending connection is rejected", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await rejectConnection("conn-1", "user-b");

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("status = 'rejected'");
      expect(call.sql).toContain("receiver_id = ?");
      expect(call.sql).toContain("status = 'pending'");
    });

    it("returns false when connection is not pending", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await rejectConnection("conn-1", "user-b");
      expect(result).toBe(false);
    });
  });

  describe("withdrawConnection", () => {
    it("deletes pending request sent by the user", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await withdrawConnection("conn-1", "user-a");

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("DELETE FROM user_connections");
      expect(call.sql).toContain("requester_id = ?");
      expect(call.sql).toContain("status = 'pending'");
    });

    it("returns false when not the requester or not pending", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await withdrawConnection("conn-1", "user-b");
      expect(result).toBe(false);
    });
  });

  describe("removeConnection", () => {
    it("deletes an accepted connection", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await removeConnection("conn-1", "user-a");

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("DELETE FROM user_connections");
      expect(call.sql).toContain("status = 'accepted'");
      expect(call.sql).toContain("requester_id = ? OR receiver_id = ?");
    });

    it("returns false when connection is not accepted", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await removeConnection("conn-1", "user-a");
      expect(result).toBe(false);
    });
  });

  describe("blockUser", () => {
    it("updates existing connection to blocked status", async () => {
      mockClient.execute
        .mockResolvedValueOnce({
          rows: [
            {
              id: "conn-1",
              requester_id: "user-a",
              receiver_id: "user-b",
              status: "accepted",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
          columns: [],
        })
        .mockResolvedValueOnce({ rows: [], columns: [] });

      await blockUser("user-a", "user-b");

      const updateCall = mockClient.execute.mock.calls[1][0];
      expect(updateCall.sql).toContain("UPDATE user_connections");
      expect(updateCall.sql).toContain("status = 'blocked'");
      expect(updateCall.args).toContain("user-a");
      expect(updateCall.args).toContain("user-b");
    });

    it("creates a new blocked connection when none exists", async () => {
      mockClient.execute
        .mockResolvedValueOnce({ rows: [], columns: [] })
        .mockResolvedValueOnce({ rows: [], columns: [] });

      await blockUser("user-a", "user-b");

      const insertCall = mockClient.execute.mock.calls[1][0];
      expect(insertCall.sql).toContain("INSERT INTO user_connections");
      expect(insertCall.args).toContain("mock-conn-id");
      expect(insertCall.args).toContain("user-a");
      expect(insertCall.args).toContain("user-b");
    });
  });

  describe("unblockUser", () => {
    it("removes the blocked connection", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 1,
      });

      const result = await unblockUser("user-a", "user-b");

      expect(result).toBe(true);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("DELETE FROM user_connections");
      expect(call.sql).toContain("status = 'blocked'");
      expect(call.args).toEqual(["user-a", "user-b"]);
    });

    it("returns false when no blocked connection exists", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [],
        columns: [],
        rowsAffected: 0,
      });

      const result = await unblockUser("user-a", "user-b");
      expect(result).toBe(false);
    });
  });

  describe("isConnected", () => {
    it("returns true for accepted connection", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-a",
            receiver_id: "user-b",
            status: "accepted",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      const result = await isConnected("user-a", "user-b");
      expect(result).toBe(true);
    });

    it("returns false for pending connection", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-a",
            receiver_id: "user-b",
            status: "pending",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      const result = await isConnected("user-a", "user-b");
      expect(result).toBe(false);
    });

    it("returns false when no connection exists", async () => {
      const result = await isConnected("user-a", "user-b");
      expect(result).toBe(false);
    });

    it("returns false for blocked connection", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [
          {
            id: "conn-1",
            requester_id: "user-a",
            receiver_id: "user-b",
            status: "blocked",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        columns: [],
      });

      const result = await isConnected("user-a", "user-b");
      expect(result).toBe(false);
    });
  });

  describe("listConnections", () => {
    const makeConnectionRow = (overrides: Record<string, unknown> = {}) => ({
      id: "conn-1",
      status: "accepted",
      connected_at: "2025-06-15T12:00:00Z",
      other_id: "user-b",
      display_name: "Bob",
      avatar_url: "https://img.example.com/bob.jpg",
      profile_slug: "bob",
      headline: "Trader",
      experience_level: "intermediate",
      connection_count: 10,
      post_count: 5,
      ...overrides,
    });

    it("queries accepted connections", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [makeConnectionRow()],
        columns: [],
      });

      const result = await listConnections("user-a", "accepted");

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-b");
      expect(result[0].displayName).toBe("Bob");
      expect(result[0].status).toBe("accepted");
      expect(result[0].connectionCount).toBe(10);
      expect(result[0].postCount).toBe(5);

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("status = 'accepted'");
    });

    it("queries pending received connections", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [makeConnectionRow({ status: "pending", other_id: "user-c" })],
        columns: [],
      });

      const result = await listConnections("user-a", "pending_received");

      expect(result).toHaveLength(1);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("receiver_id = ?");
      expect(call.sql).toContain("status = 'pending'");
    });

    it("queries pending sent connections", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [makeConnectionRow({ status: "pending", other_id: "user-d" })],
        columns: [],
      });

      const result = await listConnections("user-a", "pending_sent");

      expect(result).toHaveLength(1);
      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("requester_id = ?");
      expect(call.sql).toContain("status = 'pending'");
    });

    it("applies search filter", async () => {
      await listConnections("user-a", "accepted", { search: "alice" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("display_name LIKE ?");
      expect(call.sql).toContain("profile_slug LIKE ?");
      expect(call.args).toContain("%alice%");
    });

    it("applies limit and offset", async () => {
      await listConnections("user-a", "accepted", { limit: 10, offset: 20 });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("LIMIT ? OFFSET ?");
      expect(call.args).toContain(10);
      expect(call.args).toContain(20);
    });

    it("caps limit at 50", async () => {
      await listConnections("user-a", "accepted", { limit: 100 });

      const call = mockClient.execute.mock.calls[0][0];
      const args = call.args!;
      const limitArg = args[args.length - 2];
      expect(limitArg).toBe(50);
    });
  });

  describe("countConnections", () => {
    it("returns counts for accepted, pending received, and pending sent", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [{ accepted: 15, pending_received: 3, pending_sent: 2 }],
        columns: [],
      });

      const counts = await countConnections("user-a");

      expect(counts.accepted).toBe(15);
      expect(counts.pendingReceived).toBe(3);
      expect(counts.pendingSent).toBe(2);
    });

    it("returns zeros when user has no connections", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [{ accepted: 0, pending_received: 0, pending_sent: 0 }],
        columns: [],
      });

      const counts = await countConnections("user-a");

      expect(counts.accepted).toBe(0);
      expect(counts.pendingReceived).toBe(0);
      expect(counts.pendingSent).toBe(0);
    });
  });

  describe("searchPeople", () => {
    const makePersonRow = (overrides: Record<string, unknown> = {}) => ({
      other_id: "user-x",
      display_name: "Xavier",
      avatar_url: "",
      profile_slug: "xavier",
      headline: "Quant trader",
      experience_level: "professional",
      connection_count: 20,
      post_count: 8,
      ...overrides,
    });

    it("searches by display_name, profile_slug, and headline", async () => {
      mockClient.execute.mockResolvedValueOnce({
        rows: [makePersonRow()],
        columns: [],
      });

      const results = await searchPeople("Xavier");

      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe("Xavier");
      expect(results[0].experienceLevel).toBe("professional");

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("display_name LIKE ?");
      expect(call.sql).toContain("profile_slug LIKE ?");
      expect(call.sql).toContain("headline LIKE ?");
      expect(call.args).toContain("%Xavier%");
    });

    it("filters by experience level", async () => {
      await searchPeople("", { experienceLevel: "beginner" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("experience_level = ?");
      expect(call.args).toContain("beginner");
    });

    it("excludes the viewer from results", async () => {
      await searchPeople("", { viewerId: "user-a" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("u.id != ?");
      expect(call.args).toContain("user-a");
    });

    it("excludes blocked users when viewerId is provided", async () => {
      await searchPeople("", { viewerId: "user-a" });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("status = 'blocked'");
    });

    it("only returns public profiles with a slug", async () => {
      await searchPeople("test");

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("profile_slug != ''");
      expect(call.sql).toContain("social_visibility = 'public'");
    });

    it("caps limit at 50", async () => {
      await searchPeople("test", { limit: 200 });

      const call = mockClient.execute.mock.calls[0][0];
      const args = call.args!;
      const limitArg = args[args.length - 2];
      expect(limitArg).toBe(50);
    });

    it("applies hasPosts HAVING clause", async () => {
      await searchPeople("", { hasPosts: true });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("HAVING");
      expect(call.sql).toContain("post_count > 0");
    });

    it("applies hasConnections HAVING clause", async () => {
      await searchPeople("", { hasConnections: true });

      const call = mockClient.execute.mock.calls[0][0];
      expect(call.sql).toContain("HAVING");
      expect(call.sql).toContain("connection_count > 0");
    });
  });
});
