import { describe, expect, it } from "vitest";
import {
  fmpEarningsToFundamentalData,
  mergeEarningsData,
} from "./earnings-merge";
import type { FmpEarningsEvent } from "@/lib/api-providers/fmp";
import type { EarningsReport, FundamentalData } from "@/lib/api-providers/types";

const fmpRows: FmpEarningsEvent[] = [
  {
    date: "2026-08-04",
    symbol: "MCD",
    eps: null,
    epsEstimated: 3.35,
    time: "--",
    revenue: null,
    revenueEstimated: 6_800_000_000,
    fiscalDateEnding: "",
    updatedFromDate: "",
  },
  {
    date: "2026-03-31",
    symbol: "MCD",
    eps: 2.82,
    epsEstimated: 2.7,
    time: "--",
    revenue: 6_520_000_000,
    revenueEstimated: 6_400_000_000,
    fiscalDateEnding: "",
    updatedFromDate: "",
  },
];

describe("fmpEarningsToFundamentalData", () => {
  it("maps reported and estimated EPS", () => {
    const data = fmpEarningsToFundamentalData(fmpRows);
    expect(data?.quarterly[1]?.reportedEPS).toBe(2.82);
    expect(data?.quarterly[0]?.reportedEPS).toBeNull();
    expect(data?.quarterly[0]?.estimatedEPS).toBe(3.35);
  });
});

describe("mergeEarningsData", () => {
  it("fills missing Yahoo reported EPS from FMP", () => {
    const yahoo: FundamentalData<EarningsReport> = {
      annual: [],
      quarterly: [
        {
          fiscalDateEnding: "2026-03-31",
          reportedEPS: null,
          estimatedEPS: 2.7,
          surprise: null,
          surprisePercentage: null,
        },
      ],
    };
    const fmp = fmpEarningsToFundamentalData(fmpRows);
    const merged = mergeEarningsData(yahoo, fmp);
    expect(merged?.quarterly[0]?.reportedEPS).toBe(2.82);
    expect(merged?.quarterly[0]?.estimatedEPS).toBe(2.7);
  });

  it("keeps Yahoo reported EPS when present", () => {
    const yahoo: FundamentalData<EarningsReport> = {
      annual: [],
      quarterly: [
        {
          fiscalDateEnding: "2026-03-31",
          reportedEPS: 2.9,
          estimatedEPS: 2.7,
          surprise: null,
          surprisePercentage: null,
        },
      ],
    };
    const fmp = fmpEarningsToFundamentalData(fmpRows);
    const merged = mergeEarningsData(yahoo, fmp);
    expect(merged?.quarterly[0]?.reportedEPS).toBe(2.9);
  });

  it("uses FMP when Yahoo earnings are missing", () => {
    const fmp = fmpEarningsToFundamentalData(fmpRows);
    expect(mergeEarningsData(null, fmp)?.quarterly[1]?.reportedEPS).toBe(2.82);
  });
});
