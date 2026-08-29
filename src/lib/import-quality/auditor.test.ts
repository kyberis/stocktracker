import { describe, expect, it } from "vitest";
import { auditImportBatch, buildQualityReport } from "./auditor";
import { applyTransactionAutoFixes, planHoldingAutoFixes } from "./repairs";
import type { ParsedTransaction } from "@/lib/broker-parsers/types";
import type { Holding } from "@/lib/types";

describe("auditImportBatch", () => {
  it("flags missing HKD FX as error and auto-fixable", () => {
    const findings = auditImportBatch({
      transactions: [
        {
          date: "2026-07-01",
          type: "buy",
          ticker: "215",
          shares: 2000,
          pricePerShare: 1.18,
          currency: "HKD",
        },
      ],
      quotes: { "215": { price: 1.18, currency: "HKD" } },
      exchangeRates: {},
    });
    const fx = findings.find((f) => f.code === "missing_fx");
    expect(fx).toBeTruthy();
    expect(fx?.severity).toBe("error");
    expect(fx?.autoFixable).toBe(true);
    expect(fx?.fixAction).toBe("fetch_fx");
  });

  it("detects GBX 100× unit errors and auto-fixes preview txs", () => {
    const findings = auditImportBatch({
      transactions: [
        {
          date: "2026-07-01",
          type: "buy",
          ticker: "SRB.L",
          shares: 1275,
          pricePerShare: 2.5,
          currency: "GBP",
        },
      ],
      quotes: { "SRB.L": { price: 250, currency: "GBX" } },
      exchangeRates: { EURGBP: 0.86 },
    });
    const unit = findings.find((f) => f.code === "unit_magnitude" && f.fixAction === "normalize_gbx");
    expect(unit).toBeTruthy();
    expect(unit?.autoFixable).toBe(true);

    const txs: ParsedTransaction[] = [
      {
        date: "2026-07-01",
        type: "buy",
        ticker: "SRB.L",
        name: "Serabi",
        isin: "",
        shares: 1275,
        pricePerShare: 2.5,
        totalAmount: 3187.5,
        fees: 0,
        taxes: 0,
        currency: "GBP",
        orderId: "",
        sourceRef: "t1",
      },
    ];
    const { transactions, findings: after } = applyTransactionAutoFixes(txs, findings, {
      "SRB.L": { price: 250, currency: "GBX" },
    });
    expect(transactions[0].currency).toBe("GBX");
    expect(transactions[0].pricePerShare).toBeCloseTo(250);
    expect(after.some((f) => f.fixed && f.fixAction === "normalize_gbx")).toBe(true);
  });

  it("marks recent-trade deviation as propose-only (not auto-fixable)", () => {
    const today = new Date("2026-08-02T12:00:00Z");
    const findings = auditImportBatch({
      transactions: [
        {
          date: "2026-08-01",
          type: "buy",
          ticker: "AAPL",
          shares: 1,
          pricePerShare: 100,
          currency: "USD",
        },
      ],
      quotes: { AAPL: { price: 200, currency: "USD" } },
      exchangeRates: { EURUSD: 1.1 },
      now: today,
    });
    const recent = findings.find((f) => f.code === "recent_trade_price");
    expect(recent).toBeTruthy();
    expect(recent?.autoFixable).toBe(false);
  });

  it("auto-fixes currency mismatch only when purchase price matches quote magnitude", () => {
    const findings = auditImportBatch({
      transactions: [],
      holdings: [
        {
          id: "h1",
          ticker: "ADBE",
          shares: 7,
          purchasePrice: 250,
          displayCurrency: "EUR",
          valueInEUR: 1500,
        },
      ],
      quotes: { ADBE: { price: 249, currency: "USD" } },
      exchangeRates: { EURUSD: 1.15 },
    });
    const mismatch = findings.find((f) => f.code === "currency_mismatch");
    expect(mismatch).toBeTruthy();
    expect(mismatch?.autoFixable).toBe(true);

    const holding = {
      id: "h1",
      name: "Adobe",
      ticker: "ADBE",
      isin: "",
      shares: 7,
      purchasePrice: 250,
      displayCurrency: "EUR",
      exchange: "NASDAQ",
      valueInEUR: 1500,
    } as Holding;

    const { plans, findings: after } = planHoldingAutoFixes(
      [holding],
      findings,
      { ADBE: { price: 249, currency: "USD" } },
      { EURUSD: 1.15 },
    );
    expect(plans[0]?.updates.displayCurrency).toBe("USD");
    expect(after.some((f) => f.fixed)).toBe(true);
  });

  it("auto-fixes crypto pair currency when ticker encodes quote ccy (BTC-EUR)", () => {
    const findings = auditImportBatch({
      transactions: [],
      holdings: [
        {
          id: "h2",
          ticker: "BTC-EUR",
          shares: 0.1,
          purchasePrice: 80000,
          displayCurrency: "USD",
          valueInEUR: 5000,
        },
      ],
      quotes: { "BTC-EUR": { price: 55000, currency: "EUR" } },
      exchangeRates: { EURUSD: 1.1 },
    });
    const mismatch = findings.find((f) => f.code === "currency_mismatch");
    expect(mismatch?.autoFixable).toBe(true);
    expect(mismatch?.fixAction).toBe("align_display_currency");
  });

  it("does not flag EUR LSE cost vs GBX quote as unit_magnitude", () => {
    const findings = auditImportBatch({
      transactions: [],
      holdings: [
        {
          id: "h-ulvr",
          ticker: "ULVR.L",
          shares: 4,
          purchasePrice: 54.59,
          displayCurrency: "EUR",
          exchange: "LSE",
          valueInEUR: 223,
        },
      ],
      quotes: { "ULVR.L": { price: 4776, currency: "GBX" } },
      exchangeRates: { EURGBP: 0.86 },
    });
    const unit = findings.find((f) => f.code === "unit_magnitude" && f.severity === "error");
    expect(unit).toBeUndefined();
  });

  it("does not rewrite cost basis without confirm (recent trade stays unfixed)", () => {
    const findings = auditImportBatch({
      transactions: [
        {
          date: "2026-08-01",
          type: "buy",
          ticker: "MSFT",
          shares: 1,
          pricePerShare: 400,
          currency: "USD",
        },
      ],
      quotes: { MSFT: { price: 500, currency: "USD" } },
      exchangeRates: { EURUSD: 1.1 },
      now: new Date("2026-08-02T12:00:00Z"),
    });
    const recent = findings.find((f) => f.code === "recent_trade_price");
    expect(recent?.fixed).toBeFalsy();
    const report = buildQualityReport(findings);
    expect(report.needsReviewCount).toBeGreaterThan(0);
  });
});
