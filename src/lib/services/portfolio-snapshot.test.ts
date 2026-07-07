import { describe, it, expect, vi, beforeEach } from "vitest";

import { getPortfolioSummaryForUser } from "@/lib/services/portfolio-snapshot";

vi.mock("@/lib/db", () => ({
  findUserById: vi.fn(),
  getDefaultPortfolio: vi.fn(),
}));

vi.mock("@/lib/ai/warren/build-snapshot", () => ({
  buildPortfolioSnapshot: vi.fn(),
}));

describe("getPortfolioSummaryForUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns snapshot for valid user", async () => {
    const db = await import("@/lib/db");
    const snap = await import("@/lib/ai/warren/build-snapshot");
    vi.mocked(db.findUserById).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(db.getDefaultPortfolio).mockResolvedValue({ currency: "EUR" } as never);
    vi.mocked(snap.buildPortfolioSnapshot).mockResolvedValue({
      baseCurrency: "EUR",
      totals: { value: 1000, cost: 900, gainLoss: 100, gainLossPct: 11, dayChange: 5 },
      holdingsCount: 2,
      topHoldings: [],
      allocation: [],
      cashSummary: {},
    });

    const result = await getPortfolioSummaryForUser("u1", { includeDividends: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.totals.value).toBe(1000);
    expect(snap.buildPortfolioSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ enrichForPortfolioAi: true }),
    );
  });

  it("returns user_not_found when missing", async () => {
    const db = await import("@/lib/db");
    vi.mocked(db.findUserById).mockResolvedValue(null);
    const result = await getPortfolioSummaryForUser("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("user_not_found");
  });
});
