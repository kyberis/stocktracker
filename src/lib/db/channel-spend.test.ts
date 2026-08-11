import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import {
  createSpendCap,
  addSpendEntry,
  getSpendSummaryByChannel,
  getChannelPerformance,
  createDecisionMemo,
} from "./channel-spend";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSpendCap", () => {
  it("inserts a cap and returns the mapped row", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // INSERT
      .mockResolvedValueOnce({
        rows: [{
          id: "cap-1",
          channel: "meta",
          cap_amount_eur: 500,
          period_start: "2026-08-01",
          period_end: "2026-09-15",
          created_at: "2026-08-01T00:00:00.000Z",
        }],
      });

    const cap = await createSpendCap({
      channel: "meta",
      capAmountEur: 500,
      periodStart: "2026-08-01",
      periodEnd: "2026-09-15",
    });

    expect(cap.channel).toBe("meta");
    expect(cap.capAmountEur).toBe(500);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });
});

describe("addSpendEntry", () => {
  it("inserts a spend entry and returns the mapped row", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({
        rows: [{
          id: "entry-1",
          channel: "google",
          amount_eur: 42.5,
          spent_on: "2026-08-10",
          note: "day 1",
          created_at: "2026-08-10T00:00:00.000Z",
        }],
      });

    const entry = await addSpendEntry({ channel: "google", amountEur: 42.5, spentOn: "2026-08-10", note: "day 1" });

    expect(entry.amountEur).toBe(42.5);
    expect(entry.note).toBe("day 1");
  });
});

describe("getSpendSummaryByChannel", () => {
  it("computes utilization percentage against the active cap for the channel", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ channel: "meta", total: 400 }] }) // entries totals
      .mockResolvedValueOnce({
        rows: [{
          id: "cap-1",
          channel: "meta",
          cap_amount_eur: 500,
          period_start: "2026-08-01",
          period_end: "2026-09-15",
          created_at: "2026-08-01T00:00:00.000Z",
        }],
      }); // active caps

    const summary = await getSpendSummaryByChannel();

    expect(summary).toHaveLength(1);
    expect(summary[0].totalSpentEur).toBe(400);
    expect(summary[0].utilizationPct).toBe(80);
  });

  it("returns null utilization when a channel has spend but no active cap", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ channel: "linkedin", total: 120 }] })
      .mockResolvedValueOnce({ rows: [] });

    const summary = await getSpendSummaryByChannel();

    expect(summary[0].activeCap).toBeNull();
    expect(summary[0].utilizationPct).toBeNull();
  });
});

describe("getChannelPerformance", () => {
  it("returns null CAC when there are no paid conversions yet (commerce off), with spend/signup as the interim proxy", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ channel: "meta", signups: 10, paywall_shown: 3, paid_conversions: 0 }],
      }) // signups + paywall + paid, grouped by channel
      .mockResolvedValueOnce({ rows: [{ channel: "meta", total: 200 }] }) // spend by channel
      .mockResolvedValueOnce({ rows: [] }) // 7d retention
      .mockResolvedValueOnce({ rows: [] }) // 14d retention
      .mockResolvedValueOnce({ rows: [] }) // 7d cohort size
      .mockResolvedValueOnce({ rows: [] }); // 14d cohort size

    const [row] = await getChannelPerformance(45);

    expect(row.channel).toBe("meta");
    expect(row.paidConversions).toBe(0);
    expect(row.cacEur).toBeNull();
    expect(row.spendPerSignupEur).toBe(20);
    expect(row.retention7dPct).toBeNull();
    expect(row.retention14dPct).toBeNull();
  });

  it("computes CAC once paid conversions exist", async () => {
    mockExecute
      .mockResolvedValueOnce({
        rows: [{ channel: "google", signups: 20, paywall_shown: 8, paid_conversions: 4 }],
      })
      .mockResolvedValueOnce({ rows: [{ channel: "google", total: 400 }] })
      .mockResolvedValueOnce({ rows: [{ channel: "google", retained: 6 }] })
      .mockResolvedValueOnce({ rows: [{ channel: "google", retained: 5 }] })
      .mockResolvedValueOnce({ rows: [{ channel: "google", cnt: 12 }] })
      .mockResolvedValueOnce({ rows: [{ channel: "google", cnt: 10 }] });

    const [row] = await getChannelPerformance(45);

    expect(row.cacEur).toBe(100);
    expect(row.retention7dPct).toBe(50);
    expect(row.retention14dPct).toBe(50);
  });
});

describe("createDecisionMemo", () => {
  it("persists a decision memo and returns the mapped row", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [], rowsAffected: 1 })
      .mockResolvedValueOnce({
        rows: [{
          id: "memo-1",
          period_start: "2026-07-01",
          period_end: "2026-08-15",
          decision: "iterate",
          notes: "CAC too high on meta, retention fine on google",
          next_cycle_kpi_targets: "",
          budget_reallocation: "",
          created_by: "admin-user-1",
          created_at: "2026-08-15T00:00:00.000Z",
        }],
      });

    const memo = await createDecisionMemo({
      periodStart: "2026-07-01",
      periodEnd: "2026-08-15",
      decision: "iterate",
      notes: "CAC too high on meta, retention fine on google",
      createdBy: "admin-user-1",
    });

    expect(memo.decision).toBe("iterate");
    expect(memo.createdBy).toBe("admin-user-1");
  });
});
