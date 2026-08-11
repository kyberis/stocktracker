import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("./client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import { claimFirstSyncNotification } from "./snaptrade-connections";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("claimFirstSyncNotification", () => {
  it("returns true when it wins the claim (row was updated)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [], rowsAffected: 1 });

    const claimed = await claimFirstSyncNotification("user-1");

    expect(claimed).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("first_sync_notified_at = ''"),
        args: ["user-1"],
      }),
    );
  });

  it("returns false when already claimed (no row matched)", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [], rowsAffected: 0 });

    const claimed = await claimFirstSyncNotification("user-1");

    expect(claimed).toBe(false);
  });

  it("is idempotent across repeated calls — only the first wins", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 0 });

    const first = await claimFirstSyncNotification("user-1");
    const second = await claimFirstSyncNotification("user-1");

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
