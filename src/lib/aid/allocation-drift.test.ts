import { describe, expect, it } from "vitest";
import { computeTypeAllocationDrifts } from "./allocation-drift";

describe("computeTypeAllocationDrifts", () => {
  it("returns drift rows sorted by absolute drift", () => {
    const allocation = [
      { key: "etf", label: "ETFs", valueEUR: 4000, percent: 40, color: "#10b981" },
      { key: "stock", label: "Stocks", valueEUR: 6000, percent: 60, color: "#6366f1" },
    ];
    const targets = [
      { id: "1", category: "type", label: "ETFs", targetPercent: 50 },
      { id: "2", category: "type", label: "Stocks", targetPercent: 50 },
    ];

    const drifts = computeTypeAllocationDrifts(allocation, targets);
    expect(drifts[0].label).toBe("ETFs");
    expect(drifts[0].driftPercent).toBe(-10);
  });
});
