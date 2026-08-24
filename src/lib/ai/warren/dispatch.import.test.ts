import { describe, expect, it } from "vitest";
import { importTransactionsDataSchema } from "./dispatch";

describe("importTransactionsDataSchema", () => {
  it("accepts a broker csv payload", () => {
    const parsed = importTransactionsDataSchema.safeParse({
      source: "broker_csv",
      detectedBroker: "degiro",
      transactions: [
        {
          date: "2024-01-15",
          type: "buy",
          ticker: "AAPL",
          name: "Apple",
          shares: 2,
          pricePerShare: 150,
          totalAmount: 300,
          fees: 1,
          currency: "USD",
        },
      ],
      summary: { total: 1, buys: 1, sells: 0, dividends: 0, fees: 0 },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty transaction list", () => {
    const parsed = importTransactionsDataSchema.safeParse({
      source: "ai_import",
      transactions: [],
      summary: { total: 0 },
    });
    expect(parsed.success).toBe(false);
  });
});
