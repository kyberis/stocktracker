import { describe, expect, it } from "vitest";
import { mapYahooEtfProfileExtras } from "./etf-profile-map";

describe("mapYahooEtfProfileExtras", () => {
  it("reads TER and AUM from fundProfile fees and defaultKeyStatistics", () => {
    expect(
      mapYahooEtfProfileExtras(
        {
          feesExpensesInvestment: {
            annualReportExpenseRatio: 0.0007,
            totalNetAssets: 1e9,
          },
        },
        { fundInceptionDate: new Date("2015-06-01T00:00:00.000Z"), totalAssets: 2e9 },
      ),
    ).toEqual({
      expenseRatio: 0.0007,
      inceptionDate: "2015-06-01",
      totalAssets: 2e9,
    });
  });

  it("returns nulls when Yahoo omitted the fields", () => {
    expect(mapYahooEtfProfileExtras({}, {})).toEqual({
      expenseRatio: null,
      inceptionDate: null,
      totalAssets: null,
    });
  });
});
