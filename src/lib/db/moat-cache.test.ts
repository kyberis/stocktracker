import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryMoatCache } from "./moat-cache";

const { mockExecute, mockClient } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return {
    mockExecute,
    mockClient: { execute: mockExecute },
  };
});

vi.mock("@/lib/db/client", () => ({
  ensureInitialized: vi.fn().mockResolvedValue(mockClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockExecute.mockReset();
});

describe("queryMoatCache", () => {
  it("adds market cap bounds and requires non-null sc.market_cap", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ cnt: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    await queryMoatCache({
      marketCapMin: 1_000_000_000,
      marketCapMax: 5_000_000_000,
      page: 1,
      limit: 50,
    });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    const countCall = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(countCall.sql).toContain("sc.market_cap IS NOT NULL");
    expect(countCall.sql).toContain("sc.market_cap >=");
    expect(countCall.sql).toContain("sc.market_cap <=");
    expect(countCall.args).toContain(1_000_000_000);
    expect(countCall.args).toContain(5_000_000_000);

    const dataCall = mockExecute.mock.calls[1][0] as { sql: string };
    expect(dataCall.sql).toContain("sc.market_cap");
  });
});
