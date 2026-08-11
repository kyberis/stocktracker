import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute, mockClient: { execute: mockExecute } };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

import { getAnalyticsSummary } from "./analytics";

function sqlOf(call: unknown): string {
  const arg = call as string | { sql: string };
  return typeof arg === "string" ? arg : arg.sql;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockExecute.mockImplementation((arg) => {
    const sql = sqlOf(arg);

    if (sql.includes("FROM analytics_events") && sql.includes("event IN (") && sql.includes("'paywall_shown'")) {
      return Promise.resolve({
        rows: [
          { event: "signup", cnt: 100 },
          { event: "paywall_shown", cnt: 30 },
          { event: "billing_checkout_completed", cnt: 5 },
        ],
      });
    }

    if (sql.includes("AS source") && sql.includes("paywall_shown")) {
      return Promise.resolve({
        rows: [{ source: "meta", signups: 10, paywall_shown: 4, paid_conversions: 1 }],
      });
    }

    if (sql.includes("AS medium") && sql.includes("paywall_shown")) {
      return Promise.resolve({
        rows: [{ medium: "cpc", signups: 10, paywall_shown: 4, paid_conversions: 1 }],
      });
    }

    return Promise.resolve({ rows: [] });
  });
});

describe("getAnalyticsSummary — paywall_shown funnel/attribution", () => {
  it("includes a Paywall Shown stage sourced from the paywall_shown event count", async () => {
    const summary = await getAnalyticsSummary(30);

    const stage = summary.funnel.find((s) => s.stage === "Paywall Shown");
    expect(stage).toBeDefined();
    expect(stage!.count).toBe(30);
  });

  it("carries paywallShown through attributionBySource and attributionByMedium", async () => {
    const summary = await getAnalyticsSummary(30);

    expect(summary.attributionBySource[0].paywallShown).toBe(4);
    expect(summary.attributionByMedium[0].paywallShown).toBe(4);
  });
});
