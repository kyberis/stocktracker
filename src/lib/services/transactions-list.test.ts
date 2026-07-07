import { describe, it, expect, vi, beforeEach } from "vitest";

import { listTransactionsForUser } from "@/lib/services/transactions-list";

vi.mock("@/lib/db", () => ({
  listTransactions: vi.fn(),
}));

describe("listTransactionsForUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("filters by transaction type", async () => {
    const db = await import("@/lib/db");
    vi.mocked(db.listTransactions).mockResolvedValue([
      { id: "1", type: "dividend", date: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", type: "buy", date: "2026-01-02", createdAt: "2026-01-02T00:00:00Z" },
    ] as never);

    const result = await listTransactionsForUser("u1", { type: "dividend" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe("dividend");
    }
  });

  it("rejects missing userId", async () => {
    const result = await listTransactionsForUser("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_input");
  });
});
