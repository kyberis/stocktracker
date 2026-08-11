import { describe, expect, it } from "vitest";
import type { CashEntry } from "@/lib/types";
import { cashAmountEUR, enrichCashEntries, enrichFixedReturnCashEntry } from "./fixed-return-cash";
import { todayLocal } from "./utils";

function fr(partial: Partial<CashEntry> = {}): CashEntry {
  return {
    id: "1",
    name: "Civislend",
    amountEUR: 0,
    type: "fixed_return",
    displayAmount: 1500,
    displayCurrency: "EUR",
    startDate: todayLocal(),
    termMonths: 24,
    totalReturnPct: 25,
    ...partial,
  };
}

describe("enrichFixedReturnCashEntry / cashAmountEUR", () => {
  it("accrues principal on start date even when stored amountEUR is 0", () => {
    const entry = fr({ amountEUR: 0 });
    expect(enrichFixedReturnCashEntry(entry).amountEUR).toBe(1500);
    expect(cashAmountEUR(entry)).toBe(1500);
  });

  it("leaves plain cash unchanged", () => {
    const cash: CashEntry = { id: "c", name: "Cash", amountEUR: 100, type: "cash" };
    expect(enrichFixedReturnCashEntry(cash)).toEqual(cash);
    expect(cashAmountEUR(cash)).toBe(100);
  });

  it("enrichCashEntries maps the list", () => {
    const [enriched] = enrichCashEntries([fr({ amountEUR: 0 })]);
    expect(enriched.amountEUR).toBe(1500);
  });
});
