import { describe, expect, it } from "vitest";
import {
  mergeNextQuarterConsensus,
  pickNextQuarterFromEarningsRows,
} from "./next-quarter";

describe("pickNextQuarterFromEarningsRows", () => {
  it("picks the first unreported row with estimates (NOW-style)", () => {
    const result = pickNextQuarterFromEarningsRows([
      {
        reportDate: "2026-07-22",
        epsActual: null,
        epsEstimated: 0.86,
        revenueActual: null,
        revenueEstimated: 3_927_168_000,
      },
      {
        reportDate: "2026-04-22",
        epsActual: 0.97,
        epsEstimated: 0.97,
        revenueActual: 3_770_000_000,
        revenueEstimated: 3_740_657_000,
      },
    ]);
    expect(result).toEqual({
      nextReportDate: "2026-07-22",
      nextQuarterLabel: "2026-07-22",
      consensusEps: 0.86,
      consensusRevenue: 3_927_168_000,
      consensusEpsVarPct: null,
      consensusRevenueVarPct: null,
    });
  });

  it("returns null when every row is already reported", () => {
    expect(
      pickNextQuarterFromEarningsRows([
        {
          reportDate: "2026-04-22",
          epsActual: 0.97,
          epsEstimated: 0.97,
          revenueActual: 3_770_000_000,
          revenueEstimated: 3_740_657_000,
        },
      ]),
    ).toBeNull();
  });
});

describe("mergeNextQuarterConsensus", () => {
  it("fills gaps from fallback without inventing values", () => {
    const merged = mergeNextQuarterConsensus(
      {
        nextReportDate: "2026-07-22",
        nextQuarterLabel: "2026-07-22",
        consensusEps: 0.86,
        consensusRevenue: 3_927_168_000,
        consensusEpsVarPct: null,
        consensusRevenueVarPct: null,
      },
      {
        nextReportDate: "2026-07-22",
        nextQuarterLabel: "2026-06-30",
        consensusEps: 0.856,
        consensusRevenue: 3_927_399_450,
        consensusEpsVarPct: 4.69,
        consensusRevenueVarPct: 22.16,
      },
    );
    expect(merged?.consensusEps).toBe(0.86);
    expect(merged?.consensusRevenue).toBe(3_927_168_000);
    expect(merged?.consensusRevenueVarPct).toBe(22.16);
    expect(merged?.nextQuarterLabel).toBe("2026-07-22");
  });
});
