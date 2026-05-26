import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn();

vi.mock("./client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue({
    execute: mockExecute,
  }),
}));

describe("prodops query readers", () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it("returns the latest created user", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: "user_1",
          username: "newuser",
          email: "new@example.com",
          display_name: "New User",
          auth_provider: "google",
          plan: "free",
          created_at: "2026-05-26T01:00:00.000Z",
        },
      ],
    });

    const { getLatestCreatedUser } = await import("./users");
    await expect(getLatestCreatedUser()).resolves.toEqual({
      id: "user_1",
      username: "newuser",
      email: "new@example.com",
      displayName: "New User",
      authProvider: "google",
      plan: "free",
      createdAt: "2026-05-26T01:00:00.000Z",
    });
  });

  it("returns the latest feedback entries", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: "fb_1",
          user_id: "user_1",
          username: "marcos",
          subject: "Dark mode bug",
          type: "bug",
          status: "open",
          created_at: "2026-05-26T01:00:00.000Z",
        },
      ],
    });

    const { getLatestFeedbackEntries } = await import("./feedback");
    await expect(getLatestFeedbackEntries(5)).resolves.toEqual([
      {
        id: "fb_1",
        userId: "user_1",
        username: "marcos",
        subject: "Dark mode bug",
        type: "bug",
        status: "open",
        createdAt: "2026-05-26T01:00:00.000Z",
      },
    ]);
    expect(mockExecute).toHaveBeenCalledWith({
      sql: expect.stringContaining("FROM feedback f"),
      args: [5],
    });
  });

  it("returns the latest analytics interaction with summarized metadata", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          user_id: "user_2",
          username: "alice",
          event: "portfolio_import",
          metadata: JSON.stringify({
            broker: "degiro",
            rows: 42,
            success: true,
            ignored: { nested: "value" },
          }),
          created_at: "2026-05-26T01:15:00.000Z",
        },
      ],
    });

    const { getLatestAnalyticsInteraction } = await import("./analytics");
    await expect(getLatestAnalyticsInteraction()).resolves.toEqual({
      userId: "user_2",
      username: "alice",
      event: "portfolio_import",
      metadataSummary: "broker=degiro, rows=42, success=true",
      createdAt: "2026-05-26T01:15:00.000Z",
    });
  });

  it("returns null when there is no analytics interaction", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const { getLatestAnalyticsInteraction } = await import("./analytics");
    await expect(getLatestAnalyticsInteraction()).resolves.toBeNull();
  });
});
