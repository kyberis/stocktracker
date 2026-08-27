import { describe, expect, it } from "vitest";
import type { AnalystTargetSnapshot, ExchangeRates } from "@/lib/types";
import {
  convertAnalystTargetPrice,
  formatAnalystTargetPrice,
} from "./format-analyst-target";

const rates: ExchangeRates = {
  EURUSD: 1.1,
  EURGBP: 0.85,
};

const usdTarget: AnalystTargetSnapshot = {
  price: 220,
  currency: "USD",
  updatedAt: "2026-01-10 00:00:00",
};

describe("convertAnalystTargetPrice", () => {
  it("returns the same amount when currencies match", () => {
    expect(convertAnalystTargetPrice(usdTarget, "USD", rates)).toBe(220);
  });

  it("converts from native target currency into the user display currency", () => {
    // 220 USD → EUR via EURUSD 1.1 → 200 EUR
    expect(convertAnalystTargetPrice(usdTarget, "EUR", rates)).toBeCloseTo(200, 5);
  });

  it("returns null when the FX rate is missing", () => {
    expect(convertAnalystTargetPrice(usdTarget, "JPY", rates)).toBeNull();
  });
});

describe("formatAnalystTargetPrice", () => {
  it("formats the converted amount in the user currency", () => {
    expect(formatAnalystTargetPrice(usdTarget, "EUR", rates)).toBe("€200.00");
  });

  it("returns -- when conversion is not possible", () => {
    expect(formatAnalystTargetPrice(usdTarget, "JPY", rates)).toBe("--");
  });
});
