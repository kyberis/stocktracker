import { describe, it, expect } from "vitest";

import { investmentCashEntries } from "@/lib/portfolio-summary-cash";
import type { CashEntry } from "@/lib/types";

function cash(partial: Partial<CashEntry> & Pick<CashEntry, "id" | "amountEUR">): CashEntry {
  return {
    name: "Cash",
    ...partial,
  };
}

describe("investmentCashEntries", () => {
  it("keeps cash, fixed_return, and legacy rows without type", () => {
    const rows = [
      cash({ id: "1", amountEUR: 100 }),
      cash({ id: "2", amountEUR: 50, type: "cash" }),
      cash({ id: "3", amountEUR: 999, type: "savings" }),
      cash({ id: "4", amountEUR: 500, type: "real_estate" }),
      cash({ id: "5", amountEUR: 200, type: "pension" }),
      cash({ id: "6", amountEUR: 1687.5, type: "fixed_return" }),
    ];
    expect(investmentCashEntries(rows).map((c) => c.id)).toEqual(["1", "2", "6"]);
  });
});
