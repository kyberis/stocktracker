import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIRST_STOCK_PRICE,
  formatFirstStockExample,
  isWarrenFirstStockTreatment,
  readActivateFirstStockFlag,
  shouldOpenWarrenFirstStock,
  skipOnboardingHomePath,
  stripActivateFirstStockSearch,
} from "./warren-first-stock";

describe("warren-first-stock", () => {
  it("identifies treatment variant", () => {
    expect(isWarrenFirstStockTreatment("warren_first_stock")).toBe(true);
    expect(isWarrenFirstStockTreatment("control")).toBe(false);
  });

  it("opens Warren only for empty treatment with flag", () => {
    expect(
      shouldOpenWarrenFirstStock({
        demoMode: false,
        isEmpty: true,
        activateFlag: true,
        variant: "warren_first_stock",
        loading: false,
      }),
    ).toBe(true);
    expect(
      shouldOpenWarrenFirstStock({
        demoMode: false,
        isEmpty: true,
        activateFlag: true,
        variant: "control",
        loading: false,
      }),
    ).toBe(false);
    expect(
      shouldOpenWarrenFirstStock({
        demoMode: false,
        isEmpty: true,
        activateFlag: true,
        variant: "warren_first_stock",
        loading: true,
      }),
    ).toBe(false);
  });

  it("formats skip path and example price", () => {
    expect(skipOnboardingHomePath()).toBe("/?activateFirstStock=1");
    expect(formatFirstStockExample("Add 7 shares of Apple at {price} USD", 184.2)).toBe(
      "Add 7 shares of Apple at 184 USD",
    );
    expect(formatFirstStockExample("Add 7 shares of Apple at {price} USD", 0)).toBe(
      `Add 7 shares of Apple at ${DEFAULT_FIRST_STOCK_PRICE} USD`,
    );
  });

  it("reads and strips the activate query flag", () => {
    expect(readActivateFirstStockFlag("?activateFirstStock=1")).toBe(true);
    expect(readActivateFirstStockFlag("")).toBe(false);
    expect(stripActivateFirstStockSearch("?activateFirstStock=1&x=1")).toBe("?x=1");
    expect(stripActivateFirstStockSearch("?activateFirstStock=1")).toBe("");
  });
});
