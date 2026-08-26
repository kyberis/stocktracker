import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("./client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import {
  claimFirstSyncNotification,
  clearSnapTradeMarkReconciliation,
  getSnapTradeMarkReconciliation,
  saveSnapTradeMarkReconciliation,
} from "./snaptrade-connections";

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

describe("SnapTrade mark reconciliation persistence", () => {
  it("reads the stored snapshot", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          mark_reconciliation_json: '{"gaps":[]}',
          mark_reconciliation_at: "2026-08-26T00:00:00.000Z",
          mark_gap_notified_fingerprint: "BITC",
          mark_gap_notified_at: "2026-08-26T00:00:00.000Z",
        },
      ],
    });
    const row = await getSnapTradeMarkReconciliation("user-1");
    expect(row?.lastFingerprint).toBe("BITC");
    expect(row?.json).toContain("gaps");
  });

  it("persists fingerprint when notifying", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [], rowsAffected: 1 });
    await saveSnapTradeMarkReconciliation("user-1", {
      json: "{}",
      fingerprint: "BITC",
      notify: true,
    });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("mark_gap_notified_fingerprint"),
        args: ["{}", "BITC", "user-1"],
      }),
    );
  });

  it("clears snapshot and notify fingerprint", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [], rowsAffected: 1 });
    await clearSnapTradeMarkReconciliation("user-1");
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("mark_reconciliation_json = ''"),
        args: ["user-1"],
      }),
    );
  });
});
